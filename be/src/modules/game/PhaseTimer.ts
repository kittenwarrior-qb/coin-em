import { GamePhase } from './types'
import { operationDiagnostic } from '../../telemetry/operationalDiagnostics'

/**
 * Phase timeout configuration (in milliseconds)
 * Phases not listed here have no timeout (manual advance only)
 * All auto-advance disabled — narrator controls all phase transitions.
 */
const PHASE_TIMEOUTS: Partial<Record<GamePhase, number>> = {
  // All timeouts removed — game is fully manual
}

export class PhaseTimer {
  private timers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Start a timer for a room's current phase
   * @param roomId Room ID
   * @param phase Current game phase
   * @param onExpire Callback when timer expires
   */
  startTimer(roomId: string, phase: GamePhase, onExpire: () => void): void {
    // Clear any existing timer for this room
    this.clearTimer(roomId)

    // Check if this phase has a timeout
    const timeout = PHASE_TIMEOUTS[phase]
    if (!timeout) {
      operationDiagnostic('phase_timer', 'ok')
      return
    }

    operationDiagnostic('phase_timer', 'ok')

    const timer = setTimeout(() => {
      operationDiagnostic('phase_timer', 'ok')
      this.timers.delete(roomId)
      onExpire()
    }, timeout)

    this.timers.set(roomId, timer)
  }

  /**
   * Clear timer for a room
   * @param roomId Room ID
   */
  clearTimer(roomId: string): void {
    const timer = this.timers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(roomId)
      operationDiagnostic('phase_timer', 'ok')
    }
  }

  /**
   * Check if room has active timer
   * @param roomId Room ID
   */
  hasTimer(roomId: string): boolean {
    return this.timers.has(roomId)
  }

  /**
   * Clear all timers (for cleanup)
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    operationDiagnostic('phase_timer', 'ok')
  }

  /**
   * Get active timer count
   */
  getActiveCount(): number {
    return this.timers.size
  }
}

// Singleton instance
export const phaseTimer = new PhaseTimer()
