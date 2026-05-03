import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Heal a player (Healer role action)
 * Phase: healer-turn
 * Effect: Heals target, removes mute if target was silenced
 * Bonus: +5 yellow if healed the silenced player
 */
export class HealCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const wasSilenced = room.mutedPlayer === action.targetId
    
    let updatedRoom: Room = {
      ...room,
      healedPlayer: action.targetId!,
      // Remove mute if healed player was muted
      mutedPlayer: wasSilenced ? null : room.mutedPlayer,
      nightActions: {
        ...room.nightActions,
        healed: true,
      },
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'HEAL',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
        },
      ],
    }

    // Give healer +5 yellow bonus if they healed the silenced player
    if (wasSilenced && !room.bonusesGiven.healerBonus) {
      updatedRoom.players = updatedRoom.players.map((p) => {
        if (p.userId === action.actorId) {
          return {
            ...p,
            coins: {
              ...p.coins,
              yellow: p.coins.yellow + 5, // +5 yellow bonus per role_rule.md
            },
          }
        }
        return p
      })
      
      updatedRoom.bonusesGiven = {
        ...updatedRoom.bonusesGiven,
        healerBonus: true,
      }
      
      updatedRoom.gameLog = [
        ...updatedRoom.gameLog,
        {
          type: 'HEALER_BONUS',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: { bonus: 5, reason: 'Healed silenced player' },
        },
      ]
    }

    return { success: true, room: updatedRoom }
  }
}
