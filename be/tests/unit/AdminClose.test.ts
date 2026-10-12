import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { RoomRepository } from '../../src/modules/room/repository/RoomRepository'
import { closeAdminRoom, validAdminClose, type AdminCloseCommand } from '../../src/admin/closeRoom'
import { ADMIN_EMAIL } from '../../src/admin/AdminAuth'
import { redisClient } from '../../src/redis'
import { ROOM_PREFIX, ROOM_TOMBSTONE_PREFIX } from '../../src/storageKeys'
import { BACKUP_RETENTION_MS } from '../../src/retention'
import { TOMBSTONE_DIR, DELETED_BACKUP_DIR } from '../../src/persistence'
import { createMockRoom } from '../helpers/mockData'
import { inRoomQueue } from '../../src/socket/roomQueue'

let sequence = 0
let values: Map<string, string>
let repository: RoomRepository
let command: AdminCloseCommand
const notify = vi.fn()
beforeEach(() => {
  values = new Map()
  repository = new RoomRepository()
  command = { roomId: `admin-close-fixture-${++sequence}`, expectedRevision: 7,
    requestId: 'c3b502d9-3dd9-43ca-86d5-f44f4cbb21d1', reason: 'operator-request' }
  const room = createMockRoom(5, { id: command.roomId, revision: 7 })
  values.set(ROOM_PREFIX + room.id, JSON.stringify(room))
  repository.load(new Map([[room.id, room]]))
  notify.mockClear()
  vi.mocked(redisClient.get).mockReset().mockImplementation(async key => values.get(String(key)) ?? null)
  vi.mocked(redisClient.eval).mockReset().mockImplementation(async (_script, _count, ...args) => {
    const [roomKey, , markerKey, id, revision, , marker] = args
    const room = JSON.parse(values.get(String(roomKey))!)
    if (room.id !== id || room.revision !== revision) return [0, '']
    values.set(String(markerKey), String(marker)); values.delete(String(roomKey))
    return [1, JSON.stringify(room)]
  })
})

describe('admin queued close and content-free atomic receipt (mock primary)', () => {
  it('commits the audit in the same Lua arguments as deletion, without storing room content', async () => {
    expect(await closeAdminRoom(repository, command, () => true, notify)).toEqual({ success: true, replayed: false })
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith(command.roomId)
    const marker = JSON.parse(values.get(ROOM_TOMBSTONE_PREFIX + command.roomId)!)
    expect(marker.adminAudit).toEqual({ ...command, actor: ADMIN_EMAIL, version: 'admin-close/v1', committedAt: marker.deletedAt })
    expect(marker.expiresAt - marker.deletedAt).toBe(BACKUP_RETENTION_MS)
    expect(Object.keys(marker).sort()).toEqual(['adminAudit', 'deletedAt', 'expiresAt', 'id', 'version'])
    expect(JSON.stringify(marker)).not.toMatch(/players|responses|coins|session|Fixture/)
    const args = vi.mocked(redisClient.eval).mock.calls[0]
    expect(args[0]).toContain('-- room-delete/v1')
    expect(args.at(-2)).toBe(JSON.stringify(marker))
    expect(repository.findById(command.roomId)).toBeNull()
    const local = JSON.parse(fs.readFileSync(path.join(TOMBSTONE_DIR, `${command.roomId}.json`), 'utf8'))
    expect(Object.keys(local).sort()).toEqual(['deletedAt', 'expiresAt', 'id', 'version'])
    expect(fs.existsSync(DELETED_BACKUP_DIR)).toBe(false)
  })
  it('replays the same durable receipt without deleting twice and can repair terminal notification', async () => {
    await closeAdminRoom(repository, command, () => true, notify)
    expect(await closeAdminRoom(new RoomRepository(), command, () => true, notify)).toEqual({ success: true, replayed: true })
    expect(redisClient.eval).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledTimes(2)
  })
  it.each(['reason', 'expectedRevision', 'requestId'] as const)('rejects conflicting retry %s', async field => {
    await closeAdminRoom(repository, command, () => true, notify)
    const altered = { ...command, [field]: field === 'reason' ? 'safety' : field === 'expectedRevision' ? 8 : 'd3b502d9-3dd9-43ca-86d5-f44f4cbb21d1' }
    await expect(closeAdminRoom(repository, altered, () => true, notify)).rejects.toThrow('ROOM_CLOSE_CONFLICT')
    expect(redisClient.eval).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })
  it('rejects a stale confirmation without deleting or producing an audit', async () => {
    await expect(closeAdminRoom(repository, { ...command, expectedRevision: 6 }, () => true, notify)).rejects.toThrow('ROOM_CLOSE_CONFLICT')
    expect(redisClient.eval).not.toHaveBeenCalled()
    expect(values.has(ROOM_PREFIX + command.roomId)).toBe(true)
    expect(notify).not.toHaveBeenCalled()
  })
  it('does not admit a corrupted stored receipt as successful replay', async () => {
    await closeAdminRoom(repository, command, () => true, notify)
    const key = ROOM_TOMBSTONE_PREFIX + command.roomId
    const marker = JSON.parse(values.get(key)!)
    marker.adminAudit.committedAt++
    values.set(key, JSON.stringify(marker))
    await expect(closeAdminRoom(repository, command, () => true, notify)).rejects.toThrow('ROOM_CLOSE_CONFLICT')
    expect(redisClient.eval).toHaveBeenCalledTimes(1)
  })
  it('denies a session revoked while waiting behind another room operation', async () => {
    let release!: () => void
    let entered!: () => void
    const ready = new Promise<void>(resolve => { entered = resolve })
    const prior = inRoomQueue(command.roomId, () => new Promise<void>(resolve => { release = resolve; entered() }))
    await ready
    let authorized = true
    const close = closeAdminRoom(repository, command, () => authorized, notify)
    const outcome = close.then(() => null, error => error as Error)
    authorized = false; release(); await prior
    expect(await outcome).toMatchObject({ message: 'ADMIN_AUTH_REQUIRED' })
    expect(redisClient.eval).not.toHaveBeenCalled()
  })
  it('fails closed on an uncertain primary write and admits an explicit same-ID retry after commit', async () => {
    const implementation = vi.mocked(redisClient.eval).getMockImplementation()!
    vi.mocked(redisClient.eval).mockImplementationOnce(async (...args) => {
      await implementation(...args); throw new Error('synthetic ACK loss')
    })
    await expect(closeAdminRoom(repository, command, () => true, notify)).rejects.toThrow('synthetic ACK loss')
    expect(notify).not.toHaveBeenCalled()
    expect(await closeAdminRoom(repository, command, () => true, notify)).toEqual({ success: true, replayed: true })
    expect(redisClient.eval).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledOnce()
  })
  it('does not turn a post-commit notification failure into another deletion', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    notify.mockImplementationOnce(() => { throw new Error('synthetic notification fault') })
    expect(await closeAdminRoom(repository, command, () => true, notify)).toEqual({ success: true, replayed: false })
    expect(log).toHaveBeenCalledWith(JSON.stringify({ version: 'operation-diagnostic/v1', event: 'room_delivery', outcome: 'degraded' }))
    expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic notification fault')
    expect(JSON.stringify(log.mock.calls)).not.toContain(command.roomId)
    log.mockRestore()
  })
  it('rejects extra/private fields, arbitrary reason, bad ID and unsafe revision', () => {
    for (const invalid of [{ ...command, password: 'do-not-accept' }, { ...command, reason: 'private story' },
      { ...command, roomId: '../outside' }, { ...command, requestId: 'not-a-uuid' },
      { ...command, expectedRevision: Number.MAX_SAFE_INTEGER + 1 }]) expect(validAdminClose(invalid)).toBe(false)
  })
})
