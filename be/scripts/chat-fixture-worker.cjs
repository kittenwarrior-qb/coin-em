// Compiled production modules only; no dotenv, shared Redis or live deployment.
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { createServer } = require('node:http')
const { Server } = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const parent = path.dirname(process.env.ROOM_DATA_DIR || '')
const relative = path.relative(os.tmpdir(), parent)
assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative))
assert(path.basename(parent).startsWith('emcoin-chat-check-'))
assert(process.env.NODE_ENV === 'test' && process.env.ROOM_STORAGE_MODE === 'redis-required')
assert(process.env.REDIS_HOST === '127.0.0.1' && Number(process.env.REDIS_PORT) > 1024)
assert(/^emcoin-chat-check-[a-f0-9-]{36}:$/.test(process.env.ROOM_REDIS_NAMESPACE || ''))
assert(process.env.DISABLE_RATE_LIMIT === 'false' && process.env.EMCOIN_ROOM_CHAT_ENABLED === 'true')
const redis = require('../dist/redis.js')
const { roomRepository } = require('../dist/modules/room/repository/RoomRepository.js')
const { registerSocketHandlers } = require('../dist/socket/handlers/index.js')
const { inRoomQueue } = require('../dist/socket/roomQueue.js')
const { cancelPendingRoomSaves } = require('../dist/persistence.js')
const { ChatReportStore } = require('../dist/communication/ChatReportStore.js')
const { ROOM_PREFIX, ROOM_TOMBSTONE_PREFIX } = require('../dist/storageKeys.js')
async function main() {
  assert(await redis.connectRedis(), 'FIXTURE_PRIMARY_UNAVAILABLE')
  const reports = new ChatReportStore(path.join(parent, 'chat-reports.sqlite'))
  const http = createServer((_req, res) => { res.writeHead(404); res.end() })
  const io = new Server(http)
  io.adapter(createAdapter(redis.pubClient, redis.subClient))
  const dispose = registerSocketHandlers(io, { chatReports: () => reports })
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
  process.send({ ready: true, port: http.address().port })
  process.on('message', async request => {
    try {
      assert(request && typeof request.id === 'number' && /^chat-qa-[0-9]{2}$/.test(request.roomId))
      let result
      if (request.kind === 'inspect') {
        const room = await roomRepository.findByIdFresh(request.roomId)
        result = room ? { revision: room.revision, chat: room.chat, lastActivity: room.lastActivity,
          coins: room.players.map(p => p.coins), status: room.status } : null
      } else if (request.kind === 'delete') {
        result = await inRoomQueue(request.roomId, async () => {
          await roomRepository.findByIdFresh(request.roomId)
          return roomRepository.deleteAndWait(request.roomId)
        })
      } else if (request.kind === 'deleted') {
        result = { exists: await redis.redisClient.exists(ROOM_PREFIX + request.roomId),
          marker: await redis.redisClient.get(ROOM_TOMBSTONE_PREFIX + request.roomId) }
      } else if (request.kind === 'reports') result = reports.list('all')
      else if (request.kind === 'prune') { reports.prune(Date.now() + 7 * 86400000); result = reports.list('all') }
      else throw Error('INVALID_FIXTURE_OPERATION')
      process.send({ id: request.id, result })
    } catch { process.send({ id: request.id, failed: true }) }
  })
  process.once('SIGTERM', async () => {
    await new Promise(resolve => io.close(resolve)); await dispose(); await roomRepository.drainWrites()
    cancelPendingRoomSaves(); reports.close()
    redis.redisClient.disconnect(); redis.pubClient.disconnect(); redis.subClient.disconnect(); process.exit(0)
  })
}
main().catch(error => {
  process.send?.({ failure: error?.message === 'database is locked' ? 'REPORT_DATABASE_LOCKED' : error instanceof Error && /^[A-Z][A-Z0-9_]{0,100}$/.test(error.message) ? error.message : 'CHAT_FIXTURE_START_FAILED' })
  process.exit(1)
})
