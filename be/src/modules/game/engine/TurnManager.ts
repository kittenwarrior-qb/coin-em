import { Room, GamePhase } from '../types'
import { nextPhase, previousPhase } from './PhaseRegistry'

export class TurnManager {
  /**
   * Get next phase based on current phase
   */
  getNextPhase(currentPhase: GamePhase, room?: Room): GamePhase {
    return nextPhase(currentPhase, room)
  }

  /**
   * Get previous phase inside the current round.
   */
  getPreviousPhase(currentPhase: GamePhase, room?: Room): GamePhase {
    return previousPhase(currentPhase, room)
  }

  /**
   * Check if should start new round (after reward phase)
   */
  shouldStartNewRound(room: Room): boolean {
    return room.phase === 'reward'
  }

  /**
   * Check if should rotate roles (new round)
   */
  shouldRotateRoles(room: Room): boolean {
    return this.shouldStartNewRound(room)
  }

  /**
   * Get next round number
   */
  getNextRound(room: Room): number {
    if (this.shouldStartNewRound(room)) {
      return room.currentRound + 1
    }
    return room.currentRound
  }

  /**
   * Check if game should end
   */
  shouldEndGame(room: Room): boolean {
    const nextRound = this.getNextRound(room)
    return nextRound > room.totalRounds
  }
}
