import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { Role, Room } from '../../src/modules/game/types'
import { createMockRoom } from '../helpers/mockData'

function balances(room: Room) { return room.players.map(p => ({ userId: p.userId, coins: p.coins })) }

describe('owner-approved shared-slot night baseline (not a new resolver)', () => {
  it.each([5, 6, 7, 8, 9, 10])('%i seats preserve role/phase/target restrictions and shared silence completion', count => {
    const engine = new GameEngine()
    const initial = engine.startGame(createMockRoom(count)).room!
    const room = { ...initial, phase: 'silencer-turn' as const }
    const silencers = room.players.filter(p => p.originalRole === Role.SILENCER)
    const actor = silencers[0]
    const target = room.players.find(p => !p.isNarrator && !p.isSender && p.userId !== actor.userId)!
    const command = { type: 'SILENCE' as const, actorId: actor.userId, targetId: target.userId }
    const before = JSON.stringify(room)
    expect(engine.executeAction({ ...room, phase: 'night' }, command).success).toBe(false)
    expect(engine.executeAction(room, { ...command, actorId: room.currentNarrator! }).error).toBe('Not a silencer')
    expect(engine.executeAction(room, { ...command, targetId: actor.userId }).error).toBe('Cannot silence self')
    for (const publicRole of [room.currentNarrator!, room.currentNTG!]) {
      expect(engine.executeAction(room, { ...command, targetId: publicRole }).error).toBe('CANNOT_TARGET_PUBLIC_ROLE')
    }
    expect(engine.executeAction(room, { ...command, targetId: 'missing-seat' }).error).toBe('Target not found')
    expect(JSON.stringify(room)).toBe(before)
    const result = engine.executeAction(room, command)
    expect(result.success).toBe(true)
    expect(result.room!.mutedPlayer).toBe(target.userId)
    expect(result.room!.nightActions.silenced).toBe(true)
    expect(balances(result.room!)).toEqual(balances(room))
    expect(engine.executeAction(result.room!, command).error).toBe('ACTION_ALREADY_DONE')
    if (silencers.length === 2) {
      expect(engine.executeAction(result.room!, { ...command, actorId: silencers[1].userId, targetId: actor.userId }).error).toBe('ACTION_ALREADY_DONE')
    }
  })

  it.each([7, 8, 9, 10])('%i seats keep heal-before-silence outcome, self-heal and no new coin reward', count => {
    const engine = new GameEngine()
    const initial = engine.startGame(createMockRoom(count)).room!
    const healer = initial.players.find(p => p.originalRole === Role.HEALER)!
    const silencer = initial.players.find(p => p.originalRole === Role.SILENCER)!
    const healed = engine.executeAction({ ...initial, phase: 'healer-turn' }, {
      type: 'HEAL', actorId: healer.userId, targetId: healer.userId,
    })
    expect(healed.success).toBe(true)
    expect(healed.room!.healedPlayer).toBe(healer.userId)
    expect(engine.executeAction(healed.room!, { type: 'HEAL', actorId: healer.userId, targetId: healer.userId }).error).toBe('ACTION_ALREADY_DONE')
    const silenced = engine.executeAction({ ...healed.room!, phase: 'silencer-turn' }, {
      type: 'SILENCE', actorId: silencer.userId, targetId: healer.userId,
    })
    expect(silenced.success).toBe(true)
    // Frozen web behavior: healing before silence does not grant future protection.
    expect(silenced.room!.mutedPlayer).toBe(healer.userId)
    expect(balances(silenced.room!)).toEqual(balances(initial))
    expect(silenced.room!.coinCycle!.transfers).toHaveLength(0)
  })
})
