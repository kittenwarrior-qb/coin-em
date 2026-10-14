import assert from 'node:assert/strict'
import { execFileSync, fork } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { createConnection } from 'node:net'

// No target/env-file parameters. Every endpoint is allocated by this owned fixture.
assert.equal(process.argv.length, 2, 'NO_EXTERNAL_TARGET_ALLOWED')
const directory = path.dirname(fileURLToPath(import.meta.url))
assert.equal(process.version, `v${fs.readFileSync(path.join(directory, '../../.nvmrc'), 'utf8').trim()}`)
const { io } = createRequire(import.meta.url)('socket.io-client')
const runId = `emcoin-chat-check-${randomUUID()}`
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'emcoin-chat-check-'))
const sockets = new Set(), children = new Set(), samples = []
const report = { version: 'real-chat-check/v1', result: 'running', node: process.version, runId,
  topology: 'Two compiled production backend processes, real Redis adapter, owned loopback AOF-always Redis, shared same-host SQLite',
  schemaBootstrap: 'Single schema initializer before parallel backend startup; simultaneous empty SQLite bootstrap is not certified',
  rateLimitsDisabled: false, rooms: 10, seats: 100, acceptedLoadMessages: 0, assertions: [],
  limitations: 'Short local chat workload, not sustained soak/SLO, production RPO, WAN/device or separate-host SQLite certification.' }
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 20000, windowsHide: true }).trim()
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const proof = text => { report.assertions.push(text); console.log(`${text}: PASS`) }
let created = false, requestNumber = 0
const env = { ...process.env, NODE_ENV: 'test', ROOM_STORAGE_MODE: 'redis-required', REDIS_HOST: '127.0.0.1',
  ROOM_REDIS_NAMESPACE: `${runId}:`, ROOM_DATA_DIR: path.join(root, 'rooms'), DISABLE_RATE_LIMIT: 'false',
  EMCOIN_ROOM_CHAT_ENABLED: 'true', DEBUG_ROLE_PICKER: 'false' }
function sourceDigest(folder) {
  const hash = createHash('sha256')
  function walk(current, relative = '') {
    for (const item of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const logical = `${relative}/${item.name}`, filename = path.join(current, item.name)
      if (item.isDirectory()) walk(filename, logical)
      else { assert(item.isFile(), 'UNEXPECTED_SOURCE_ENTRY'); hash.update(logical).update('\0').update(fs.readFileSync(filename)).update('\0') }
    }
  }
  walk(folder); return hash.digest('hex')
}
function worker() {
  const child = fork(path.join(directory, 'chat-fixture-worker.cjs'), [], { env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] })
  children.add(child)
  const pending = new Map()
  let settleReady, rejectReady
  const ready = new Promise((resolve, reject) => { settleReady = resolve; rejectReady = reject })
  const deadline = setTimeout(() => rejectReady(Error('FIXTURE_START_DEADLINE')), 15000)
  child.on('message', message => {
    if (message.failure) { clearTimeout(deadline); rejectReady(Error(message.failure)) }
    if (message.ready) { clearTimeout(deadline); settleReady(`http://127.0.0.1:${message.port}`) }
    const waiter = pending.get(message.id)
    if (waiter) { pending.delete(message.id); clearTimeout(waiter.timer); message.failed ? waiter.reject(Error('FIXTURE_OPERATION_FAILED')) : waiter.resolve(message.result) }
  })
  child.once('exit', () => { clearTimeout(deadline); children.delete(child); rejectReady(Error('FIXTURE_EXIT')); for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(Error('FIXTURE_EXIT')) } pending.clear() })
  child.once('error', () => rejectReady(Error('FIXTURE_PROCESS_ERROR')))
  child.stderr.on('data', () => {}) // Do not echo payloads or credentials in diagnostics.
  return { child, ready, query: (kind, roomId = 'chat-qa-00') => new Promise((resolve, reject) => {
    const id = ++requestNumber, timer = setTimeout(() => { pending.delete(id); reject(Error('FIXTURE_QUERY_DEADLINE')) }, 6000)
    pending.set(id, { resolve, reject, timer }); child.send({ id, kind, roomId })
  }) }
}
async function kill(instance) {
  if (instance.child.exitCode !== null || instance.child.signalCode !== null) return
  const done = new Promise(resolve => instance.child.once('exit', resolve))
  instance.child.kill('SIGKILL'); await done
}
async function connect(url) {
  assert(new URL(url).hostname === '127.0.0.1')
  const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 6000 })
  sockets.add(socket)
  await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(Error('CONNECT_DEADLINE')), 6000)
    socket.once('connect', () => { clearTimeout(timeout); resolve() }); socket.once('connect_error', () => { clearTimeout(timeout); reject(Error('CONNECT_FAILED')) }) })
  return socket
}
async function action(socket, event, payload) {
  const started = performance.now()
  const ack = await socket.timeout(6000).emitWithAck(event, payload)
  samples.push(performance.now() - started)
  assert.equal(typeof ack?.success, 'boolean', 'MALFORMED_ACK')
  return ack
}
async function success(socket, event, payload) { const ack = await action(socket, event, payload); assert.equal(ack.success, true, `REJECTED_${event}_${ack.error}`); return ack }
const code = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
async function command(seat, intent, fixed) {
  const payload = fixed ?? { roomId: seat.roomId, expectedRevision: (await success(seat.socket, 'get_chat_state', { roomId: seat.roomId })).data.revision, requestId: randomUUID(), ...intent }
  return { payload, ack: await success(seat.socket, 'chat_command', payload) }
}
async function resume(seat, url) {
  seat.socket.disconnect(); sockets.delete(seat.socket)
  seat.socket = await connect(url)
  await success(seat.socket, 'reconnect_room', { roomId: seat.roomId, userId: seat.userId, sessionToken: seat.token })
}
async function converge(check) {
  for (let i = 0; i < 60; i++) { if (check()) return; await delay(100) }
  throw Error('CHAT_DELIVERY_CONVERGENCE_DEADLINE')
}
async function readyRedis() {
  for (let i = 0; i < 40; i++) { try {
    if (docker('exec', runId, 'redis-cli', 'ping') === 'PONG' && await new Promise(resolve => {
      const socket = createConnection({ host: '127.0.0.1', port: Number(env.REDIS_PORT) })
      const settle = result => { socket.destroy(); resolve(result) }
      socket.once('connect', () => settle(true)); socket.once('error', () => settle(false)); socket.setTimeout(200, () => settle(false))
    })) return
  } catch {} await delay(100) }
  throw Error('REDIS_START_DEADLINE')
}
try {
  // Never exercise stale dist output. Compile with the pinned Node before allocating Redis.
  const backend = path.resolve(directory, '..')
  execFileSync(process.execPath, [path.join(backend, 'node_modules/typescript/bin/tsc'), '--project', path.join(backend, 'tsconfig.json')],
    { cwd: backend, timeout: 60000, windowsHide: true, stdio: 'pipe' })
  report.sourceHashes = { backendSource: sourceDigest(path.join(backend, 'src')), compiledBackend: sourceDigest(path.join(backend, 'dist')),
    fixtureWorker: createHash('sha256').update(fs.readFileSync(path.join(directory, 'chat-fixture-worker.cjs'))).digest('hex'),
    protocol: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex') }
  const { ChatReportStore } = createRequire(import.meta.url)('../dist/communication/ChatReportStore.js')
  const initializer = new ChatReportStore(path.join(root, 'chat-reports.sqlite'))
  initializer.close()
  assert.equal(docker('info', '--format', '{{.OSType}}'), 'linux')
  docker('image', 'inspect', 'redis:7-alpine') // Require cached image; no unrequested install/pull.
  docker('run', '--detach', '--pull=never', '--name', runId, '--label', `emcoin.fixture=${runId}`, '--publish', '127.0.0.1::6379',
    'redis:7-alpine', 'redis-server', '--appendonly', 'yes', '--appendfsync', 'always')
  created = true
  const port = () => { const value = docker('port', runId, '6379/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]; assert(value); return value }
  env.REDIS_PORT = port(); await readyRedis()
  let a = worker(), b = worker(), urls = await Promise.all([a.ready, b.ready])
  const rooms = await Promise.all(Array.from({ length: 10 }, async (_, r) => {
    const roomId = `chat-qa-${String(r).padStart(2, '0')}`, seats = []
    for (let i = 0; i < 10; i++) {
      const socket = await connect(urls[i % 2]), userId = `qa-${r}-${i}`
      const joined = await success(socket, 'join_room', { roomId, userId, name: `QA ${r}-${i}`, ...(i === 0 ? { createIfMissing: true } : {}) })
      const seat = { socket, roomId, userId, token: joined.session.token, loadDeltas: [] }
      socket.on('chat_update', delta => {
        // Bounded fixture receipt metadata only, never log/save chat text.
        if (seat.loadDeltas.length < 100) seat.loadDeltas.push({ roomId: delta.roomId, messageId: delta.message?.id })
      })
      seats.push(seat)
    }
    const invitation = code()
    await command(seats[0], { kind: 'enable', invitation })
    for (const seat of seats.slice(1)) await command(seat, { kind: 'join', invitation })
    return seats
  }))
  proof('100 genuine sockets admitted across two backends with invitation checks')
  const loadIds = new Map(rooms.map(seats => [seats[0].roomId, []]))
  const beforeCoins = (await a.query('inspect')).coins
  for (let cycle = 0; cycle < 10; cycle++) {
    await delay(1100)
    await Promise.all(rooms.map(async seats => {
      const committed = await command(seats[cycle], { kind: 'send', text: `Synthetic load ${cycle}` })
      loadIds.get(seats[0].roomId).push(committed.payload.requestId); report.acceptedLoadMessages++
    }))
  }
  assert.equal(report.acceptedLoadMessages, 100)
  await converge(() => rooms.every(seats => seats.every(seat => seat.loadDeltas.length === 10)))
  for (const seats of rooms) for (const seat of seats) {
    assert(seat.loadDeltas.every(delta => delta.roomId === seat.roomId), 'CROSS_ROOM_CHAT_DELIVERY')
    assert.deepEqual(seat.loadDeltas.map(delta => delta.messageId).sort(), [...loadIds.get(seat.roomId)].sort())
  }
  report.convergedSeats = 100; report.deliveredLoadDeltas = 1000
  proof('All 100 seats receive exactly their room’s 10 unique load deltas through real Redis adapter')
  assert.deepEqual((await a.query('inspect')).coins, beforeCoins)
  proof('100 bounded load messages committed; Coin/game state unchanged')
  const host = rooms[0][0], guest = rooms[0][1], target = rooms[0][2]
  await delay(1100)
  const committed = await command(guest, { kind: 'send', text: 'Synthetic durable selected evidence' })
  const reportCommand = { roomId: guest.roomId, messageId: committed.payload.requestId, requestId: randomUUID(), reason: 'unsafe' }
  await success(host.socket, 'report_chat_message', reportCommand)
  await command(host, { kind: 'block', targetId: guest.userId, value: true }); await delay(300)
  await command(host, { kind: 'mute', targetId: target.userId, value: true })
  const before = await b.query('inspect')
  await kill(a)
  await resume(guest, urls[1])
  const resumedActivity = (await b.query('inspect')).lastActivity
  const replay = await command(guest, {}, committed.payload)
  assert.equal(replay.ack.replayed, true)
  assert.equal((await b.query('inspect')).chat.messages.length, before.chat.messages.length)
  assert.equal((await b.query('inspect')).lastActivity, resumedActivity)
  proof('Backend SIGKILL and cross-backend authenticated same-ID retry do not duplicate message')
  a = worker(); urls[0] = await a.ready
  const recovered = await a.query('inspect')
  assert.deepEqual(recovered.chat, before.chat)
  assert.equal((await a.query('reports')).total, 1)
  proof('Fresh backend restores chat receipts, blocks/mutes and selected SQLite evidence')
  // Two writers from different backends race the same chat revision; Redis CAS is the fence.
  await resume(host, urls[0]); await delay(1100)
  const revision = (await a.query('inspect')).chat.revision
  const candidates = [host, guest].map(seat => ({ seat, payload: { roomId: seat.roomId, expectedRevision: revision, requestId: randomUUID(), kind: 'send', text: 'Synthetic CAS race' } }))
  const outcomes = await Promise.all(candidates.map(({ seat, payload }) => action(seat.socket, 'chat_command', payload)))
  assert.equal(outcomes.filter(outcome => outcome.success).length, 1)
  const raced = await b.query('inspect')
  assert.equal(raced.chat.revision, revision + 1)
  assert.equal(raced.chat.messages.filter(message => candidates.some(c => c.payload.requestId === message.id)).length, 1)
  proof('Concurrent two-backend chat revision race commits exactly one candidate')
  docker('kill', '--signal', 'KILL', runId); await delay(500)
  const offline = await action(host.socket, 'get_chat_state', { roomId: host.roomId })
  assert.equal(offline.success, false); assert.equal(offline.error, 'PRIMARY_STORAGE_UNAVAILABLE')
  const offlineWrite = await action(host.socket, 'chat_command', { roomId: host.roomId, kind: 'send', text: 'Synthetic must not persist',
    expectedRevision: raced.chat.revision, requestId: randomUUID() })
  assert.equal(offlineWrite.success, false); assert.equal(offlineWrite.error, 'PRIMARY_STORAGE_UNAVAILABLE')
  proof('Real primary outage fails closed, never falls back to local room writes')
  await kill(a); await kill(b)
  docker('start', runId); env.REDIS_PORT = port(); await readyRedis()
  a = worker(); urls[0] = await a.ready
  const afterAof = await a.query('inspect')
  assert.deepEqual(afterAof.chat, raced.chat)
  assert.equal((await a.query('reports')).total, 1)
  await resume(guest, urls[0])
  assert.equal((await command(guest, {}, committed.payload)).ack.replayed, true)
  proof('Actual Redis AOF kill/restart preserves chat and receipt replay in fresh process')
  assert.equal(await a.query('delete'), true)
  const deleted = await a.query('deleted')
  assert.equal(deleted.exists, 0); assert(!/Synthetic|messages|invitationHash|receipts/.test(deleted.marker))
  assert.equal((await a.query('reports')).total, 1)
  assert.equal((await a.query('prune')).total, 0)
  proof('Deleted room retains no chat archive; selected evidence is separately bounded to seven days')
  report.result = 'passed'
} catch (error) {
  report.result = 'failed'; report.failure = error instanceof Error && /^[A-Z][A-Z0-9_]{0,100}$/.test(error.message) ? error.message : error instanceof assert.AssertionError ? 'ASSERTION_FAILED' : 'FIXTURE_FAILED'
  console.error(report.failure); process.exitCode = 1
} finally {
  for (const socket of sockets) socket.disconnect()
  for (const child of [...children]) await kill({ child })
  if (created) {
    assert.equal(docker('inspect', '--format', '{{index .Config.Labels "emcoin.fixture"}}', runId), runId)
    docker('rm', '--force', runId)
  }
  const sorted = samples.sort((a, b) => a - b)
  report.ackLatencyMs = { scope: 'mixed admission/read/mutation ACKs, this short run only', samples: sorted.length,
    p50: sorted[Math.floor(sorted.length * .5)] ?? null, p95: sorted[Math.floor(sorted.length * .95)] ?? null,
    p99: sorted[Math.floor(sorted.length * .99)] ?? null, max: sorted.at(-1) ?? null }
  report.cleanup = 'Owned processes/container removed; synthetic evidence files retained in allocated temp root only'
  fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`Owned chat check report: ${path.join(root, 'report.json')}`)
}
