import { Room, GamePhase, Role } from '../types'

export class TurnManager {
  private readonly phaseOrder: GamePhase[] = [
    'role-reveal',
    'night',
    'healer-turn',
    'silencer-turn',
    'situation-card',
    'emotion-card',
    'story-telling',
    'group-response',
    'reflection-card',
    'reflection-sharing',
    'selfcare-card',
    'hug-action',
    'guess-silencer',
    'reveal-silencer',
    'give-coins',
    'reward',
  ]

  /**
   * Get next phase based on current phase
   */
  private phaseExistsInRoom(phase: GamePhase, room?: Room): boolean {
    if (!room) return true
    if (phase === 'healer-turn') {
      return room.players.some((p) => p.originalRole === Role.HEALER || p.role === Role.HEALER)
    }
    return true
  }

  getNextPhase(currentPhase: GamePhase, room?: Room): GamePhase {
    const currentIndex = this.phaseOrder.indexOf(currentPhase)
    if (currentIndex === -1) return 'role-reveal'

    // If at reward, go back to role-reveal for new round
    if (currentIndex === this.phaseOrder.length - 1) {
      return 'role-reveal'
    }

    for (let i = currentIndex + 1; i < this.phaseOrder.length; i += 1) {
      const candidate = this.phaseOrder[i]
      if (this.phaseExistsInRoom(candidate, room)) return candidate
    }

    return 'role-reveal'
  }

  /**
   * Get previous phase inside the current round.
   */
  getPreviousPhase(currentPhase: GamePhase, room?: Room): GamePhase {
    const currentIndex = this.phaseOrder.indexOf(currentPhase)
    if (currentIndex <= 0) return currentPhase

    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      const candidate = this.phaseOrder[i]
      if (this.phaseExistsInRoom(candidate, room)) return candidate
    }

    return currentPhase
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
