import { GamePhase, Room } from '../types'
import { PHASE_ORDER, nextPhase } from './PhaseRegistry'

/**
 * Transition validation adapter over PhaseRegistry, also consumed by TurnManager.
 */
export class StateMachine {
  transition(currentPhase: GamePhase, event: string, room?: Room): GamePhase {
    if (currentPhase !== 'ended' && !PHASE_ORDER.includes(currentPhase)) throw new Error(`Invalid phase: ${currentPhase}`)
    if (!this.canTransition(currentPhase, event)) throw new Error(`Invalid transition: ${currentPhase} → ${event}`)
    return event === 'END' ? 'ended' : nextPhase(currentPhase, room)
  }

  canTransition(currentPhase: GamePhase, event: string): boolean {
    return PHASE_ORDER.includes(currentPhase) && (event === 'NEXT' || event === 'END')
  }

  getValidTransitions(currentPhase: GamePhase): string[] {
    return PHASE_ORDER.includes(currentPhase) ? ['NEXT', 'END'] : []
  }
}
