import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { ActionValidator } from '../../src/modules/game/engine/ActionValidator'
import { PHASE_ORDER, phaseApplies, nextPhase, previousPhase } from '../../src/modules/game/engine/PhaseRegistry'
import { phaseView } from '../../src/modules/game/services/PhaseView'
import { roomView } from '../../src/modules/game/services/RoomView'
import { Role } from '../../src/modules/game/types'
import { createMockRoom } from '../helpers/mockData'
import { SelectCardCommand } from '../../src/modules/game/commands/SelectCardCommand'

describe('recipient phase presentation follows existing domain contracts', () => {
  it.each([5, 6, 7, 8, 9, 10])('matches navigation and permission across all phases and %i seats', count => {
    const initial = new GameEngine().startGame(createMockRoom(count)).room!
    const validator = new ActionValidator()
    const applicable = PHASE_ORDER.filter(phase => phaseApplies(phase, initial))
    for (const phase of applicable) {
      const room = { ...initial, phase }
      const before = JSON.stringify(room)
      for (const player of room.players) {
        const view = phaseView(room, player.userId)!
        expect(view.version).toBe('phase-view/v1')
        expect(view.position).toBe(applicable.indexOf(phase) + 1)
        expect(view.total).toBe(applicable.length)
        expect(view.next).toBe(nextPhase(phase, room))
        const previous = previousPhase(phase, room)
        expect(view.previous).toBe(previous === phase ? null : previous)
        expect(view.capabilities.advance).toBe(validator.canAdvanceTurn(room, player.userId))
        expect(view.capabilities.heal).toBe(room.players.some(target => validator.validate(room, { type: 'HEAL', actorId: player.userId, targetId: target.userId }).valid))
        expect(view.capabilities.silence).toBe(room.players.some(target => validator.validate(room, { type: 'SILENCE', actorId: player.userId, targetId: target.userId }).valid))
        expect(view.capabilities.guessSilencer).toBe(room.players.some(target => validator.validate(room, { type: 'VOTE', actorId: player.userId, targetId: target.userId }).valid))
        const publicView = phaseView(room)!
        expect(Object.values(publicView.capabilities).every(value => value === false)).toBe(true)
        expect(JSON.stringify(view)).not.toContain(player.userId)
      }
      expect(JSON.stringify(room)).toBe(before)
    }
  })
  it('does not infer absent Guide from private role projection; fallback follows real server role', () => {
    const initial = new GameEngine().startGame(createMockRoom(7)).room!
    const room = { ...initial, phase: 'selfcare-card' as const }
    const guide = room.players.find(player => player.originalRole === Role.GUIDE)!
    const senderView = roomView(room, room.currentNTG!)
    expect(senderView.players.find(player => player.userId === guide.userId)!.role).toBeUndefined()
    expect(senderView.phaseView!.capabilities.selectSelfcare).toBe(false)
    expect(roomView(room, guide.userId).phaseView!.capabilities.selectSelfcare).toBe(true)
    const noRealGuide = { ...room, players: room.players.map(player => player.userId === guide.userId ? { ...player, isFake: true } : player) }
    expect(phaseView(noRealGuide, room.currentNTG!)!.capabilities.selectSelfcare).toBe(true)
  })
  it('matches duplicate/max reflection and completed night/selfcare command boundaries', () => {
    let room = { ...new GameEngine().startGame(createMockRoom(7)).room!, phase: 'reflection-card' as const }
    const command = new SelectCardCommand()
    expect(phaseView(room, room.currentNTG!)!.capabilities.selectReflection).toBe(true)
    for (const id of ['PT1', 'PT2', 'PT3']) room = command.execute(room, { type: 'SELECT_CARD', actorId: room.currentNTG!, data: { card: { id } } }).room! as typeof room
    expect(phaseView(room, room.currentNTG!)!.capabilities.selectReflection).toBe(false)
    const healer = room.players.find(player => player.originalRole === Role.HEALER)!
    expect(phaseView({ ...room, phase: 'healer-turn', nightActions: { ...room.nightActions, healed: true } }, healer.userId)!.capabilities.heal).toBe(false)
    const guide = room.players.find(player => player.originalRole === Role.GUIDE)!
    expect(phaseView({ ...room, phase: 'selfcare-card', nightActions: { ...room.nightActions, cardSelected: true } }, guide.userId)!.capabilities.selectSelfcare).toBe(false)
  })
  it('shows final reward next=ended, checkpoint rollback=false, and no terminal actions', () => {
    const initial = new GameEngine().startGame(createMockRoom(5)).room!
    const final = { ...initial, phase: 'reward' as const, currentRound: initial.totalRounds }
    expect(phaseView(final, initial.currentNarrator!)!.next).toBe('ended')
    const locked = { ...final, coinCycle: { ...final.coinCycle!, closed: true } }
    expect(phaseView(locked, initial.currentNarrator!)!.capabilities.rollback).toBe(false)
    const terminal = phaseView({ ...final, status: 'ended', phase: 'ended' }, initial.currentNarrator!)!
    expect(terminal).toMatchObject({ next: null, previous: null, position: null })
    for (const key of ['advance', 'rollback', 'heal', 'silence', 'selectSituation', 'selectEmotion', 'selectReflection', 'selectSelfcare', 'guessSilencer'] as const) expect(terminal.capabilities[key]).toBe(false)
  })
  it('fails closed for unknown phase, outsider, waiting, and disconnected seat', () => {
    const initial = new GameEngine().startGame(createMockRoom(7)).room!
    expect(phaseView({ ...initial, phase: 'unexpected' as never }, initial.currentNarrator!)).toBeNull()
    for (const room of [{ ...initial, status: 'waiting' as const }, { ...initial, players: initial.players.map(player => ({ ...player, isDisconnected: true })) }]) {
      expect(phaseView(room, initial.currentNarrator!)!.capabilities.advance).toBe(false)
    }
    expect(Object.values(phaseView(initial, 'outsider')!.capabilities).every(value => value === false)).toBe(true)
  })
})
