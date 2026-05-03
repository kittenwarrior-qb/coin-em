import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Vote for suspected silencer
 * Phase: guess-silencer
 * Effect: Records vote, auto-advances when all players voted
 */
export class VoteCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const newVotes = { ...room.votes, [action.actorId]: action.targetId! }
    const allVoted = room.players.length === Object.keys(newVotes).length

    const updatedRoom: Room = {
      ...room,
      votes: newVotes,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'VOTE',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
        },
      ],
    }

    return { success: true, room: updatedRoom, autoAdvance: allVoted }
  }
}
