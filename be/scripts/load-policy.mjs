// Closed local fixture policy: deliberately no arbitrary server URL/capacity mode.
export const LOAD_POLICY = Object.freeze({ rooms: 10, seats: 10, maxSamples: 50000, ackTimeoutMs: 10000, stageTimeoutMs: 300000 })
export const SOAK_POLICY = Object.freeze({ durationMs: 3600000, maxBatches: 120, maxOverrunMs: LOAD_POLICY.stageTimeoutMs, cleanupTimeoutMs: 10000, maxProgressGapMs: 60000 })
export function validSoakProgressGap(previous, now) {
  return Number.isFinite(previous) && previous >= 0 && Number.isFinite(now) && now >= previous && now - previous <= SOAK_POLICY.maxProgressGapMs
}
// Fixture follows existing delayed actions; it must never race them with manual NEXT.
export function automaticLoadPhase(phase) {
  return ['healer-turn', 'silencer-turn', 'situation-card', 'emotion-card', 'selfcare-card'].includes(phase)
}
export function automaticTransition(before, current, nextPhase) {
  if (!before || !current || current.id !== before.id || current.currentRound !== before.currentRound ||
      !Number.isSafeInteger(before.revision) || !Number.isSafeInteger(current.revision) || current.revision < before.revision) throw new Error('AUTO_PHASE_DRIFT')
  if (current.phase === before.phase && current.phaseInstance === before.phaseInstance) return false
  if (current.phase === nextPhase && typeof current.phaseInstance === 'string' && current.phaseInstance !== before.phaseInstance && current.revision > before.revision) return true
  throw new Error('AUTO_PHASE_DRIFT')
}
// Memory-only fixture classification, never a public schema or logged room payload.
export function presenceOnlyCommit(before, after) {
  if (!before || !after || !Array.isArray(before.players) || !Array.isArray(after.players) ||
      !Number.isSafeInteger(before.revision) || after.revision !== before.revision + 1 || before.players.length !== after.players.length) return false
  let changed = false
  for (let i = 0; i < before.players.length; i++) {
    const old = before.players[i].lastSeenAt, next = after.players[i].lastSeenAt
    if (old === next) continue
    if (!Number.isFinite(next) || next < (old ?? 0)) return false
    changed = true
  }
  const domain = room => {
    const { revision: _revision, players, ...rest } = room
    return { ...rest, players: players.map(player => { const { lastSeenAt: _lease, ...fields } = player; return fields }) }
  }
  return changed && JSON.stringify(domain(before)) === JSON.stringify(domain(after))
}
export function loadMode(args) {
  if (!Array.isArray(args) || (args.length && (args.length !== 1 || args[0] !== '--soak'))) throw new Error('NO_EXTERNAL_TARGET_ARGUMENTS')
  return args.length ? 'soak' : 'short'
}
export function fixtureRoomIds(runId, count, cycle = 0) {
  if (!/^emcoin-r30-[a-f0-9-]{36}$/.test(runId) || ![1, LOAD_POLICY.rooms].includes(count) ||
      !Number.isSafeInteger(cycle) || cycle < 0 || cycle > SOAK_POLICY.maxBatches) throw new Error('INVALID_FIXTURE_BATCH')
  return Array.from({ length: count }, (_, index) => `${runId.slice(0, 45)}-${count}-${cycle}-${index}`)
}
export function soakContinues(elapsedMs, batches) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || !Number.isSafeInteger(batches) || batches < 0 || batches > SOAK_POLICY.maxBatches) throw new Error('INVALID_SOAK_PROGRESS')
  if (elapsedMs >= SOAK_POLICY.durationMs) return false
  if (batches === SOAK_POLICY.maxBatches) throw new Error('SOAK_BATCH_LIMIT_BEFORE_DURATION')
  return true
}
export function fixtureProxyURL(binding) {
  const match = /^127\.0\.0\.1:([1-9]\d{0,4})$/.exec(binding)
  if (!match || match[0] !== binding || Number(match[1]) > 65535) throw new Error('INVALID_FIXTURE_BINDING')
  return `http://${binding}`
}
export function latencySummary(samples) {
  if (!Array.isArray(samples) || samples.length > LOAD_POLICY.maxSamples || Array.from(samples).some(n => !Number.isFinite(n) || n < 0)) throw new Error('INVALID_LATENCY_SAMPLES')
  const ordered = [...samples].sort((a, b) => a - b)
  const percentile = p => ordered.length ? Number(ordered[Math.max(0, Math.ceil(ordered.length * p) - 1)].toFixed(3)) : null
  return { count: ordered.length, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: percentile(1) }
}
export function rateLimitWait(lastAcknowledgedAt, now, minimum) {
  if (!Number.isFinite(now) || now < 0 || !Number.isFinite(minimum) || minimum < 500 || minimum > 3000 ||
      (lastAcknowledgedAt !== undefined && (!Number.isFinite(lastAcknowledgedAt) || lastAcknowledgedAt < 0 || lastAcknowledgedAt > now))) throw new Error('INVALID_PACING_CLOCK')
  return lastAcknowledgedAt === undefined ? 0 : Math.max(0, minimum - (now - lastAcknowledgedAt))
}
export function assertOwnedFixture(inspected, runId) {
  if (!/^emcoin-r30-[a-f0-9-]{36}$/.test(runId) || inspected?.Labels?.['emcoin.fixture'] !== runId) throw new Error('UNOWNED_FIXTURE')
}
