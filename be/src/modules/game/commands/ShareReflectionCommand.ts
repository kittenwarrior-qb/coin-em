import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Share reflection card (NTG shares reflection)
 * Phase: reflection-sharing
 * Effect: Records reflection, gives +5 yellow bonus immediately
 * Validation: Only NTG can share reflection
 */
export class ShareReflectionCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const ntg = room.players.find((p) => p.isSender)

    // Validate: only NTG can share reflection
    if (action.actorId !== ntg?.userId) {
      return { success: false, error: 'ONLY_NTG_CAN_SHARE' }
    }

    // Give +5 yellow immediately
    const updatedPlayers = room.players.map((p) => {
      if (p.userId === action.actorId) {
        return {
          ...p,
          coins: {
            ...p.coins,
            yellow: p.coins.yellow + 5,
          },
        }
      }
      return p
    })

    const updatedRoom: Room = {
      ...room,
      players: updatedPlayers,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SHARE_REFLECTION',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: { bonus: 5, message: action.data?.message },
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
