import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'
import { resolveWebCard, validateCardSelection } from '../services/CardCatalog'

/**
 * Command: Select selfcare card (Guide selects during night)
 * Phase: night
 * Effect: Sets selected card and marks night action as done
 */
export class SelectSelfcareCardCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const validation = validateCardSelection(room, action)
    if (!validation.valid) return { success: false, error: validation.error }
    const card = resolveWebCard(action.data.card, room)!
    const updatedRoom: Room = {
      ...room,
      selectedCard: card,
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
          data: { card, round: room.currentRound },
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
