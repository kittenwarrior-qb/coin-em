import type { TrafficEvent } from './TrafficStore'

let sink: ((kind: TrafficEvent) => void) | undefined

export function configureGameEvents(next: ((kind: TrafficEvent) => void) | undefined): void { sink = next }

/** Anonymous daily counter only; statistics must never fail a room or game command. */
export function recordGameEvent(kind: TrafficEvent): void {
  try { sink?.(kind) } catch { /* best-effort */ }
}
