import { afterEach, describe, expect, it, vi } from 'vitest'
import { io as connect, Socket } from 'socket.io-client'
import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { DATA_DIR, loadRooms, saveRoom } from '../../src/persistence'
import { roomRepository } from '../../src/modules/room'
import { createMockRoom } from '../helpers/mockData'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { rateLimitAction } from '../../src/socket/middleware/rateLimiter'

describe('isolated backend recovery', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>> | undefined
  let client: Socket | undefined
  afterEach(async () => {
    client?.disconnect()
    await server?.close()
    roomRepository.clear()
    vi.unstubAllEnvs()
  })

  it('restores a checksummed fixture and reads it through the real socket handler', async () => {
    const fixture = createMockRoom(5, { id: 'fixture-room' })
    saveRoom(fixture)
    const source = path.join(DATA_DIR, 'fixture-room.json')
    const backup = path.join(DATA_DIR, 'fixture.backup')
    const hash = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    const expectedHash = hash(source)
    fs.copyFileSync(source, backup)
    expect(hash(backup)).toBe(expectedHash)
    fs.unlinkSync(source)
    fs.copyFileSync(backup, source)
    expect(hash(source)).toBe(expectedHash)
    roomRepository.load(loadRooms())
    server = await createIsolatedServer()
    client = connect(server.url, { transports: ['websocket'], reconnection: false })
    const state = await new Promise<any>((resolve, reject) => {
      client!.once('connect_error', reject)
      client!.once('room_state', resolve)
      client!.once('connect', () => {
        // Model an already-admitted member; outsiders must not read room snapshots.
        const restored = roomRepository.findById(fixture.id)!
        roomRepository.getRawMap().set(fixture.id, {
          ...restored, players: restored.players.map((p, i) => i === 0 ? { ...p, socketId: client!.id! } : p),
        })
        client!.emit('get_room_state', { roomId: fixture.id })
      })
    })
    expect(state.id).toBe(fixture.id)
    expect(state.players.map((player: any) => player.userId)).toEqual(fixture.players.map((player) => player.userId))
  })

  it('tests the actual rate limit with an injected clock and bypass disabled', () => {
    vi.stubEnv('DISABLE_RATE_LIMIT', 'false')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'))
    const socket = { id: 'rate-limit-fixture' } as any
    expect(rateLimitAction(socket, 'give_coin', 1000)).toBe(true)
    expect(rateLimitAction(socket, 'give_coin', 1000)).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(rateLimitAction(socket, 'give_coin', 1000)).toBe(true)
    vi.useRealTimers()
  })
})
