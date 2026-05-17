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
})
