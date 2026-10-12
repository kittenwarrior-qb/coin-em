import { describe, expect, it } from 'vitest'
import { PHASE_ORDER } from '../../src/modules/game/engine/PhaseRegistry'
import { StateMachine } from '../../src/modules/game/engine/StateMachine'
import { TurnManager } from '../../src/modules/game/engine/TurnManager'
import { RoleManager } from '../../src/modules/game/engine/RoleManager'
import { getRoleDeck } from '../../src/modules/game/engine/RoleDeck'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { RoomService } from '../../src/modules/room/services/RoomService'
import { roomRepository } from '../../src/modules/room'
import { createMockRoom } from '../helpers/mockData'
import { Role } from '../../src/modules/game/types'

describe('owner-approved web baseline', () => {
  it.each([5, 6, 7, 8, 9, 10])('uses identical phase resolution and deck quotas for %s seats', n => {
    const engine = new GameEngine(), manager = new RoleManager()
    let room = engine.startGame(createMockRoom(n)).room!
    const ids = room.players.map(p => p.userId)
    const expectedCounts = { narrator: 1, sender: 1, silencer: n >= 8 ? 2 : 1,
      connector: n >= 9 ? 2 : 1, opener: n >= 10 ? 2 : 1, guide: n >= 6 ? 1 : 0, healer: n >= 7 ? 1 : 0 }
    const roles = [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.CONNECTOR, Role.OPENER, Role.GUIDE, Role.HEALER]
    const machine = new StateMachine(), turns = new TurnManager()
    for (let round = 1; round <= n; round++) {
      expect(room.players.map(p => p.userId)).toEqual(ids)
      expect(room.currentNarrator).not.toBe(room.currentNTG)
      for (const [index, count] of Object.values(expectedCounts).entries()) {
        expect(room.players.filter(p => p.role === roles[index])).toHaveLength(count)
      }
      for (const phase of PHASE_ORDER) {
        expect(machine.transition(phase, 'NEXT', room)).toBe(turns.getNextPhase(phase, room))
        expect(machine.transition(phase, 'END', room)).toBe('ended')
      }
      expect(turns.getNextPhase('night', room)).toBe(n >= 7 ? 'healer-turn' : 'silencer-turn')
      room = manager.rotateRoles(room)
    }
    const copy = getRoleDeck(n)
    copy.pop()
    expect(getRoleDeck(n)).toHaveLength(n)
  })

  it.each([4, 11, NaN, 5.5])('rejects unsupported deck size %s', n => {
    expect(() => getRoleDeck(n)).toThrow('Invalid player count')
  })

  it('rejects duplicate stable IDs before assignment', () => {
    const players = createMockRoom(5).players
    players[1].userId = players[0].userId
    expect(() => new RoleManager().assignRoles(players)).toThrow('unique stable player IDs')
  })

  it('has one terminal domain effect for manual and final-round end', () => {
    const engine = new GameEngine()
    const initial = engine.startGame(createMockRoom(5)).room!
    const room = { ...initial, phase: 'reward' as const, currentRound: initial.totalRounds }
    const manual = engine.endGame(room, room.currentNarrator!)
    const final = engine.advanceTurn(room, room.currentNarrator!)
    for (const result of [manual, final]) {
      expect(result.success).toBe(true)
      expect(result.room!.status).toBe('ended')
      expect(result.room!.gameLog.filter(entry => entry.type === 'GAME_ENDED')).toHaveLength(1)
      expect(result.room!.coinCycle!.closed).toBe(true)
      expect(engine.endGame(result.room!, room.currentNarrator!).success).toBe(false)
    }
    expect(engine.endGame(room, room.currentNTG!).error).toBe('NOT_NARRATOR')
  })

  it('admits ten seats, lists waiting rooms until full and lets existing seats reconnect', () => {
    const service = new RoomService()
    const initial = createMockRoom(9, { id: 'approved-capacity' })
    roomRepository.getRawMap().set(initial.id, initial)
    const extra = { ...initial.players[0], userId: 'seat-10', socketId: 'socket-10' }
    expect(service.getAvailableRooms().some(r => r.id === initial.id)).toBe(true)
    expect(service.addPlayer(initial.id, extra)?.players).toHaveLength(10)
    expect(service.getAvailableRooms().some(r => r.id === initial.id)).toBe(false)
    expect(service.addPlayer(initial.id, { ...extra, userId: 'seat-11' })).toBeNull()
    expect(service.addPlayer(initial.id, { ...extra, socketId: 'reconnected-10' })?.players.find(p => p.userId === extra.userId)?.socketId).toBe('reconnected-10')
    roomRepository.clear()
  })

  it('applies the same ten-seat capacity to debug fake players', () => {
    const service = new RoomService()
    const initial = createMockRoom(9, { id: 'debug-capacity' })
    roomRepository.getRawMap().set(initial.id, initial)
    const result = service.addFakePlayers(initial.id, 10)
    expect('room' in result && result.room.players).toHaveLength(10)
    expect('added' in result && result.added).toBe(1)
    expect(service.addFakePlayers(initial.id, 1)).toEqual({ error: 'room_full' })
    roomRepository.clear()
  })
})
