import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
// @ts-expect-error Node-only QA helper, not bundled production TypeScript.
import { LOAD_POLICY, SOAK_POLICY, assertOwnedFixture, automaticLoadPhase, automaticTransition, fixtureProxyURL, fixtureRoomIds, latencySummary, loadMode, presenceOnlyCommit, rateLimitWait, soakContinues, validSoakProgressGap } from '../../scripts/load-policy.mjs'

describe('owned exploratory load policy', () => {
  it('waits only for the exact automatic next phase, never a skipped or replayed instance', () => {
    const before = { id: 'synthetic', currentRound: 3, revision: 5, phase: 'emotion-card', phaseInstance: 'old' }
    expect(automaticTransition(before, before, 'story-telling')).toBe(false)
    expect(automaticTransition(before, { ...before, revision: 6 }, 'story-telling')).toBe(false)
    const next = { ...before, revision: 6, phase: 'story-telling', phaseInstance: 'new' }
    expect(automaticTransition(before, next, 'story-telling')).toBe(true)
    for (const invalid of [
      { ...next, phase: 'group-response' }, { ...next, currentRound: 4 }, { ...next, id: 'other' },
      { ...next, revision: 5 }, { ...next, revision: NaN }, { ...next, phaseInstance: 'old' },
      { ...before, phaseInstance: 'new' }, { ...before, revision: 4 },
    ]) expect(() => automaticTransition(before, invalid, 'story-telling')).toThrow('AUTO_PHASE_DRIFT')
    for (const phase of ['healer-turn', 'silencer-turn', 'situation-card', 'emotion-card', 'selfcare-card']) expect(automaticLoadPhase(phase)).toBe(true)
    for (const phase of ['role-reveal', 'night', 'reflection-card', 'guess-silencer', 'reward', 'ended']) expect(automaticLoadPhase(phase)).toBe(false)
  })
  it('keeps automatic scheduler waits separate from manual next and records closed diagnostics', () => {
    const protocol = readFileSync(path.resolve(process.cwd(), 'scripts/load-protocol.mjs'), 'utf8')
    const runner = readFileSync(path.resolve(process.cwd(), 'scripts/test-real-load.mjs'), 'utf8')
    expect(protocol).toContain('if (automaticLoadPhase(phase))')
    expect(protocol).toContain('advanced = automaticTransition(state, current, expectedNext)')
    expect(protocol).toContain("fail('AUTO_ADVANCE_TIMEOUT')")
    expect(protocol).toContain("'MANUAL_PHASE_DRIFT'")
    expect(protocol).toContain("'MANUAL_ROUND_DRIFT'")
    expect(runner).toContain('report.failureContext = { step: detail.step')
    expect(runner).not.toContain('report.failureContext = detail')
  })
  it('recognizes only an exact persisted presence lease, not a duplicate or gameplay write', () => {
    const before = { id: 'synthetic', revision: 5, lastActivity: 1, phase: 'group-response', players: [{ userId: 'one', lastSeenAt: 10, coins: { red: 19 } }], gameLog: [] }
    const after = { ...before, revision: 6, players: [{ ...before.players[0], lastSeenAt: 20 }] }
    expect(presenceOnlyCommit(before, after)).toBe(true)
    for (const invalid of [
      { ...before, revision: 6 }, { ...after, revision: 7 }, { ...after, lastActivity: 2 },
      { ...after, gameLog: [{}] }, { ...after, phase: 'give-coins' },
      { ...after, players: [{ ...after.players[0], coins: { red: 18 } }] },
      { ...after, players: [{ ...after.players[0], lastSeenAt: 9 }] },
    ]) expect(presenceOnlyCommit(before, invalid)).toBe(false)
    expect(before.players[0].lastSeenAt).toBe(10)
  })
  it('admits only exact allocated loopback bindings', () => {
    expect(fixtureProxyURL('127.0.0.1:12345')).toBe('http://127.0.0.1:12345')
    for (const value of ['0.0.0.0:80', 'localhost:80', '103.74.102.24:80', 'https://example.com', '127.0.0.1:0', '127.0.0.1:65536', '127.0.0.1:80\n', '127.0.0.1:80/path']) expect(() => fixtureProxyURL(value)).toThrow('INVALID_FIXTURE_BINDING')
  })
  it('computes nearest-rank quantiles without mutating samples', () => {
    const input = [100, ...Array.from({ length: 99 }, (_, i) => i + 1)]
    expect(latencySummary(input)).toEqual({ count: 100, p50Ms: 50, p95Ms: 95, p99Ms: 99, maxMs: 100 })
    expect(input[0]).toBe(100)
    expect(latencySummary([])).toEqual({ count: 0, p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null })
  })
  it('fails closed on unbounded or invalid measurement input', () => {
    for (const samples of [[NaN], [Infinity], [-1], ['1'], Array(2), Array(LOAD_POLICY.maxSamples + 1).fill(1)]) expect(() => latencySummary(samples)).toThrow('INVALID_LATENCY_SAMPLES')
    expect(LOAD_POLICY.rooms * LOAD_POLICY.seats).toBe(100)
    expect(Object.isFrozen(LOAD_POLICY)).toBe(true)
  })
  it('paces from received ACK, even when proxy admission latency changes', () => {
    // Prior send100ms, server accepted800ms, ACK1000ms. A send-only wait
    // would admit the next request at1150ms, only350ms after server admission.
    expect(rateLimitWait(1000, 1150, 1050)).toBe(900)
    expect(rateLimitWait(1000, 2050, 1050)).toBe(0)
    expect(rateLimitWait(undefined, 100, 1050)).toBe(0)
    for (const args of [[NaN, 100, 1050], [101, 100, 1050], [0, Infinity, 1050], [0, 100, 1]]) expect(() => rateLimitWait(...args)).toThrow('INVALID_PACING_CLOCK')
  })
  it('never permits cleanup of an unrelated resource', () => {
    const id = 'emcoin-r30-12345678-1234-1234-1234-123456789abc'
    expect(() => assertOwnedFixture({ Labels: { 'emcoin.fixture': id } }, id)).not.toThrow()
    for (const inspected of [{}, { Labels: {} }, { Labels: { 'emcoin.fixture': 'shared' } }]) expect(() => assertOwnedFixture(inspected, id)).toThrow('UNOWNED_FIXTURE')
    expect(() => assertOwnedFixture({ Labels: { 'emcoin.fixture': 'shared' } }, 'shared')).toThrow('UNOWNED_FIXTURE')
  })
  it('keeps the opt-in topology private and cleanup ownership-checked', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'scripts/test-real-load.mjs'), 'utf8')
    expect(source).toContain('loadMode(process.argv.slice(2))')
    expect(source).toContain("'--internal'")
    expect(source).toContain("'127.0.0.1::80'")
    expect(source).toContain("'--appendfsync', 'always'")
    expect(source).toContain("'DISABLE_RATE_LIMIT=false'")
    expect(source).toContain('assertOwnedFixture(resource.kind')
    expect(source).not.toMatch(/process\.env\.(SERVER_URL|BASE_URL|VPS_HOST)|docker-compose|FLUSHALL|FLUSHDB|system.*prune/)
  })
  it('admits only default short or fixed soak mode, never targets/durations/capacity', () => {
    expect(loadMode([])).toBe('short')
    expect(loadMode(['--soak'])).toBe('soak')
    for (const args of [['--soak', '--soak'], ['--minutes=1'], ['--rooms=100'], ['http://127.0.0.1:1234'], ['--soak', 'x']]) expect(() => loadMode(args)).toThrow('NO_EXTERNAL_TARGET_ARGUMENTS')
    expect(SOAK_POLICY.durationMs).toBe(60 * 60 * 1000)
    expect(SOAK_POLICY.maxOverrunMs).toBe(LOAD_POLICY.stageTimeoutMs)
    expect(Object.isFrozen(SOAK_POLICY)).toBe(true)
  })
  it('bounds monotonic soak progress and refuses early batch exhaustion', () => {
    expect(soakContinues(0, 0)).toBe(true)
    expect(soakContinues(SOAK_POLICY.durationMs - 1, 119)).toBe(true)
    expect(soakContinues(SOAK_POLICY.durationMs, 120)).toBe(false)
    expect(() => soakContinues(1000, 120)).toThrow('SOAK_BATCH_LIMIT_BEFORE_DURATION')
    for (const [elapsed, batches] of [[NaN, 0], [Infinity, 0], [-1, 0], [0, 1.5], [0, 121]]) expect(() => soakContinues(elapsed, batches)).toThrow('INVALID_SOAK_PROGRESS')
  })
  it('rejects long unattended timing gaps rather than counting them as sustained work', () => {
    expect(validSoakProgressGap(1000, 31000)).toBe(true)
    expect(validSoakProgressGap(1000, 61000)).toBe(true)
    for (const args of [[1000, 61001], [1000, 0], [NaN, 1000], [0, Infinity]]) expect(validSoakProgressGap(...args)).toBe(false)
  })
  it('derives exact unique synthetic batch IDs, bounded to valid room IDs', () => {
    const id = 'emcoin-r30-12345678-1234-1234-1234-123456789abc'
    const first = fixtureRoomIds(id, 10, 1), second = fixtureRoomIds(id, 10, 2)
    expect(first).toHaveLength(10)
    expect(new Set([...first, ...second]).size).toBe(20)
    for (const room of first) expect(room).toMatch(/^[A-Za-z0-9_-]{1,64}$/)
    for (const args of [[id, 11, 0], [id, 10, -1], [id, 10, 121], ['shared', 10, 1]]) expect(() => fixtureRoomIds(...args)).toThrow('INVALID_FIXTURE_BATCH')
  })
  it('only cleans completed disconnected synthetic rooms through awaited production deletion', () => {
    const worker = readFileSync(path.resolve(process.cwd(), 'scripts/load-fixture-worker.cjs'), 'utf8')
    const runner = readFileSync(path.resolve(process.cwd(), 'scripts/test-real-load.mjs'), 'utf8')
    expect(worker).toContain("req.method === 'DELETE'")
    expect(worker).toContain('fixtureRoomIds(runId,')
    expect(worker).toContain('inRoomQueue(id, async')
    expect(worker).toContain("room.status !== 'ended' || room.phase !== 'ended'")
    expect(worker).toContain('io.sockets.adapter.rooms.has(id)')
    expect(worker).toContain('room.players.every(player => player.isDisconnected)')
    expect(worker).toContain('await roomRepository.deleteAndWait(id)')
    expect(runner).toContain('completedRoomsRemoved: count')
    expect(runner).toContain('soakContinues(now - started')
    expect(runner).toContain('validSoakProgressGap(lastBatchFinished, now)')
    expect(runner).toContain('SOAK_OVERRUN')
  })
  it('uses real handlers and registry without mocked storage or clock', () => {
    const worker = readFileSync(path.resolve(process.cwd(), 'scripts/load-fixture-worker.cjs'), 'utf8')
    const protocol = readFileSync(path.resolve(process.cwd(), 'scripts/load-protocol.mjs'), 'utf8')
    expect(worker).toContain("require('./dist/socket/handlers/index.js')")
    expect(worker).toContain('createAdapter(redis.pubClient, redis.subClient)')
    expect(worker).not.toMatch(/require\([^\n]*(dotenv|env\.js|__mocks__)/)
    expect(protocol).toContain("require('../dist/modules/game/engine/PhaseRegistry.js')")
    expect(protocol).toContain('DUPLICATE_LEDGER')
    expect(protocol).toContain('TERMINAL_NONCONVERGENCE')
    expect(protocol).toContain('LIVE_CLEANUP_NOT_REFUSED')
    expect(protocol).not.toMatch(/add_fake_players|mockReturnValue|mockImplementation|DISABLE_RATE_LIMIT/)
  })
})
