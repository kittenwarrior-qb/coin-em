import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { RoomRepository } from '../../src/modules/room/repository/RoomRepository'
import { redisClient } from '../../src/redis'
import { BACKUP_RETENTION_MS, ROOM_INACTIVITY_MS, isRoomInactive } from '../../src/retention'
import { DATA_DIR, DELETED_BACKUP_DIR, TOMBSTONE_DIR, archiveDeletedRoomStrict, autoSaveRoom,
  cancelPendingRoomSaves, cleanupRooms, hasRoomTombstone, loadRooms, pruneExpiredRoomBackups, saveRoomStrict } from '../../src/persistence'
import { createMockRoom } from '../helpers/mockData'
import { inRoomQueue } from '../../src/socket/roomQueue'
import { ROOM_TOMBSTONE_PREFIX } from '../../src/storageKeys'

beforeEach(() => {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  vi.mocked(redisClient.get).mockReset().mockResolvedValue(null)
  vi.mocked(redisClient.eval).mockReset().mockImplementation((script: any, count: any, ...values: any[]) =>
    Promise.resolve(script.includes('-- room-delete/v1') ? [1, ''] : [1, values[count + 3]]))
})
afterEach(() => {
  cancelPendingRoomSaves()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  const relative = path.relative(os.tmpdir(), DATA_DIR)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(path.dirname(DATA_DIR)).startsWith('emcoin-test-')) throw new Error('Unsafe retention fixture root')
  fs.rmSync(DATA_DIR, { recursive: true, force: true })
})

describe('approved one-hour rooms / markers only / legacy archive expiry', () => {
  it('uses the exact inactivity boundary, without considering presence heartbeat or room status', () => {
    const now = Date.now()
    expect(isRoomInactive({ lastActivity: now - ROOM_INACTIVITY_MS + 1 }, now)).toBe(false)
    expect(isRoomInactive({ lastActivity: now - ROOM_INACTIVITY_MS }, now)).toBe(true)
    expect(isRoomInactive({ lastActivity: NaN }, now)).toBe(false)
    expect(isRoomInactive({ lastActivity: now + 1 }, now)).toBe(false)
  })

  it.each(['waiting', 'playing', 'ended'] as const)('deletes inactive %s rooms even when a seat heartbeat is fresh, without archiving content', async status => {
    const now = Date.now()
    const room = createMockRoom(5, { status, lastActivity: now - ROOM_INACTIVITY_MS })
    room.players[0].lastSeenAt = now
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room]]))
    const deleted = await cleanupRooms(repository, now)
    expect(deleted).toEqual([room.id])
    expect(repository.findById(room.id)).toBeNull()
    expect(hasRoomTombstone(room.id)).toBe(true)
    expect(fs.existsSync(DELETED_BACKUP_DIR)).toBe(false)
    const marker = JSON.parse(fs.readFileSync(path.join(TOMBSTONE_DIR, `${room.id}.json`), 'utf8'))
    const args = vi.mocked(redisClient.eval).mock.calls.at(-1)!
    expect(marker).toEqual(JSON.parse(args.at(-2) as string))
    expect(Object.keys(marker).sort()).toEqual(['deletedAt', 'expiresAt', 'id', 'version'])
    expect(marker.expiresAt - marker.deletedAt).toBe(BACKUP_RETENTION_MS)
    expect(JSON.stringify(marker)).not.toContain(room.players[0].name)
    expect(loadRooms().has(room.id)).toBe(false)
    expect(args[0]).toContain('-- room-delete/v1')
    expect(args).toContain(ROOM_TOMBSTONE_PREFIX + room.id)
    expect(args.at(-1)).toBe(BACKUP_RETENTION_MS)
  })

  it('keeps recently active rooms, including empty/fake-only rooms, until their inactivity deadline', async () => {
    const room = createMockRoom(5, { players: [] })
    const fake = createMockRoom(5)
    fake.players.forEach(player => { player.isFake = true })
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room], [fake.id, fake]]))
    expect(await cleanupRooms(repository)).toEqual([])
    expect(repository.count()).toBe(2)
  })

  it('rechecks activity after a command already queued ahead of cleanup', async () => {
    const room = createMockRoom(5, { lastActivity: Date.now() - ROOM_INACTIVITY_MS })
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room]]))
    const command = inRoomQueue(room.id, async () => {
      await repository.saveAndWait({ ...room, lastActivity: Date.now() })
    })
    const cleanup = cleanupRooms(repository)
    await command
    expect(await cleanup).toEqual([])
    expect(repository.findById(room.id)).not.toBeNull()
  })

  it('does not evict or archive on a primary deletion failure or lost revision/activity race', async () => {
    const room = createMockRoom(5)
    saveRoomStrict(room)
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room]]))
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture primary unavailable'))
    await expect(repository.deleteAndWait(room.id)).rejects.toThrow('fixture primary unavailable')
    expect(repository.findById(room.id)).toEqual(room)
    expect(hasRoomTombstone(room.id)).toBe(false)
    vi.mocked(redisClient.eval).mockResolvedValueOnce([0, ''])
    expect(await repository.deleteAndWait(room.id)).toBe(false)
    expect(repository.findById(room.id)).toEqual(room)
    expect(fs.existsSync(path.join(DATA_DIR, `${room.id}.json`))).toBe(true)
  })

  it('retains committed primary deletion when local archival is degraded', async () => {
    const room = createMockRoom(5)
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room]]))
    vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => { throw new Error('fixture disk full') })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await repository.deleteAndWait(room.id)).toBe(true)
    expect(repository.findById(room.id)).toBeNull()
    expect(log).toHaveBeenCalledWith(JSON.stringify({ version: 'operation-diagnostic/v1', event: 'room_delete', outcome: 'degraded' }))
    expect(JSON.stringify(log.mock.calls)).not.toContain('fixture disk full')
    expect(JSON.stringify(log.mock.calls)).not.toContain(room.id)
  })

  it('cancels old debounce and rejects late writes using a persisted deletion marker', async () => {
    vi.useFakeTimers()
    const room = createMockRoom(5)
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room]]))
    autoSaveRoom(room)
    expect(await repository.deleteAndWait(room.id)).toBe(true)
    await vi.advanceTimersByTimeAsync(4000)
    expect(fs.existsSync(path.join(DATA_DIR, `${room.id}.json`))).toBe(false)
    expect(() => saveRoomStrict(room)).toThrow('ROOM_DELETED')
    await expect(new RoomRepository().saveAndWait(room)).rejects.toThrow('ROOM_DELETED')
  })

  it('evicts a stale local cache when another instance has a primary tombstone', async () => {
    const room = createMockRoom(5)
    const repository = new RoomRepository()
    repository.load(new Map([[room.id, room]]))
    vi.mocked(redisClient.get).mockResolvedValueOnce(JSON.stringify(room)).mockResolvedValueOnce('primary-deletion-marker')
    expect(await repository.findByIdFresh(room.id)).toBeNull()
    expect(repository.findById(room.id)).toBeNull()
  })

  it('prunes only generated managed files at seven days and never restores archives', () => {
    const now = Date.now()
    const room = createMockRoom(5)
    archiveDeletedRoomStrict(room, now)
    // Historical content archives retain their old bounded expiry. New deletions
    // never create these; this synthetic fixture represents an existing archive.
    fs.mkdirSync(DELETED_BACKUP_DIR)
    fs.writeFileSync(path.join(DELETED_BACKUP_DIR, 'legacy.json'), JSON.stringify({
      version: 'deleted-room-backup/v1', deletedAt: now, expiresAt: now + BACKUP_RETENTION_MS, room,
    }))
    const unrelated = path.join(DATA_DIR, 'keep.txt')
    fs.writeFileSync(unrelated, 'fixture-do-not-delete')
    expect(pruneExpiredRoomBackups(now + BACKUP_RETENTION_MS - 1)).toBe(0)
    expect(loadRooms().size).toBe(0)
    expect(pruneExpiredRoomBackups(now + BACKUP_RETENTION_MS)).toBe(2)
    expect(fs.readdirSync(DELETED_BACKUP_DIR)).toEqual([])
    expect(fs.readdirSync(TOMBSTONE_DIR)).toEqual([])
    expect(fs.readFileSync(unrelated, 'utf8')).toBe('fixture-do-not-delete')
  })

  it('keeps a fresh replacement room when an old marker has expired', () => {
    const now = Date.now()
    const room = createMockRoom(5)
    archiveDeletedRoomStrict(room, now - BACKUP_RETENTION_MS - 1)
    saveRoomStrict(room)
    pruneExpiredRoomBackups(now)
    expect(fs.existsSync(path.join(DATA_DIR, `${room.id}.json`))).toBe(true)
  })

  it('denies old JSON fallback even after deletion markers are removed', () => {
    const room = createMockRoom(5, { lastActivity: Date.now() - BACKUP_RETENTION_MS })
    fs.writeFileSync(path.join(DATA_DIR, `${room.id}.json`), JSON.stringify(room))
    expect(loadRooms().has(room.id)).toBe(false)
    expect(() => saveRoomStrict(room)).toThrow('ROOM_EXPIRED')
  })

  it('does not follow an existing redirected archive directory during new deletion, and refuses it during expiry', () => {
    const target = path.join(DATA_DIR, 'other')
    fs.mkdirSync(target)
    fs.writeFileSync(path.join(target, 'keep.txt'), 'fixture')
    fs.symlinkSync(target, DELETED_BACKUP_DIR, process.platform === 'win32' ? 'junction' : 'dir')
    const room = createMockRoom(5)
    expect(() => archiveDeletedRoomStrict(room)).not.toThrow()
    expect(hasRoomTombstone(room.id)).toBe(true)
    expect(() => pruneExpiredRoomBackups()).toThrow('UNSAFE_MANAGED_DIRECTORY')
    expect(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8')).toBe('fixture')
  })
})
