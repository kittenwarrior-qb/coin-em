import { describe, expect, it, vi } from 'vitest'
import { createOperationalDiagnostics } from '../../src/telemetry/operationalDiagnostics'

describe('content-free bounded operational diagnostics', () => {
  it('emits only closed metadata and outcome-derived severity', () => {
    const sink = vi.fn()
    const diagnostics = createOperationalDiagnostics(sink, () => 0)
    for (const outcome of ['ok', 'failed', 'degraded', 'fallback', 'rejected'] as const) {
      expect(diagnostics.record('room_commit', outcome)).toBe(true)
    }
    expect(sink.mock.calls).toEqual(['info', 'error', 'error', 'warn', 'warn'].map((severity, index) => [
      JSON.stringify({ version: 'operation-diagnostic/v1', event: 'room_commit',
        outcome: ['ok', 'failed', 'degraded', 'fallback', 'rejected'][index] }), severity,
    ]))
  })
  it('rejects arbitrary labels/objects without inspecting or serializing private properties', () => {
    const sink = vi.fn()
    const diagnostics = createOperationalDiagnostics(sink, () => 0)
    const privateObject = { toJSON: () => { throw new Error('must not inspect private payload') } }
    const record = diagnostics.record as unknown as (...args: unknown[]) => boolean
    for (const args of [['private-room-story', 'ok'], ['room_read', 'private-token'],
      [privateObject, 'failed'], ['room_read', privateObject]]) {
      expect(record(...args)).toBe(false)
    }
    expect(sink).not.toHaveBeenCalled()
    expect(record('room_read', 'ok', privateObject)).toBe(true)
    expect(sink).toHaveBeenCalledExactlyOnceWith(
      '{"version":"operation-diagnostic/v1","event":"room_read","outcome":"ok"}', 'info')
  })
  it('caps output at 120 records per minute and resets exactly at the boundary', () => {
    let time = 0
    const sink = vi.fn()
    const diagnostics = createOperationalDiagnostics(sink, () => time)
    for (let index = 0; index < 120; index++) expect(diagnostics.record('connect', 'ok')).toBe(true)
    expect(diagnostics.record('connect', 'ok')).toBe(false)
    time = 59_999
    expect(diagnostics.record('connect', 'ok')).toBe(false)
    time = 60_000
    expect(diagnostics.record('connect', 'ok')).toBe(true)
    expect(sink).toHaveBeenCalledTimes(121)
    expect(diagnostics.snapshot()).toEqual({ version: 'operation-diagnostic-sampling/v1',
      persistent: false, budgetPerMinute: 120, emittedThisWindow: 1, droppedSinceStart: 2 })
  })
  it('does not let failed sinks or invalid/throwing clocks reject business operations', () => {
    const sink = vi.fn(() => { throw new Error('synthetic-private-sink-error') })
    const diagnostics = createOperationalDiagnostics(sink, () => 0)
    expect(diagnostics.record('room_delete', 'degraded')).toBe(false)
    expect(diagnostics.snapshot().droppedSinceStart).toBe(1)
    for (const clock of [() => NaN, () => Infinity, () => -1,
      () => { throw new Error('synthetic-private-clock-error') }]) {
      const neverCalled = vi.fn()
      const invalid = createOperationalDiagnostics(neverCalled, clock)
      expect(invalid.record('room_read', 'failed')).toBe(false)
      expect(neverCalled).not.toHaveBeenCalled()
      expect(invalid.snapshot().droppedSinceStart).toBe(1)
    }
  })
  it('returns detached snapshots and recovers safely after a backward clock', () => {
    let time = 60_000
    const diagnostics = createOperationalDiagnostics(vi.fn(), () => time)
    diagnostics.record('startup', 'ok')
    const snapshot = diagnostics.snapshot()
    snapshot.emittedThisWindow = 9999
    expect(diagnostics.snapshot().emittedThisWindow).toBe(1)
    time = 0
    expect(diagnostics.record('startup', 'ok')).toBe(true)
    expect(diagnostics.snapshot().emittedThisWindow).toBe(1)
  })
})
