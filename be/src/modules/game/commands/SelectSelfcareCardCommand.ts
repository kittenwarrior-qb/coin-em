import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Select selfcare card (Guide selects during night)
 * Phase: night
 * Effect: Sets selected card and marks night action as done
 */
export class SelectSelfcareCardCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      selectedCard: action.data?.card,
      nightActions: {
        ...room.nightActions,
        cardSelected: true,
      },
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SELECT_SELFCARE_CARD',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: action.data,
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
