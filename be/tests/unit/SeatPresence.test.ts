import { afterEach, describe, expect, it, vi } from 'vitest'
import { startSeatPresence, SEAT_PRESENCE_INTERVAL_MS } from '../../src/socket/SeatPresence'
import { authenticateSeat, issueSeatSession, SEAT_SESSION_GRACE_MS } from '../../src/socket/SeatSession'
import { roomRepository } from '../../src/modules/room'
import { createMockRoom } from '../helpers/mockData'
import { loadRooms } from '../../src/persistence'

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
    const sockets = new Map([[player.socketId, { connected: true, data: { seatSession: {
      roomId: room.id, userId: player.userId, generation: 1,
    } } }]])
    stop = startSeatPresence({ sockets: { sockets } } as any)
    await vi.advanceTimersByTimeAsync(SEAT_PRESENCE_INTERVAL_MS)
    const stored = loadRooms().get(room.id)!
    expect(stored.players[0].lastSeenAt).toBe(Date.now())
    expect(stored.players[1].lastSeenAt).toBe(other.lastSeenAt)
    const before = stored.players[0].lastSeenAt
    sockets.get(player.socketId)!.data.seatSession.generation = 0
    await vi.advanceTimersByTimeAsync(SEAT_PRESENCE_INTERVAL_MS)
    expect(roomRepository.findById(room.id)!.players[0].lastSeenAt).toBe(before)
    await stop()
    expect(vi.getTimerCount()).toBe(0)
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
