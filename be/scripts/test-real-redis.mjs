import assert from 'node:assert/strict'
import { execFileSync, fork, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConnection } from 'node:net'
import { createRequire } from 'node:module'

// Dedicated fixture container only: never attach, flush or restore shared Redis.
const runId = `emcoin-r28-${randomUUID()}`
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'emcoin-r28-'))
const directory = path.dirname(fileURLToPath(import.meta.url))
const { issueSeatSession } = createRequire(import.meta.url)('../dist/socket/SeatSession.js')
const seatSession = issueSeatSession()
const worker = path.join(directory, 'redis-fixture-worker.cjs')
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 20000 }).trim()
let created = false
const children = new Set()
try {
  docker('run', '--detach', '--name', runId, '--label', `emcoin.fixture=${runId}`,
    '--publish', '127.0.0.1::6379', 'redis:7-alpine', 'redis-server', '--appendonly', 'yes', '--appendfsync', 'always')
  created = true
  const port = docker('port', runId, '6379/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  assert(port, 'Fixture must be bound to loopback only')
  const env = { ...process.env, NODE_ENV: 'test', ROOM_STORAGE_MODE: 'redis-required',
    REDIS_HOST: '127.0.0.1', REDIS_PORT: port, ROOM_DATA_DIR: path.join(root, 'rooms'), ROOM_REDIS_NAMESPACE: `${runId}:`,
    R28_SESSION_TOKEN: seatSession.token, R28_SESSION_HASH: seatSession.session.tokenHash, R28_CATALOG_DB: path.join(root, 'catalog.sqlite') }
  const waitRedis = async () => {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        if (docker('exec', runId, 'redis-cli', 'ping') === 'PONG') {
          const reachable = await new Promise(resolve => {
            const socket = createConnection({ host: '127.0.0.1', port: Number(env.REDIS_PORT) })
            const settle = ok => { socket.destroy(); resolve(ok) }
            socket.once('connect', () => settle(true))
            socket.once('error', () => settle(false))
            socket.setTimeout(200, () => settle(false))
          })
          if (reachable) return
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('Fixture Redis did not become ready')
  }
  const run = (mode, overrides = {}) => {
    const result = spawnSync(process.execPath, [worker, mode], { env: { ...env, ...overrides }, encoding: 'utf8', timeout: 20000 })
    assert.equal(result.status, 0, result.stderr || result.error?.message)
    console.log(result.stdout.trim())
  }
  await waitRedis()
  run('seed')
  const startRace = id => {
    const child = fork(worker, ['race', id], { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
    children.add(child)
    let result, readyRevision
    let stderr = ''
    child.stderr.on('data', data => { stderr += data })
    const ready = new Promise((resolve, reject) => {
      child.on('message', message => {
        if (message.ready) { readyRevision = message.revision; resolve() }
        if (message.committed !== undefined) result = message
      })
      child.once('error', reject)
      child.once('exit', code => { if (readyRevision === undefined) reject(new Error(`Race worker failed: ${code} ${stderr}`)) })
    })
    const finished = new Promise((resolve, reject) => child.once('exit', code => {
      children.delete(child)
      if (code === 0 && result) resolve(result)
      else reject(new Error(`Race worker failed: ${code} ${stderr}`))
    }))
    return { child, ready, finished, revision: () => readyRevision }
  }
  const a = startRace('race-a'), b = startRace('race-b')
  await Promise.all([a.ready, b.ready])
  assert.equal(a.revision(), 2); assert.equal(b.revision(), 2)
  a.child.send('commit'); b.child.send('commit')
  const results = await Promise.all([a.finished, b.finished])
  assert.equal(results.filter(result => result.committed).length, 1)
  console.log('R28 two-process revision CAS, one commit/one conflict: PASS')
  docker('kill', '--signal', 'KILL', runId)
  run('offline')
  docker('start', runId)
  env.REDIS_PORT = docker('port', runId, '6379/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  assert(env.REDIS_PORT, 'Restarted fixture must remain loopback-only')
  await waitRedis()
  run('read')
  console.log('R28 actual Redis AOF kill/restart: PASS (fixture appendfsync=always; not a production RPO claim)')
  run('delete')
  docker('kill', '--signal', 'KILL', runId)
  docker('start', runId)
  env.REDIS_PORT = docker('port', runId, '6379/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  assert(env.REDIS_PORT, 'Restarted fixture must remain loopback-only')
  await waitRedis()
  run('deleted-read', { ROOM_DATA_DIR: path.join(root, 'other-worker', 'rooms') })
  run('admin-close', { ROOM_DATA_DIR: path.join(root, 'admin-worker', 'rooms') })
  docker('kill', '--signal', 'KILL', runId)
  docker('start', runId)
  env.REDIS_PORT = docker('port', runId, '6379/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  assert(env.REDIS_PORT, 'Restarted admin fixture must remain loopback-only')
  await waitRedis()
  run('admin-replay', { ROOM_DATA_DIR: path.join(root, 'admin-replay-worker', 'rooms') })
} finally {
  for (const child of children) child.kill()
  if (created) {
    const label = docker('inspect', '--format', '{{index .Config.Labels "emcoin.fixture"}}', runId)
    assert.equal(label, runId, 'Refuse to remove an unowned container')
    docker('rm', '--force', runId)
  }
  const relative = path.relative(os.tmpdir(), root)
  assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(root).startsWith('emcoin-r28-'))
  fs.rmSync(root, { recursive: true, force: true })
  console.log('R28 fixture container/temp files removed; no shared Redis touched')
}
