import { Room, GamePhase } from '../types'

export class TurnManager {
  /**
   * Get next phase based on current phase
   */
  getNextPhase(currentPhase: GamePhase): GamePhase {
    const phaseOrder: GamePhase[] = [
      'role-reveal',
      'night',
      'day-draw',
      'day-emotion',
      'day-story',
      'reflection',
      'selfcare',
      'guess-role',
      'reward',
    ]

    const currentIndex = phaseOrder.indexOf(currentPhase)
    if (currentIndex === -1) return 'role-reveal'

    // If at reward, go back to role-reveal for new round
    if (currentIndex === phaseOrder.length - 1) {
      return 'role-reveal'
    }

    return phaseOrder[currentIndex + 1]
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
