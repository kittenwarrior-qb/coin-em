import { describe, expect, it } from 'vitest'
import { publicMetrics } from '../../src/publicDiagnostics'
import { createMockRoom } from '../helpers/mockData'

describe('aggregate-only public diagnostics', () => {
  it('counts rooms and seats without disclosing room/session/role/story or per-room activity', () => {
    const rooms = [createMockRoom(5, { status: 'waiting' }), createMockRoom(7, { status: 'playing' }), createMockRoom(6, { status: 'ended' })]
    rooms[0].players[0].session = { tokenHash: 'c'.repeat(64), generation: 2 }
    rooms[0].responses[rooms[0].players[0].userId] = 'synthetic-private-response'
    const before = JSON.stringify(rooms)
    const metrics = publicMetrics(rooms, 10, true)
    expect(metrics).toEqual({ rooms: 3, players: 18, roomsByStatus: { waiting: 1, playing: 1, ended: 1 }, uptime: 10, redis: true })
    expect(JSON.stringify(rooms)).toBe(before)
    const serialized = JSON.stringify(metrics)
    for (const forbidden of [rooms[0].id, rooms[0].players[0].userId, 'c'.repeat(64), 'synthetic-private-response', 'lastActivity', 'roomDetails', 'memory', 'pid']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
  it('reports empty aggregates without inventing room labels', () => {
    expect(publicMetrics([], 0, false)).toEqual({ rooms: 0, players: 0, roomsByStatus: { waiting: 0, playing: 0, ended: 0 }, uptime: 0, redis: false })
  })
})
