import { performance } from 'node:perf_hooks'

const EVENTS = ['connect', 'start_game', 'next_turn', 'prev_turn', 'night_action', 'give_coin',
  'submit_vote', 'select_card', 'send_response', 'ntg_vote', 'share_reflection', 'confirm_role_rewards',
  'end_game', 'add_fake_players', 'update_room_settings', 'update_profile', 'leave_room',
  'disconnect', 'reconnect_room', 'room_commit', 'room_read', 'room_recovery', 'room_delete',
  'room_cleanup', 'room_delivery', 'presence', 'auto_advance', 'phase_timer', 'redis_connection',
  'http_request', 'startup', 'rate_limit'] as const
type Event = typeof EVENTS[number]
type Outcome = 'ok' | 'failed' | 'degraded' | 'fallback' | 'rejected'
type Severity = 'info' | 'warn' | 'error'
const OUTCOMES: readonly unknown[] = ['ok', 'failed', 'degraded', 'fallback', 'rejected']

/** No payload/error/identifier parameter, unbounded labels or external log collector. */
export function createOperationalDiagnostics(
  sink: (record: string, severity: Severity) => void = (record, severity) => console[severity](record),
  now: () => number = () => performance.now(),
) {
  let windowStart = 0, emitted = 0, dropped = 0
  const drop = () => { dropped = Math.min(Number.MAX_SAFE_INTEGER, dropped + 1); return false }
  return {
    record(event: Event, outcome: Outcome): boolean {
      if (!(EVENTS as readonly unknown[]).includes(event) || !OUTCOMES.includes(outcome)) return false
      let time: number
      try { time = now() } catch { return drop() }
      if (!Number.isFinite(time) || time < 0) return drop()
      if (time < windowStart || time - windowStart >= 60_000) { windowStart = time; emitted = 0 }
      if (emitted >= 120) return drop()
      emitted++
      const severity = outcome === 'failed' || outcome === 'degraded' ? 'error' : outcome === 'ok' ? 'info' : 'warn'
      try { sink(JSON.stringify({ version: 'operation-diagnostic/v1', event, outcome }), severity) }
      catch { return drop() }
      return true
    },
    snapshot: () => ({ version: 'operation-diagnostic-sampling/v1', persistent: false,
      budgetPerMinute: 120, emittedThisWindow: emitted, droppedSinceStart: dropped }),
  }
}

const diagnostics = createOperationalDiagnostics()
export const operationDiagnostic = diagnostics.record
export const diagnosticSamplingSnapshot = diagnostics.snapshot
