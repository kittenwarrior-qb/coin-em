import { GamePhase } from '../types'

export class StateMachine {
  private transitions: Map<GamePhase, Map<string, GamePhase>>

  constructor() {
    // Define valid state transitions for all 9 phases
    this.transitions = new Map([
      [
        'role-reveal',
        new Map([
          ['NEXT', 'night'],
          ['END', 'ended'],
        ]),
      ],
      [
        'night',
        new Map([
          ['NEXT', 'day-draw'],
          ['END', 'ended'],
        ]),
      ],
      [
        'day-draw',
        new Map([
          ['NEXT', 'day-emotion'],
          ['END', 'ended'],
        ]),
      ],
      [
        'day-emotion',
        new Map([
          ['NEXT', 'day-story'],
          ['END', 'ended'],
        ]),
      ],
      [
        'day-story',
        new Map([
          ['NEXT', 'reflection'],
          ['END', 'ended'],
        ]),
      ],
      [
        'reflection',
        new Map([
          ['NEXT', 'selfcare'],
          ['END', 'ended'],
        ]),
      ],
      [
        'selfcare',
        new Map([
          ['NEXT', 'guess-role'],
          ['END', 'ended'],
        ]),
      ],
      [
        'guess-role',
        new Map([
          ['NEXT', 'reward'],
          ['END', 'ended'],
        ]),
      ],
      [
        'reward',
        new Map([
          ['NEXT', 'role-reveal'], // New round
          ['END', 'ended'],
        ]),
      ],
      ['ended', new Map()], // No transitions from ended
    ])
  }

  /**
   * Get next phase based on current phase and event
   */
  transition(currentPhase: GamePhase, event: string): GamePhase {
    const phaseTransitions = this.transitions.get(currentPhase)
    if (!phaseTransitions) {
      throw new Error(`Invalid phase: ${currentPhase}`)
    }

    const nextPhase = phaseTransitions.get(event)
    if (!nextPhase) {
      throw new Error(`Invalid transition: ${currentPhase} -> ${event}`)
    }

    return nextPhase
  }

  /**
   * Check if transition is valid
   */
  canTransition(currentPhase: GamePhase, event: string): boolean {
    const phaseTransitions = this.transitions.get(currentPhase)
    return phaseTransitions?.has(event) || false
  }

  /**
   * Get all valid transitions from current phase
   */
  getValidTransitions(currentPhase: GamePhase): string[] {
    const phaseTransitions = this.transitions.get(currentPhase)
    return phaseTransitions ? Array.from(phaseTransitions.keys()) : []
  }
}
