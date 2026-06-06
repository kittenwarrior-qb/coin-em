import { describe, expect, it } from 'vitest'
import { GameService } from '../../src/modules/game/services/GameService'
import { Role } from '../../src/modules/game/types'
import { createPlayingRoom, setRoomPhase } from '../helpers/mockData'

describe('GameService', () => {
  it('should expose only one current narrator role after rotating to next round', async () => {
    const service = new GameService()
    const roundOneReward = setRoomPhase(createPlayingRoom(7), 'reward')

    const result = await service.advanceTurn(roundOneReward, roundOneReward.currentNarrator!)
    expect(result.success).toBe(true)

    const publicState = service.getPublicState(result.room!)
    const visibleNarrators = publicState.players.filter((player: { role?: Role }) => player.role === Role.NARRATOR)

    expect(visibleNarrators).toHaveLength(1)
    expect(visibleNarrators[0].userId).toBe(result.room!.currentNarrator)
  })

  it('should expose a role for every player after multiple round rotations', async () => {
    const service = new GameService()
    let room = setRoomPhase(createPlayingRoom(7), 'reward')

    for (let round = 0; round < 5; round++) {
      const result = await service.advanceTurn(room, room.currentNarrator!)
      expect(result.success).toBe(true)

      const publicState = service.getPublicState(result.room!)
      expect(publicState.players.filter((player: { role?: Role }) => player.role === Role.NARRATOR)).toHaveLength(1)
      expect(publicState.players.filter((player: { role?: Role }) => player.role === Role.SENDER)).toHaveLength(1)
      expect(publicState.players.every((player: { role?: Role }) => Boolean(player.role))).toBe(true)

      room = setRoomPhase(result.room!, 'reward')
    }
  })
})
