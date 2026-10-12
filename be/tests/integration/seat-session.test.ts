import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { io as connect, Socket } from 'socket.io-client'
import { createIsolatedServer } from '../helpers/isolatedServer'
import { roomRepository, roomService } from '../../src/modules/room'
import { gameService } from '../../src/modules/game/services/GameService'
import { redisClient } from '../../src/redis'
import { loadRooms } from '../../src/persistence'
import { SEAT_SESSION_GRACE_MS } from '../../src/socket/SeatSession'

describe('server-issued guest seat sessions', () => {
  let server: Awaited<ReturnType<typeof createIsolatedServer>>
  const clients: Socket[] = []
  beforeEach(() => {
    vi.mocked(redisClient.eval).mockImplementation((script: any, count: any, ...values: any[]) =>
      Promise.resolve(script.includes('-- room-delete/v1') ? [1, ''] : [1, values[count + 3]]))
  })
  afterEach(async () => {
    clients.forEach(c => c.disconnect())
    await server?.close()
    roomRepository.clear()
  })
  async function client() {
    const socket = connect(server.url, { transports: ['websocket'], reconnection: false })
    clients.push(socket)
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
    return socket
  }

  it('commits selected groups with initial admission and does not overwrite an existing room on code collision', async () => {
    server = await createIsolatedServer()
    const host = await client(), collision = await client()
    const settings = { situationGroups: ['medium'], emotionGroups: ['strong', 'advanced'] }
    const ack = await action(host, 'join_room', { roomId: 'atomic-settings', userId: 'settings-host', name: 'Host', createIfMissing: true, settings })
    expect(ack.success).toBe(true)
    const room = roomRepository.findById('atomic-settings')!
    expect(room.settings).toEqual(settings)
    expect(room.revision).toBe(1)
    expect(loadRooms().get(room.id)!.settings).toEqual(settings)
    const before = JSON.stringify(room)
    const rejected = await action(collision, 'join_room', { roomId: room.id, userId: 'other-host', name: 'Other', createIfMissing: true,
      settings: { situationGroups: ['sensitive'], emotionGroups: ['basic'] } })
    expect(rejected.error).toBe('room_already_exists')
    expect(JSON.stringify(roomRepository.findById(room.id))).toBe(before)
  })

  it.each([
    { situationGroups: [], emotionGroups: ['basic'] },
    { situationGroups: ['unknown'], emotionGroups: ['basic'] },
    { situationGroups: ['light', 'light'], emotionGroups: ['basic'] },
    { situationGroups: ['light'], emotionGroups: ['unknown'] },
    null,
  ])('rejects invalid initial groups before creating a seat or room: %j', async settings => {
    server = await createIsolatedServer()
    const host = await client()
    const writes = vi.mocked(redisClient.eval).mock.calls.length
    const ack = await action(host, 'join_room', { roomId: 'invalid-settings', userId: 'settings-host', name: 'Host', createIfMissing: true, settings })
    expect(ack.error).toBe('invalid_settings')
    expect(roomRepository.findById('invalid-settings')).toBeNull()
    expect(vi.mocked(redisClient.eval).mock.calls.length).toBe(writes)
    expect(server.io.sockets.sockets.get(host.id!)!.data.seatSession).toBeUndefined()
  })

  it('publishes no partially created room when initial settings commit fails', async () => {
    server = await createIsolatedServer()
    const host = await client()
    const snapshot = vi.fn()
    host.on('room_state', snapshot)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture primary failure'))
    const ack = await action(host, 'join_room', { roomId: 'failed-settings', userId: 'settings-host', name: 'Host', createIfMissing: true,
      settings: { situationGroups: ['light'], emotionGroups: ['basic'] } })
    expect(ack.success).toBe(false)
    expect(ack.session).toBeUndefined()
    expect(snapshot).not.toHaveBeenCalled()
    expect(roomRepository.findById('failed-settings')).toBeNull()
    expect(loadRooms().get('failed-settings')).toBeUndefined()
  })

  it.each(['update_room_settings', 'update_profile'])('publishes %s only after its primary commit, preserving the old snapshot on failure', async event => {
    server = await createIsolatedServer()
    const host = await client()
    const admission = await action(host, 'join_room', { roomId: 'lobby-commit', userId: 'lobby-host', name: 'Host', createIfMissing: true })
    expect(admission.success).toBe(true)
    // Hydration event is the wire barrier for the initial admission publication.
    const initialState = new Promise(resolve => host.once('room_state', resolve))
    host.emit('get_room_state', { roomId: 'lobby-commit' })
    await initialState
    const before = JSON.stringify(roomRepository.findById('lobby-commit'))
    const broadcast = vi.fn()
    host.on('room_state', broadcast)
    host.on('room_settings_updated', broadcast)
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture lobby primary failure'))
    const rejected = new Promise<any>(resolve => host.once('error', resolve))
    const payload = event === 'update_profile' ? { name: 'Updated', avatarIndex: 2, bgIndex: 3 }
      : { settings: { situationGroups: ['medium'], emotionGroups: ['strong'] } }
    host.emit(event, { roomId: 'lobby-commit', userId: 'lobby-host', ...payload })
    expect((await rejected).error).toBe('INTERNAL_ERROR')
    expect(broadcast).not.toHaveBeenCalled()
    expect(JSON.stringify(roomRepository.findById('lobby-commit'))).toBe(before)
    const committed = new Promise<any>(resolve => host.once('room_state', resolve))
    host.emit(event, { roomId: 'lobby-commit', userId: 'lobby-host', ...payload })
    const view = await committed
    expect(view.revision).toBe(JSON.parse(before).revision + 1)
    if (event === 'update_profile') expect(view.players[0].name).toBe('Updated')
    else expect(view.settings).toEqual(payload.settings)
  })
  function action(socket: Socket, event: string, payload: unknown): Promise<any> {
    return new Promise((resolve, reject) => socket.timeout(2000).emit(event, payload,
      (error: Error | null, ack: unknown) => error ? reject(error) : resolve(ack)))
  }
  const join = { roomId: 'seat-auth', userId: 'guest-1', name: 'Guest', deviceId: 'public-device', createIfMissing: true }

  it('persists only a hash and rejects ID/device-only, wrong token and cross-room claims', async () => {
    server = await createIsolatedServer()
    const owner = await client(), attacker = await client()
    const ack = await action(owner, 'join_room', join)
    expect(ack.success).toBe(true)
    expect(ack.session.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const room = roomRepository.findById(join.roomId)!
    expect(room.players[0].session!.tokenHash).not.toBe(ack.session.token)
    expect(JSON.stringify(loadRooms().get(join.roomId))).not.toContain(ack.session.token)
    for (const payload of [join, { ...join, sessionToken: 'x'.repeat(43) }, { roomId: join.roomId, deviceId: join.deviceId }]) {
      const denied = await action(attacker, 'reconnect_room', payload)
      expect(denied.success).toBe(false)
    }
    expect((await action(attacker, 'join_room', join)).error).toBe('INVALID_SESSION')
    expect((await action(attacker, 'reconnect_room', { ...join, roomId: 'absent', sessionToken: ack.session.token })).success).toBe(false)
    expect(roomRepository.findById(join.roomId)!.players[0].socketId).toBe(owner.id)
    for (const view of [roomService.getPublicState(room), gameService.getPublicState(room)]) {
      expect(JSON.stringify(view)).not.toContain('tokenHash')
      expect(JSON.stringify(view)).not.toContain('deviceId')
    }
  })

  it('replaces the old socket, increments generation, keeps receipts and resumes a persisted snapshot', async () => {
    server = await createIsolatedServer()
    const owner = await client(), next = await client()
    const ack = await action(owner, 'join_room', join)
    const replacement = new Promise(resolve => owner.once('session_replaced', resolve))
    const resumed = await action(next, 'reconnect_room', { ...join, sessionToken: ack.session.token })
    await replacement
    expect(resumed.session.generation).toBe(2)
    const stored = loadRooms().get(join.roomId)!
    expect(stored.players[0].session!.generation).toBe(2)
    expect(stored.players[0].socketId).toBe(next.id)
    // New repository cache after a cold process snapshot reload.
    roomRepository.clear()
    roomRepository.load(new Map([[stored.id, stored]]))
    const cold = await client()
    expect((await action(cold, 'reconnect_room', { ...join, sessionToken: ack.session.token })).session.generation).toBe(3)
    expect(roomRepository.findById(join.roomId)!.players).toHaveLength(1)
  })

  it('expires a disconnected seat at the two-hour boundary without changing saved gameplay', async () => {
    server = await createIsolatedServer()
    const owner = await client(), next = await client()
    const ack = await action(owner, 'join_room', join)
    const room = roomRepository.findById(join.roomId)!
    const expired = { ...room, status: 'playing' as const, players: room.players.map(p => ({ ...p,
      isDisconnected: true, disconnectedAt: Date.now() - SEAT_SESSION_GRACE_MS })) }
    await roomRepository.saveAndWait(expired)
    const before = JSON.stringify(roomRepository.findById(join.roomId))
    expect((await action(next, 'reconnect_room', { ...join, sessionToken: ack.session.token })).error).toBe('INVALID_SESSION')
    expect(JSON.stringify(roomRepository.findById(join.roomId))).toBe(before)
  })

  it('does not issue a token or bind a seat if its primary commit fails', async () => {
    server = await createIsolatedServer()
    const owner = await client()
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture commit failure'))
    const ack = await action(owner, 'join_room', join)
    expect(ack.success).toBe(false)
    expect(ack.session).toBeUndefined()
    expect(roomRepository.findById(join.roomId)).toBeNull()
  })

  it('rejects changes to another guest profile even from a valid room member', async () => {
    server = await createIsolatedServer()
    const owner = await client(), other = await client()
    await action(owner, 'join_room', join)
    await action(other, 'join_room', { ...join, userId: 'guest-2', name: 'Other', createIfMissing: false })
    const error = new Promise<any>(resolve => other.once('error', resolve))
    other.emit('update_profile', { roomId: join.roomId, userId: join.userId, name: 'Forged' })
    expect((await error).code).toBe('NOT_PROFILE_OWNER')
    expect(roomRepository.findById(join.roomId)!.players[0].name).toBe('Guest')
  })

  it('rejects stale generations and forged host settings without mutating the room', async () => {
    server = await createIsolatedServer()
    const owner = await client(), other = await client()
    await action(owner, 'join_room', join)
    await action(other, 'join_room', { ...join, userId: 'guest-2', name: 'Other', createIfMissing: false })
    const error = new Promise<any>(resolve => other.once('error', resolve))
    other.emit('update_room_settings', { roomId: join.roomId, userId: join.userId,
      settings: { situationGroups: ['light'], emotionGroups: ['basic'] } })
    expect((await error).code).toBe('not_host')
    const room = roomRepository.findById(join.roomId)!
    expect(room.settings.situationGroups).toHaveLength(3)
    await roomRepository.saveAndWait({ ...room, players: room.players.map(p => p.userId === 'guest-2'
      ? { ...p, session: { ...p.session!, generation: p.session!.generation + 1 } } : p) })
    const before = JSON.stringify(roomRepository.findById(join.roomId))
    expect((await action(other, 'get_room_state', { roomId: join.roomId })).error).toBe('STALE_SESSION')
    expect(JSON.stringify(roomRepository.findById(join.roomId))).toBe(before)
  })
})
