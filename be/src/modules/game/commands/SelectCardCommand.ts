import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Select situation card (NTG draws card)
 * Phase: situation-card
 * Effect: Sets selected card for the round
 */
export class SelectCardCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      selectedCard: action.data?.card,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SELECT_CARD',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: action.data,
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
