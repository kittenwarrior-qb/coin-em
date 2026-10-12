import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'
import { resolveWebCard, validateCardSelection } from '../services/CardCatalog'

/**
 * Command: Select situation card (NTG draws card)
 * Phase: situation-card
 * Effect: Sets selected card for the round
 */
export class SelectCardCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const validation = validateCardSelection(room, action)
    if (!validation.valid) return { success: false, error: validation.error }
    const card = resolveWebCard(action.data.card, room)!
    const updatedRoom: Room = {
      ...room,
      selectedCard: card,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SELECT_CARD',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: { card, round: room.currentRound },
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
