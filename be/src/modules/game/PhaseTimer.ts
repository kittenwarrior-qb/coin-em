import { GamePhase } from './types'

/**
 * Phase timeout configuration (in milliseconds)
 * Phases not listed here have no timeout (manual advance only)
 */
const PHASE_TIMEOUTS: Partial<Record<GamePhase, number>> = {
  'guess-silencer': 120_000, // 2 minutes for voting
  'give-coins': 90_000,      // 90 seconds to give coins
  'group-response': 120_000, // 2 minutes for responses
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
      console.log(`[PhaseTimer] No timeout for phase: ${phase}`)
      return
    }

    console.log(`[PhaseTimer] Starting ${timeout}ms timer for room ${roomId} (phase: ${phase})`)

    const timer = setTimeout(() => {
      console.log(`[PhaseTimer] Timer expired for room ${roomId} (phase: ${phase})`)
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
      console.log(`[PhaseTimer] Cleared timer for room ${roomId}`)
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
    console.log('[PhaseTimer] Cleared all timers')
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
