import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Silence a player (Silencer role action)
 * Phase: silencer-turn
 * Effect: Mutes target player, marks night action as done
 */
export class SilenceCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      mutedPlayer: action.targetId!,
      nightActions: {
        ...room.nightActions,
        silenced: true,
      },
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SILENCE',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }
}
