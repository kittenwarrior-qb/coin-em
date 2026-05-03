import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Send response during group-response phase
 * Phase: group-response
 * Effect: Records player's response
 * Note: Narrator decides on UI who completed role properly
 */
export class SendResponseCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const responses = { ...room.responses }

    // Track response
    responses[action.actorId] = action.data?.message || ''

    const updatedRoom: Room = {
      ...room,
      responses,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SEND_RESPONSE',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: { message: action.data?.message },
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
