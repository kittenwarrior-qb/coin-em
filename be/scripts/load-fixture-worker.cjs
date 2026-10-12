// Dedicated image entry; never imports env.ts/dotenv or the production .env.
const { createServer } = require('node:http')
const { Server } = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const redis = require('./dist/redis.js')
const { registerSocketHandlers } = require('./dist/socket/handlers/index.js')
const { roomRepository } = require('./dist/modules/room/repository/RoomRepository.js')
const { cancelPendingRoomSaves } = require('./dist/persistence.js')
const { inRoomQueue } = require('./dist/socket/roomQueue.js')

async function main() {
  if (process.env.NODE_ENV !== 'test' || process.env.ROOM_STORAGE_MODE !== 'redis-required' ||
      !/^emcoin-r30-[a-f0-9-]{36}:$/.test(process.env.ROOM_REDIS_NAMESPACE || '') ||
      process.env.DISABLE_RATE_LIMIT !== 'false' || process.env.DEBUG_ROLE_PICKER !== 'false') throw new Error('INVALID_FIXTURE_CONTEXT')
  if (!await redis.connectRedis()) throw new Error('FIXTURE_PRIMARY_UNAVAILABLE')
  const { fixtureRoomIds, presenceOnlyCommit } = await import('./load-policy.mjs')
  const runId = process.env.ROOM_REDIS_NAMESPACE.slice(0, -1)
  const commitProof = new Map()
  const originalSave = roomRepository.saveAndWait.bind(roomRepository)
  roomRepository.saveAndWait = async room => {
    const before = structuredClone(roomRepository.findById(room.id))
    await originalSave(room)
    const entries = commitProof.get(room.id) ?? new Map()
    if (entries.size >= 1000) throw new Error('FIXTURE_COMMIT_PROOF_LIMIT')
    entries.set(room.revision, presenceOnlyCommit(before, room))
    commitProof.set(room.id, entries)
  }
  let io
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const proof = /^\/fixture-presence\/(1|10)\/(0|[1-9]\d{0,2})\/(0|[1-9])\/(\d{1,6})\/(\d{1,6})$/.exec(req.url || '')
    if (req.method === 'GET' && proof) {
      try {
        const ids = fixtureRoomIds(runId, Number(proof[1]), Number(proof[2]))
        const id = ids[Number(proof[3])], from = Number(proof[4]), to = Number(proof[5])
        const entries = commitProof.get(id)
        if (!id || !entries || to <= from || to - from > 1000) throw new Error('INVALID_PROOF_RANGE')
        let presenceOnly = true
        for (let revision = from + 1; revision <= to; revision++) presenceOnly &&= entries.get(revision) === true
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ presenceOnly, commits: to - from })); return
      } catch { res.writeHead(409); res.end('fixture proof refused'); return }
    }
    // Fixture image only: no arbitrary room IDs, live-room deletion or public API.
    const completed = /^\/fixture-completed\/(1|10)\/(0|[1-9]\d{0,2})$/.exec(req.url || '')
    if (req.method === 'DELETE' && completed) {
      try {
        const ids = fixtureRoomIds(runId, Number(completed[1]), Number(completed[2]))
        for (const id of ids) await inRoomQueue(id, async () => {
          const room = await roomRepository.findByIdFresh(id)
          if (!room) { commitProof.delete(id); return } // Safe retry after partial cleanup.
          if (room.status !== 'ended' || room.phase !== 'ended' || io.sockets.adapter.rooms.has(id) ||
              !room.players.every(player => player.isDisconnected)) throw new Error('LIVE_FIXTURE_ROOM')
          if (!await roomRepository.deleteAndWait(id) || await roomRepository.findByIdFresh(id)) throw new Error('FIXTURE_DELETE_FAILED')
          commitProof.delete(id)
        })
        res.writeHead(204); res.end(); return
      } catch {
        res.writeHead(409); res.end('fixture cleanup refused'); return
      }
    }
    res.writeHead(req.url === '/health' && redis.redisAvailable ? 200 : 503)
    res.end(req.url === '/health' && redis.redisAvailable ? 'ready' : 'unavailable')
  })
  io = new Server(server)
  io.adapter(createAdapter(redis.pubClient, redis.subClient))
  const dispose = registerSocketHandlers(io)
  await new Promise(resolve => server.listen(3001, '0.0.0.0', resolve)) // Private internal network only.
  process.once('SIGTERM', async () => {
    await new Promise(resolve => io.close(resolve))
    await dispose(); await roomRepository.drainWrites(); cancelPendingRoomSaves()
    await Promise.all([redis.redisClient.quit(), redis.pubClient.quit(), redis.subClient.quit()])
    process.exit(0)
  })
}
main().catch(() => { console.error('FIXTURE_START_FAILED'); process.exit(1) })
