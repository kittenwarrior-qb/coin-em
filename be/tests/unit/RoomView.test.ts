import { describe, expect, it } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { PHASE_ORDER } from '../../src/modules/game/engine/PhaseRegistry'
import { Role } from '../../src/modules/game/types'
import { roomView } from '../../src/modules/game/services/RoomView'
import { createMockRoom } from '../helpers/mockData'
import { emitRoomView } from '../../src/socket/emitRoomView'
import { resolveWebCard } from '../../src/modules/game/services/CardCatalog'

describe('one recipient-specific room snapshot', () => {
  it('does not turn a committed command into a rejection when adapter delivery fails', async () => {
    const room = new GameEngine().startGame(createMockRoom(5)).room!
    await expect(emitRoomView({ in: () => ({ fetchSockets: async () => { throw new Error('fixture adapter unavailable') } }) } as any,
      room, 'turn_changed')).resolves.toBeUndefined()
  })
  it.each([5, 6, 7, 8, 9, 10])('preserves hydration fields and privacy through all phases with %i seats', count => {
    const engine = new GameEngine()
    const initial = engine.startGame(createMockRoom(count)).room!
    const actor = initial.players.find(p => p.originalRole === Role.SILENCER)!
    const viewer = initial.players.find(p => !p.isNarrator && !p.isSender && p.userId !== actor.userId)!
    for (const phase of [...PHASE_ORDER, 'ended' as const]) {
      const room = { ...initial, phase,
        selectedCard: { id: 'TH1' }, votes: { [viewer.userId]: actor.userId, [actor.userId]: viewer.userId },
        gameLog: [{ type: 'SILENCE', actorId: actor.userId, targetId: viewer.userId, timestamp: 1 }],
        players: initial.players.map(p => ({ ...p, deviceId: 'private-device', session: { tokenHash: 'fixture-hash', generation: 1 } })),
      }
      const view = roomView(room, viewer.userId), publicView = roomView(room)
      for (const projection of [view, publicView, roomView(room, room.currentNarrator!)]) {
        expect(JSON.stringify(projection)).not.toMatch(/fixture-hash|private-device|tokenHash|generation/)
        expect(projection.selectedCard).toEqual(resolveWebCard(room.selectedCard))
        expect(projection.coinCycle).toEqual(room.coinCycle)
        expect(projection.currentRound).toBe(room.currentRound)
        expect(projection.nightActions).toEqual(room.nightActions)
      }
      expect(view.players.find(p => p.userId === viewer.userId)!.role).toBe(viewer.role)
      expect(view.players.find(p => p.userId === actor.userId)!.originalRole).toBeUndefined()
      if (!['reveal-silencer', 'give-coins', 'reward', 'ended'].includes(phase)) {
        expect(view.players.find(p => p.userId === actor.userId)!.role).toBeUndefined()
      }
      expect(publicView.players.every(p => !('originalRole' in p))).toBe(true)
      expect(view.gameLog).toHaveLength(0)
      expect(roomView(room, actor.userId).gameLog).toHaveLength(1)
      expect(roomView(room, room.currentNarrator!).gameLog).toHaveLength(1)
      if (phase === 'guess-silencer') expect(view.votes).toEqual({ [viewer.userId]: actor.userId })
    }
  })
})
