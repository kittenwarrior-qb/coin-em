const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')

const relative = path.relative(os.tmpdir(), process.env.ROOM_DATA_DIR || '')
assert(process.env.NODE_ENV === 'test' && process.env.ROOM_STORAGE_MODE === 'redis-required')
assert(process.env.REDIS_HOST === '127.0.0.1' && Number(process.env.REDIS_PORT) > 1024)
assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative))
assert(process.env.ROOM_REDIS_NAMESPACE?.startsWith('emcoin-r28-'))
const redis = require('../dist/redis.js')
const { RoomRepository } = require('../dist/modules/room/repository/RoomRepository.js')
const { GameEngine } = require('../dist/modules/game/engine/GameEngine.js')
const { ROOM_PREFIX, ROOM_INDEX, ROOM_TOMBSTONE_PREFIX } = require('../dist/storageKeys.js')
const { BACKUP_RETENTION_MS, ROOM_INACTIVITY_MS } = require('../dist/retention.js')
const { authenticateSeat } = require('../dist/socket/SeatSession.js')
const { roomView } = require('../dist/modules/game/services/RoomView.js')
const { closeAdminRoom } = require('../dist/admin/closeRoom.js')
const roomId = 'durable-fixture'
const repository = new RoomRepository(), engine = new GameEngine()
const { CatalogStore } = require('../dist/catalog/CatalogStore.js')
const { pdfCatalogDraft } = require('../dist/catalog/pdfDraft.js')
const { configureRuntimeCatalog } = require('../dist/catalog/runtimeCatalog.js')
const { resolveWebCard } = require('../dist/modules/game/services/CardCatalog.js')
const { randomUUID } = require('node:crypto')
const catalogPath = process.env.R28_CATALOG_DB
const catalogRelative = path.relative(os.tmpdir(), catalogPath || '')
assert(catalogRelative && !catalogRelative.startsWith('..') && !path.isAbsolute(catalogRelative))
const catalogStore = new CatalogStore(catalogPath)
if (catalogStore.draft().revision === 0) {
  catalogStore.seed(pdfCatalogDraft().map(card => ({ ...card, reviewed: true })))
  const version = catalogStore.snapshot(1, randomUUID()).version
  catalogStore.activate(version, 2, randomUUID())
}
configureRuntimeCatalog(catalogStore)
const catalogVersion = catalogStore.activeVersion()
function waitingRoom() {
  return {
    id: roomId, catalogVersion, host: 'seat-0', status: 'waiting', phase: 'role-reveal', turn: 1,
    currentRound: 1, totalRounds: 5, roundLimit: 1, currentNTG: null, currentNarrator: null,
    players: Array.from({ length: 5 }, (_, i) => ({ userId: `seat-${i}`, socketId: `fixture-${i}`, name: `Fixture ${i}`, coins: { red: 0, green: 0, yellow: 0 } })),
    mutedPlayer: null, healedPlayer: null, selectedCard: null, gameLog: [], lastActivity: Date.now(),
    settings: { situationGroups: ['light'], emotionGroups: ['basic'] },
    votes: {}, ntgVotes: {}, nightActions: { silenced: false, healed: false, cardSelected: false },
    redCoinsGiven: {}, yellowCoinsGiven: {}, roleCompletions: {}, responses: {}, bonusesGiven: { healerBonus: false },
  }
}
function gift(room, requestId, amount = 1) {
  const target = room.players.find(p => p.userId !== room.currentNTG)
  return engine.executeAction(room, { type: 'GIVE_COIN', actorId: room.currentNTG, targetId: target.userId, data: { coinType: 'red', amount, requestId, round: 1 } })
}
async function main() {
  const mode = process.argv[2]
  const connected = await redis.connectRedis()
  if (mode === 'offline') {
    assert.equal(connected, false)
    await assert.rejects(repository.saveAndWait(waitingRoom()), /PRIMARY_STORAGE_UNAVAILABLE/)
    assert.equal(repository.count(), 0)
    console.log('R28 offline fail-closed: PASS')
    return
  }
  assert.equal(connected, true)
  if (mode === 'seed') {
    assert.deepEqual(await redis.redisClient.config('GET', 'appendonly'), ['appendonly', 'yes'])
    assert.deepEqual(await redis.redisClient.config('GET', 'appendfsync'), ['appendfsync', 'always'])
    const room = { ...engine.startGame(waitingRoom()).room, phase: 'give-coins' }
    room.selectedCard = resolveWebCard('pdf-v1-emotion-1', room)
    room.players[0].session = { tokenHash: process.env.R28_SESSION_HASH, generation: 1 }
    await repository.saveAndWait(room)
    const result = gift(room, 'persisted-gift', 3)
    assert(result.success)
    await repository.saveAndWait(result.room)
    assert.equal(result.room.revision, 2)
    console.log('R28 committed snapshot/receipt: PASS')
  } else if (mode === 'race') {
    const room = await repository.findByIdFresh(roomId)
    assert(room)
    const result = gift(room, process.argv[3])
    assert(result.success)
    const release = new Promise(resolve => process.once('message', resolve))
    process.send({ ready: true, revision: room.revision })
    await release
    try {
      await repository.saveAndWait(result.room)
      process.send({ committed: true, revision: result.room.revision })
    } catch (error) {
      assert.match(error.message, /ROOM_REVISION_CONFLICT/)
      process.send({ committed: false, error: error.message })
    }
  } else if (mode === 'read') {
    await repository.loadFromRedis()
    const room = repository.findById(roomId)
    assert(room)
    assert.equal(room.rulesVersion, 'web-16-coin60/v1')
    assert.equal(room.roundLimit, 1)
    assert.equal(room.totalRounds, 1)
    assert.equal(room.catalogVersion, catalogVersion)
    assert.equal(roomView(room).selectedCard.frontImage, '/emcoin/decks/pdf-v1/page-051.webp')
    catalogStore.activate(null, catalogStore.draft().revision, randomUUID())
    assert.equal(roomView(room).selectedCard.frontImage, '/emcoin/decks/pdf-v1/page-051.webp')
    catalogStore.activate(catalogVersion, catalogStore.draft().revision, randomUUID())
    console.log('R28 pinned PDF snapshot / SQLite reopen / active rollback survive Redis AOF restart: PASS')
    console.log('R28 custom round limit / frozen total survive AOF restart: PASS')
    assert.equal(room.revision, 3)
    assert.equal(authenticateSeat(room.players[0], process.env.R28_SESSION_TOKEN), true)
    assert.equal(authenticateSeat(room.players[0], 'x'.repeat(43)), false)
    assert.equal(JSON.stringify(roomView(room, room.players[0].userId)).includes(process.env.R28_SESSION_HASH), false)
    assert.equal(JSON.stringify(room).includes(process.env.R28_SESSION_TOKEN), false)
    console.log('R28 session hash recovered in a new process; correct/forged token checks: PASS')
    const target = room.players.find(p => p.userId !== room.currentNTG)
    assert.equal(room.coinCycle.received[target.userId].red, 4)
    assert.equal(room.players.find(p => p.isSender).coins.red, 16)
    assert.equal(room.coinCycle.transfers.length, 2)
    const retry = gift(room, 'persisted-gift', 3)
    assert(retry.success)
    assert.equal(retry.room.coinCycle.transfers.length, 2)
    assert.equal(await redis.redisClient.sismember(ROOM_INDEX, roomId), 1)
    repository.save({ ...room, revision: 2 })
    await repository.drainWrites()
    assert.equal((await repository.findByIdFresh(roomId)).revision, 3)
    // The index preflight prevents Lua's non-rollback behavior from partially committing.
    await redis.redisClient.del(ROOM_INDEX)
    await redis.redisClient.set(ROOM_INDEX, 'fixture-wrong-type')
    const candidate = gift(room, 'must-not-commit')
    await assert.rejects(repository.saveAndWait(candidate.room), /CORRUPT_ROOM_INDEX/)
    assert.equal(JSON.parse(await redis.redisClient.get(ROOM_PREFIX + roomId)).revision, 3)
    await redis.redisClient.del(ROOM_INDEX)
    await redis.redisClient.sadd(ROOM_INDEX, roomId)
    console.log('R28 new process recovery/idempotency/index validation: PASS')
  } else if (mode === 'delete') {
    const room = await repository.findByIdFresh(roomId)
    assert(room)
    // A current room must survive an inactivity-only delete attempt.
    assert.equal(await repository.deleteAndWait(roomId, Date.now()), false)
    assert.equal(await redis.redisClient.exists(ROOM_PREFIX + roomId), 1)
    // Wrong index type must fail before any deletion/marker write (Lua has no rollback).
    await redis.redisClient.del(ROOM_INDEX)
    await redis.redisClient.set(ROOM_INDEX, 'fixture-wrong-type')
    await assert.rejects(repository.deleteAndWait(roomId), /CORRUPT_ROOM_INDEX/)
    assert.equal(await redis.redisClient.exists(ROOM_PREFIX + roomId), 1)
    assert.equal(await redis.redisClient.exists(ROOM_TOMBSTONE_PREFIX + roomId), 0)
    await redis.redisClient.del(ROOM_INDEX)
    await redis.redisClient.sadd(ROOM_INDEX, roomId)
    // The stale cached revision cannot erase a newer primary snapshot.
    await redis.redisClient.set(ROOM_PREFIX + roomId, JSON.stringify({ ...room, revision: 4 }))
    assert.equal(await repository.deleteAndWait(roomId), false)
    assert.equal(await redis.redisClient.exists(ROOM_PREFIX + roomId), 1)
    await repository.findByIdFresh(roomId)
    assert.equal(await repository.deleteAndWait(roomId), true)
    assert.equal(await redis.redisClient.exists(ROOM_PREFIX + roomId), 0)
    assert.equal(await redis.redisClient.sismember(ROOM_INDEX, roomId), 0)
    const ttl = await redis.redisClient.pttl(ROOM_TOMBSTONE_PREFIX + roomId)
    assert(ttl > BACKUP_RETENTION_MS - 10000 && ttl <= BACKUP_RETENTION_MS)
    console.log('R28 real Redis atomic deletion, fresh-activity/revision/index guards and seven-day marker: PASS')
  } else if (mode === 'deleted-read') {
    const marker = await redis.redisClient.get(ROOM_TOMBSTONE_PREFIX + roomId)
    assert(marker)
    assert.equal(await repository.findByIdFresh(roomId), null)
    await repository.loadFromRedis()
    assert.equal(repository.count(), 0)
    // This process uses a DIFFERENT empty local directory: rejection is Redis's marker,
    // not the deleting process's JSON marker or optimistic cache.
    const candidate = waitingRoom()
    await assert.rejects(repository.saveAndWait(candidate), /ROOM_DELETED/)
    assert.equal(await redis.redisClient.exists(ROOM_PREFIX + roomId), 0)
    assert.equal(await redis.redisClient.sismember(ROOM_INDEX, roomId), 0)
    console.log('R28 marker survives kill/restart; different-process/directory stale recreation blocked: PASS')
  } else if (mode === 'admin-close' || mode === 'admin-replay') {
    const command = { roomId: 'admin-durable-fixture', expectedRevision: 1,
      requestId: 'd3b502d9-3dd9-43ca-86d5-f44f4cbb21d1', reason: 'operator-request' }
    let notifications = 0
    if (mode === 'admin-close') {
      await repository.saveAndWait({ ...waitingRoom(), id: command.roomId })
      const room = await repository.findByIdFresh(command.roomId)
      assert.equal(room.revision, 1)
      await assert.rejects(closeAdminRoom(repository, { ...command, expectedRevision: 0 }, () => true, () => notifications++), /ROOM_CLOSE_CONFLICT/)
      assert.equal(await redis.redisClient.exists(ROOM_TOMBSTONE_PREFIX + command.roomId), 0)
      assert.deepEqual(await closeAdminRoom(repository, command, () => true, () => notifications++), { success: true, replayed: false })
      assert.equal(notifications, 1)
    }
    assert.equal(await redis.redisClient.exists(ROOM_PREFIX + command.roomId), 0)
    assert.equal(await redis.redisClient.sismember(ROOM_INDEX, command.roomId), 0)
    const marker = JSON.parse(await redis.redisClient.get(ROOM_TOMBSTONE_PREFIX + command.roomId))
    assert.deepEqual(marker.adminAudit, { ...command, version: 'admin-close/v1', actor: 'emcoincloud@gmail.com', committedAt: marker.deletedAt })
    assert.equal(marker.expiresAt - marker.deletedAt, BACKUP_RETENTION_MS)
    assert(!/players|responses|coins|session|Fixture/.test(JSON.stringify(marker)))
    assert.deepEqual(await closeAdminRoom(repository, command, () => true, () => notifications++), { success: true, replayed: true })
    assert.equal(notifications, mode === 'admin-close' ? 2 : 1)
    await assert.rejects(closeAdminRoom(repository, { ...command, reason: 'safety' }, () => true, () => notifications++), /ROOM_CLOSE_CONFLICT/)
    console.log(`R36 actual Redis atomic audited close/${mode === 'admin-replay' ? 'new-process restart receipt' : 'stale-revision guard and idempotent retry'}: PASS`)
  } else throw new Error(`Unknown worker mode ${mode}`)
}
main().then(() => {
  redis.redisClient.disconnect(); redis.pubClient.disconnect(); redis.subClient.disconnect()
}).catch(error => {
  console.error(error)
  redis.redisClient.disconnect(); redis.pubClient.disconnect(); redis.subClient.disconnect()
  process.exitCode = 1
})
