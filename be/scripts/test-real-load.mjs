import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanSourceEntryAllowed } from './clean-source-policy.mjs'
import { LOAD_POLICY, SOAK_POLICY, assertOwnedFixture, fixtureProxyURL, loadMode, soakContinues, validSoakProgressGap } from './load-policy.mjs'
import { runLoadStage } from './load-protocol.mjs'

// Opt-in local topology only. No target URL, env-file, shared service or deploy mode.
const mode = loadMode(process.argv.slice(2))
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pin = (await readFile(path.join(repo, '.nvmrc'), 'utf8')).trim()
if (process.version !== `v${pin}`) throw new Error('PINNED_NODE_REQUIRED')
const runId = `emcoin-r30-${randomUUID()}`
const output = await mkdtemp(path.join(await realpath(os.tmpdir()), 'emcoin-real-load-'))
const context = path.join(output, 'backend')
const names = { network: runId, ingress: `${runId}-ingress`, redis: `${runId}-redis`, backend: `${runId}-backend`, proxy: `${runId}-proxy`, image: `emcoin-r30-qa:${runId}` }
const resources = []
const report = { version: 'real-load/v2', result: 'failed', mode, runId, node: process.version, policy: LOAD_POLICY,
  topology: 'Redis/backend on owned internal network; Caddy also on owned ingress bridge, random loopback only; Redis AOF always; production handlers/adapter',
  clock: 'real', rateLimitsDisabled: false, sourceHashes: {}, images: {}, stages: [], cleanup: [],
  soak: mode === 'soak' ? { policy: SOAK_POLICY, completedBatches: 0, elapsedMs: 0, completed: false } : null,
  limitations: 'Local exploratory protocol load; only completed soak mode proves its fixed60minute workload. Not production capacity/SLO, real device/WAN, host-loss durability, full two-backend failover or broadcast zero-loss proof. Latencies are per-batch quantiles, not pooled global percentiles.' }
const hash = value => createHash('sha256').update(value).digest('hex')
async function sourceDigest(directory) {
  const digest = createHash('sha256')
  async function walk(current, relative = '') {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(current, entry.name), logical = `${relative}/${entry.name}`
      if (entry.isDirectory()) await walk(child, logical)
      else if (entry.isFile()) digest.update(logical).update('\0').update(await readFile(child)).update('\0')
      else throw new Error('UNEXPECTED_CONTEXT_ENTRY')
    }
  }
  await walk(directory)
  return digest.digest('hex')
}
async function docker(args, timeout = 20000) {
  return await new Promise((resolve, reject) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let tail = ''
    const collect = chunk => { tail = (tail + chunk.toString()).slice(-20000) }
    child.stdout.on('data', collect); child.stderr.on('data', collect)
    const timer = setTimeout(() => {
      if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      else child.kill('SIGTERM')
      reject(new Error('OWNED_DOCKER_TIMEOUT'))
    }, timeout)
    child.once('error', () => { clearTimeout(timer); reject(new Error('DOCKER_UNAVAILABLE')) })
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve(tail.trim()) : reject(new Error('OWNED_DOCKER_COMMAND_FAILED')) })
  })
}
async function inspected(kind, name) { return JSON.parse(await docker([kind, 'inspect', name]))[0] }
async function addContainer(name, args, network = names.network) {
  await docker(['run', '--detach', '--pull=never', '--name', name, '--label', `emcoin.fixture=${runId}`, '--network', network, ...args])
  resources.push({ kind: 'container', name })
  const instance = await inspected('container', name)
  assertOwnedFixture({ Labels: instance.Config?.Labels }, runId)
  return instance
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
await writeFile(path.join(output, 'report.json'), JSON.stringify({ ...report, result: 'running' }, null, 2))
try {
  if (await docker(['info', '--format', '{{.OSType}}']) !== 'linux') throw new Error('LINUX_DOCKER_REQUIRED')
  for (const [key, image] of [['redis', 'redis:7-alpine'], ['caddy', 'caddy:2-alpine']]) {
    const metadata = await inspected('image', image) // No background pull or shared mutation.
    if (metadata.Os !== 'linux') throw new Error('LINUX_IMAGE_REQUIRED')
    report.images[key] = { id: metadata.Id, architecture: metadata.Architecture }
  }
  await mkdir(context)
  for (const entry of ['package.json', 'package-lock.json', 'tsconfig.json', 'src']) await cp(path.join(repo, 'be', entry), path.join(context, entry), {
    recursive: true, filter: async source => cleanSourceEntryAllowed(source) && !(await lstat(source)).isSymbolicLink(),
  })
  await cp(path.join(repo, 'be/scripts/load-fixture-worker.cjs'), path.join(context, 'load-fixture-worker.cjs'))
  await cp(path.join(repo, 'be/scripts/load-policy.mjs'), path.join(context, 'load-policy.mjs'))
  for (const entry of ['be/package-lock.json', 'be/scripts/load-policy.mjs', 'be/scripts/load-protocol.mjs', 'be/scripts/load-fixture-worker.cjs', 'be/scripts/test-real-load.mjs']) report.sourceHashes[entry] = hash(await readFile(path.join(repo, entry)))
  report.sourceHashes['copied-backend-src'] = await sourceDigest(path.join(context, 'src'))
  if (report.sourceHashes['copied-backend-src'] !== await sourceDigest(path.join(repo, 'be/src'))) throw new Error('SOURCE_COPY_MISMATCH')
  // Generated fixture config, not a source Dockerfile modification. Explicit context allowlist above.
  await writeFile(path.join(context, 'Dockerfile'), `FROM node:${pin}-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --no-audit --no-fund\nCOPY tsconfig.json ./\nCOPY src ./src\nRUN npm run build\nCOPY load-fixture-worker.cjs load-policy.mjs ./\nCMD ["node", "load-fixture-worker.cjs"]\n`)
  console.log('R30: building owned allowlisted backend fixture')
  resources.push({ kind: 'image', name: names.image })
  await docker(['build', '--pull=false', '--label', `emcoin.fixture=${runId}`, '--tag', names.image, context], 300000)
  const image = await inspected('image', names.image)
  assertOwnedFixture({ Labels: image.Config?.Labels }, runId)
  report.images.backend = { id: image.Id, architecture: image.Architecture }
  await docker(['network', 'create', '--internal', '--label', `emcoin.fixture=${runId}`, names.network])
  resources.push({ kind: 'network', name: names.network })
  assertOwnedFixture(await inspected('network', names.network), runId)
  await addContainer(names.redis, ['redis:7-alpine', 'redis-server', '--appendonly', 'yes', '--appendfsync', 'always'])
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if (await docker(['exec', names.redis, 'redis-cli', 'ping']) === 'PONG') { ready = true; break } } catch {}
    await delay(200)
  }
  if (!ready) throw new Error('FIXTURE_REDIS_NOT_READY')
  // Closed child environment: never --env-file, inherited app/admin credentials or user data.
  await addContainer(names.backend, ['--env', 'NODE_ENV=test', '--env', 'ROOM_STORAGE_MODE=redis-required',
    '--env', `REDIS_HOST=${names.redis}`, '--env', 'REDIS_PORT=6379', '--env', `ROOM_REDIS_NAMESPACE=${runId}:`,
    '--env', 'ROOM_DATA_DIR=/tmp/fixture-rooms', '--env', 'DISABLE_RATE_LIMIT=false', '--env', 'DEBUG_ROLE_PICKER=false', names.image])
  if (await docker(['exec', names.backend, 'node', '--version']) !== `v${pin}`) throw new Error('CONTAINER_NODE_MISMATCH')
  const config = path.join(output, 'Caddyfile')
  await writeFile(config, `{\n auto_https off\n}\n:80 {\n reverse_proxy ${names.backend}:3001\n}\n`)
  // Docker's internal network has no published host binding. Keep backend/Redis
  // private; only the proxy gets a second owned bridge for loopback ingress.
  await docker(['network', 'create', '--label', `emcoin.fixture=${runId}`, names.ingress])
  resources.push({ kind: 'network', name: names.ingress })
  await addContainer(names.proxy, ['--publish', '127.0.0.1::80', '--mount', `type=bind,source=${config},target=/etc/caddy/Caddyfile,readonly`, 'caddy:2-alpine'], names.ingress)
  await docker(['network', 'connect', names.network, names.proxy])
  const proxy = await inspected('container', names.proxy)
  const binding = proxy.NetworkSettings?.Ports?.['80/tcp']
  if (!Array.isArray(binding) || binding.length !== 1) throw new Error('INVALID_PROXY_BINDING')
  const url = fixtureProxyURL(`${binding[0].HostIp}:${binding[0].HostPort}`)
  ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) })).status === 200) { ready = true; break } } catch {}
    await delay(250)
  }
  if (!ready) throw new Error('FIXTURE_BACKEND_NOT_READY')
  async function completedStage(count, cycle) {
    console.log(`R30: real Redis/Caddy ${count}room x10seats full game; batch=${cycle}`)
    const controller = new AbortController()
    let lastProgress = performance.now(), progressGapExceeded = false
    const deadline = setTimeout(() => controller.abort(), LOAD_POLICY.stageTimeoutMs)
    const progress = setInterval(() => {
      const now = performance.now()
      if (mode === 'soak' && !validSoakProgressGap(lastProgress, now)) { progressGapExceeded = true; controller.abort() }
      lastProgress = now
      console.log(`R30: ${count}room stage running (real clock/rate limits)`)
    }, 30000)
    try {
      const stage = await runLoadStage(url, count, runId, controller.signal, cycle)
      if (mode === 'soak' && (progressGapExceeded || !validSoakProgressGap(lastProgress, performance.now()))) throw new Error('SOAK_PROGRESS_GAP')
      // Actual disconnect events are asynchronous. Never delete until the worker
      // verifies terminal state plus no membership inside the existing room queue.
      const cleanupStarted = performance.now()
      let removed = false
      while (performance.now() - cleanupStarted < SOAK_POLICY.cleanupTimeoutMs) {
        const response = await fetch(`${url}/fixture-completed/${count}/${cycle}`, { method: 'DELETE', signal: AbortSignal.timeout(2000) })
        if (response.status === 204) { removed = true; break }
        if (response.status !== 409) throw new Error('FIXTURE_BATCH_CLEANUP_REJECTED')
        await delay(250)
      }
      if (!removed) throw new Error('FIXTURE_BATCH_CLEANUP_TIMEOUT')
      if (mode === 'soak' && (progressGapExceeded || !validSoakProgressGap(lastProgress, performance.now()))) throw new Error('SOAK_PROGRESS_GAP')
      report.stages.push({ ...stage, cycle, completedRoomsRemoved: count })
      await writeFile(path.join(output, 'report.json'), JSON.stringify({ ...report, result: 'running' }, null, 2))
    }
    catch (error) { if (progressGapExceeded) throw new Error('SOAK_PROGRESS_GAP'); throw error }
    finally { controller.abort(); clearTimeout(deadline); clearInterval(progress) }
  }
  await completedStage(1, 0)
  if (mode === 'short') await completedStage(LOAD_POLICY.rooms, 0)
  else {
    const started = performance.now()
    let lastBatchFinished = started
    while (true) {
      const now = performance.now()
      if (!validSoakProgressGap(lastBatchFinished, now)) throw new Error('SOAK_PROGRESS_GAP')
      if (!soakContinues(now - started, report.soak.completedBatches)) break
      await completedStage(LOAD_POLICY.rooms, report.soak.completedBatches + 1)
      lastBatchFinished = performance.now()
      report.soak.completedBatches++
      report.soak.elapsedMs = Math.round(performance.now() - started)
      if (report.soak.elapsedMs > SOAK_POLICY.durationMs + SOAK_POLICY.maxOverrunMs) throw new Error('SOAK_OVERRUN')
      await writeFile(path.join(output, 'report.json'), JSON.stringify({ ...report, result: 'running' }, null, 2))
    }
    report.soak.completed = true
  }
  report.result = 'passed'
} catch (error) {
  const firstLine = error instanceof Error ? error.message.split('\n')[0] : ''
  report.failure = /^[A-Z_]{1,120}$/.test(firstLine) ? firstLine : 'OWNED_FIXTURE_DID_NOT_PASS'
  // Closed fixture-produced enums/numbers only; never serialize arbitrary errors.
  const detail = error?.loadContext
  if (detail && ['phase-entry', 'automatic-transition', 'manual-transition'].includes(detail.step)) {
    const phases = new Set(['unknown', 'ended', 'role-reveal', 'night', 'healer-turn', 'silencer-turn', 'situation-card', 'emotion-card', 'story-telling', 'group-response', 'reflection-card', 'reflection-sharing', 'selfcare-card', 'hug-action', 'guess-silencer', 'reveal-silencer', 'give-coins', 'reward'])
    report.failureContext = { step: detail.step, expectedPhase: phases.has(detail.expectedPhase) ? detail.expectedPhase : 'unknown',
      actualPhase: phases.has(detail.actualPhase) ? detail.actualPhase : 'unknown',
      round: Number.isSafeInteger(detail.round) && detail.round >= 1 && detail.round <= 10 ? detail.round : null,
      revision: Number.isSafeInteger(detail.revision) && detail.revision >= 0 ? detail.revision : null }
  }
  process.exitCode = 1
} finally {
  for (const resource of resources.reverse()) {
    try {
      const metadata = await inspected(resource.kind, resource.name)
      assertOwnedFixture(resource.kind === 'network' ? metadata : { Labels: metadata.Config?.Labels }, runId)
      await docker(resource.kind === 'container' ? ['container', 'rm', '--force', '--volumes', resource.name]
        : [resource.kind, 'rm', resource.name])
      report.cleanup.push({ kind: resource.kind, result: 'removed-owned-fixture' })
    } catch { report.cleanup.push({ kind: resource.kind, result: 'cleanup-failed-retained' }); report.result = 'failed'; process.exitCode = 1 }
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`R30 evidence: ${output}; result=${report.result}`)
}
