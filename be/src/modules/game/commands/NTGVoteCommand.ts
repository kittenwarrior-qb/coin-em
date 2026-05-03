import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * NTG votes for best responder(s) in group-response phase.
 * - NTG can vote multiple players (each gets +5 yellow immediately)
 * - Votes stored as array: ntgVotes[ntgId] = [targetId, ...]
 * - No duplicate vote for same target
 */
export class NTGVoteCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const ntg = room.players.find((p) => p.isSender)

    if (action.actorId !== ntg?.userId) {
      return { success: false, error: 'ONLY_NTG_CAN_VOTE' }
    }

    if (!action.targetId) {
      return { success: false, error: 'No target specified' }
    }

    // ntgVotes stored as Record<ntgId, string[]> — support multiple votes
    const existing: string[] = (room.ntgVotes as any)?.[action.actorId] ?? []

    // Prevent duplicate vote for same target
    if (existing.includes(action.targetId)) {
      return { success: false, error: 'ALREADY_VOTED_FOR_THIS_PLAYER' }
    }

    const updatedNtgVotes = {
      ...room.ntgVotes,
      [action.actorId]: [...existing, action.targetId],
    }

    // +5 yellow immediately to voted player
    const updatedPlayers = room.players.map((p) =>
      p.userId === action.targetId
        ? { ...p, coins: { ...p.coins, yellow: p.coins.yellow + 5 } }
        : p
    )

    return {
      success: true,
      room: {
        ...room,
        players: updatedPlayers,
        ntgVotes: updatedNtgVotes,
        lastActivity: Date.now(),
        gameLog: [
          ...room.gameLog,
          {
            type: 'NTG_VOTE',
            actorId: action.actorId,
            targetId: action.targetId,
            timestamp: Date.now(),
            data: { bonus: 5 },
          },
        ],
      },
    }
  }
}
