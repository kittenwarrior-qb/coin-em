import { afterEach, describe, expect, it, vi } from 'vitest'
import { startSeatPresence, SEAT_PRESENCE_INTERVAL_MS } from '../../src/socket/SeatPresence'
import { authenticateSeat, issueSeatSession, SEAT_SESSION_GRACE_MS } from '../../src/socket/SeatSession'
import { roomRepository } from '../../src/modules/room'
import { createMockRoom } from '../helpers/mockData'
import { loadRooms } from '../../src/persistence'
import { changeRoundLimit } from '../../src/modules/game/services/RoundLimit'
import { randomUUID } from 'node:crypto'

describe('persisted session presence leases', () => {
  let stop: (() => Promise<void>) | undefined
  afterEach(async () => { await stop?.(); stop = undefined; roomRepository.clear(); vi.useRealTimers() })
  it('renews only a locally connected active generation and persists the lease', async () => {
    vi.useFakeTimers()
    const issued = issueSeatSession(), initial = createMockRoom(5, { id: 'presence', status: 'playing' })
    const player = { ...initial.players[0], session: issued.session, lastSeenAt: Date.now() }
    const other = { ...initial.players[1], session: issueSeatSession().session, lastSeenAt: Date.now() }
    const room = { ...initial, players: [player, other, ...initial.players.slice(2)] }
    roomRepository.getRawMap().set(room.id, room)
    const emit = vi.fn()
    const sockets = new Map([[player.socketId, { id: player.socketId, emit, connected: true, data: { seatSession: {
      roomId: room.id, userId: player.userId, generation: 1,
    } } }]])
    stop = startSeatPresence({ sockets: { sockets }, in: () => ({ fetchSockets: async () => [...sockets.values()] }) } as any)
    await vi.advanceTimersByTimeAsync(SEAT_PRESENCE_INTERVAL_MS)
    const stored = loadRooms().get(room.id)!
    expect(stored.players[0].lastSeenAt).toBe(Date.now())
    expect(stored.players[1].lastSeenAt).toBe(other.lastSeenAt)
    expect(emit).toHaveBeenCalledWith('room_state', expect.objectContaining({ revision: stored.revision }))
    const projected = emit.mock.calls[0][1]
    expect(projected.players[0]).not.toHaveProperty('session')
    expect(projected.players[0]).not.toHaveProperty('lastSeenAt')
    const before = stored.players[0].lastSeenAt
    sockets.get(player.socketId)!.data.seatSession.generation = 0
    await vi.advanceTimersByTimeAsync(SEAT_PRESENCE_INTERVAL_MS)
    expect(roomRepository.findById(room.id)!.players[0].lastSeenAt).toBe(before)
    expect(emit).toHaveBeenCalledTimes(1)
    await stop()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('lets an idle waiting host save one round using the heartbeat projection, not an obsolete revision', async () => {
    vi.useFakeTimers()
    const initial = createMockRoom(5, { id: 'waiting-presence', status: 'waiting' })
    const host = { ...initial.players[0], session: issueSeatSession().session, lastSeenAt: Date.now() }
    const room = { ...initial, host: host.userId, players: [host, ...initial.players.slice(1)], revision: 0 }
    roomRepository.getRawMap().set(room.id, room)
    const emit = vi.fn(), socket = { id: host.socketId, connected: true, emit,
      data: { seatSession: { roomId: room.id, userId: host.userId, generation: 1 } } }
    stop = startSeatPresence({ sockets: { sockets: new Map([[host.socketId, socket]]) },
      in: () => ({ fetchSockets: async () => [socket] }) } as any)
    await vi.advanceTimersByTimeAsync(SEAT_PRESENCE_INTERVAL_MS)
    const updated = roomRepository.findById(room.id)!, projected = emit.mock.calls[0][1]
    expect(projected.revision).toBe(1)
    expect(updated.lastActivity).toBe(room.lastActivity)
    expect(() => changeRoundLimit(updated, host.userId, { limit: 1, expectedRevision: 0, requestId: randomUUID() })).toThrow('ROUND_REVISION_CONFLICT')
    const saved = changeRoundLimit(updated, host.userId, { limit: 1, expectedRevision: projected.revision, requestId: randomUUID() })
    await roomRepository.saveAndWait(saved)
    expect(loadRooms().get(room.id)?.roundLimit).toBe(1)
  })
  it('rejects expired crash-only presence while keeping a truly active long-running session', () => {
    const issued = issueSeatSession()
    const player = { ...createMockRoom(5).players[0], session: issued.session, lastSeenAt: 1000 }
    expect(authenticateSeat(player, issued.token, 1000 + SEAT_SESSION_GRACE_MS - 1, false)).toBe(true)
    expect(authenticateSeat(player, issued.token, 1000 + SEAT_SESSION_GRACE_MS, false)).toBe(false)
    expect(authenticateSeat(player, issued.token, 1000 + SEAT_SESSION_GRACE_MS, true)).toBe(true)
    expect(authenticateSeat({ ...player, isDisconnected: true, disconnectedAt: null }, issued.token)).toBe(false)
    expect(authenticateSeat({ ...player, session: { ...player.session, generation: 0 } }, issued.token)).toBe(false)
  })
})
