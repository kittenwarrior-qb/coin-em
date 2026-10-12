import { Room } from '../../game/types'
import { redisClient, redisAvailable as getRedisAvailable } from '../../../redis'
import { autoSaveRoom, saveRoomStrict, cancelPendingRoomSave, recordRoomDeletionStrict, hasRoomTombstone } from '../../../persistence'
import { BACKUP_RETENTION_MS, ROOM_INACTIVITY_MS, isRoomInactive } from '../../../retention'

// Helper to get live redisAvailable value (avoids stale primitive import)
import * as redisModule from '../../../redis'
const isRedisAvailable = () => redisModule.redisAvailable

import { ROOM_PREFIX, ROOM_INDEX, ROOM_TOMBSTONE_PREFIX } from '../../../storageKeys'
import { ADMIN_EMAIL } from '../../../admin/AdminAuth'
import { validAdminClose, type AdminCloseCommand, type AdminCloseAudit } from '../../../admin/closeRoom'
import { operationDiagnostic } from '../../../telemetry/operationalDiagnostics'

function roomKey(roomId: string): string {
  return `${ROOM_PREFIX}${roomId}`
}

// Snapshot, nested receipt/coin ledger and index commit in one Redis operation.
const COMMIT_ROOM = `
-- room-commit/v1
if redis.call('EXISTS', KEYS[3]) == 1 then return redis.error_reply('ROOM_DELETED') end
local current = redis.call('GET', KEYS[1])
local revision = 0
if current then
  local ok, decoded = pcall(cjson.decode, current)
  if not ok or decoded.id ~= ARGV[3] then return redis.error_reply('CORRUPT_ROOM') end
  revision = tonumber(decoded.revision) or 0
end
if revision ~= tonumber(ARGV[1]) then return {0, revision} end
local indexType = redis.call('TYPE', KEYS[2]).ok
if indexType ~= 'none' and indexType ~= 'set' then return redis.error_reply('CORRUPT_ROOM_INDEX') end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SADD', KEYS[2], ARGV[3])
return {1, tonumber(ARGV[4])}
`

const DELETE_ROOM = `
-- room-delete/v1
local current = redis.call('GET', KEYS[1])
if not current then return {0, ''} end
local ok, decoded = pcall(cjson.decode, current)
if not ok or decoded.id ~= ARGV[1] then return redis.error_reply('CORRUPT_ROOM') end
local revision = tonumber(decoded.revision) or 0
if revision ~= tonumber(ARGV[2]) then return {0, ''} end
if ARGV[3] ~= '' then
  local activity = tonumber(decoded.lastActivity)
  if not activity or activity > tonumber(ARGV[3]) then return {0, ''} end
end
local indexType = redis.call('TYPE', KEYS[2]).ok
if indexType ~= 'none' and indexType ~= 'set' then return redis.error_reply('CORRUPT_ROOM_INDEX') end
redis.call('SET', KEYS[3], ARGV[4], 'PX', ARGV[5])
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[1])
return {1, current}
`

export class RoomRepository {
  private cache: Map<string, Room> = new Map()
  private writes = new Map<string, Promise<void>>()

  private queueWrite(roomId: string, operation: () => Promise<void>): Promise<void> {
    const previous = this.writes.get(roomId) ?? Promise.resolve()
    const pending = previous.catch(() => {}).then(operation)
    this.writes.set(roomId, pending)
    const release = () => { if (this.writes.get(roomId) === pending) this.writes.delete(roomId) }
    void pending.then(release, release)
    return pending
  }

  private async redisSave(room: Room, strict = false): Promise<void> {
    if (hasRoomTombstone(room.id)) throw new Error('ROOM_DELETED')
    if (isRoomInactive(room)) throw new Error('ROOM_EXPIRED')
    if (!isRedisAvailable()) {
      if (process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required') throw new Error('PRIMARY_STORAGE_UNAVAILABLE')
      return
    }
    try {
      {
        const expected = room.revision ?? 0
        if (!Number.isSafeInteger(expected) || expected < 0) throw new Error('INVALID_ROOM_REVISION')
        // Compatibility lobby/profile writes preserve the current revision but still
        // cannot overwrite a newer gameplay commit. Critical commits increment it.
        const snapshot = { ...room, revision: expected + (strict ? 1 : 0) }
        const result = await redisClient.eval(COMMIT_ROOM, 3, roomKey(room.id), ROOM_INDEX, ROOM_TOMBSTONE_PREFIX + room.id, expected, JSON.stringify(snapshot), room.id, snapshot.revision) as [number, number]
        if (!Array.isArray(result) || result[0] !== 1) throw new Error('ROOM_REVISION_CONFLICT')
        room.revision = snapshot.revision
        return
      }
    } catch (err) {
      operationDiagnostic('room_commit', 'failed')
      throw err
    }
  }

  async loadFromRedis(): Promise<void> {
    const required = process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required'
    try {
      let ids: string[] = []
      
      // Try to get room IDs from index
      try {
        ids = await redisClient.smembers(ROOM_INDEX)
        operationDiagnostic('room_recovery', 'ok')
      } catch (indexErr: any) {
        if (required) throw indexErr
        operationDiagnostic('room_recovery', 'fallback')
        // Fallback: scan for room keys directly
        const keys = await redisClient.keys(`${ROOM_PREFIX}*`)
        ids = keys.map(key => key.replace(ROOM_PREFIX, ''))
        operationDiagnostic('room_recovery', 'ok')
      }
      
      if (ids.length === 0) {
        if (required) this.cache.clear()
        return
      }

      const pipeline = redisClient.pipeline()
      ids.forEach((id) => pipeline.get(roomKey(id)))
      const results = await pipeline.exec()
      if (!results || results.length !== ids.length) throw new Error('INCOMPLETE_ROOM_RECOVERY')
      const markers = await Promise.all(ids.map(id => redisClient.get(ROOM_TOMBSTONE_PREFIX + id)))
      const recovered = new Map<string, Room>()

      let loaded = 0
      let corrupted = 0
      let missing = 0
      const orphanedIds: string[] = []
      
      results?.forEach((result, index) => {
        const [err, value] = result
        const roomId = ids[index]
        if (markers[index] !== null || hasRoomTombstone(roomId)) { this.cache.delete(roomId); return }
        
        if (!err && typeof value === 'string') {
          try {
            const room = JSON.parse(value) as Room
            if (!room || room.id !== roomId || !Array.isArray(room.players) || !['waiting', 'playing', 'ended'].includes(room.status)) throw new Error('INVALID_ROOM_SNAPSHOT')
            recovered.set(room.id, room)
            loaded++
          } catch {
            corrupted++
            operationDiagnostic('room_recovery', 'rejected')
            orphanedIds.push(roomId)
          }
        } else if (err) {
          operationDiagnostic('room_recovery', 'failed')
          corrupted++
        } else {
          missing++
          operationDiagnostic('room_recovery', 'rejected')
          orphanedIds.push(roomId)
        }
      })

      if (required && (corrupted || missing)) throw new Error('ROOM_RECOVERY_REQUIRES_OPERATOR_REVIEW')
      for (const [id, room] of recovered) this.cache.set(id, room)

      // Clean up orphaned index entries
      if (orphanedIds.length > 0) {
        operationDiagnostic('room_recovery', 'ok')
        await redisClient.srem(ROOM_INDEX, ...orphanedIds)
      }

      operationDiagnostic('room_recovery', 'ok')
    } catch (err) {
      operationDiagnostic('room_recovery', 'failed')
      if (required) throw err
    }
  }

  findById(roomId: string): Room | null {
    return this.cache.get(roomId) ?? null
  }

  async findByIdFresh(roomId: string): Promise<Room | null> {
    // Admission/profile handlers still use the compatibility save API. Drain their
    // preceding writes before a gameplay command reads the primary snapshot.
    await this.writes.get(roomId)?.catch(() => {})
    const required = process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required'
    if (required && !isRedisAvailable()) throw new Error('PRIMARY_STORAGE_UNAVAILABLE')
    if (isRedisAvailable()) {
      try {
        const value = await redisClient.get(roomKey(roomId))
        if (await redisClient.get(ROOM_TOMBSTONE_PREFIX + roomId) !== null || hasRoomTombstone(roomId)) {
          this.cache.delete(roomId)
          return null
        }
        if (typeof value === 'string') {
          const room = JSON.parse(value) as Room
          if (!room || room.id !== roomId || !Array.isArray(room.players)) throw new Error('INVALID_ROOM_SNAPSHOT')
          this.cache.set(room.id, room)
          return room
        }
        if (required) { this.cache.delete(roomId); return null }
      } catch (err) {
        operationDiagnostic('room_read', 'failed')
        if (required) throw err
      }
    }

    if (hasRoomTombstone(roomId)) { this.cache.delete(roomId); return null }

    return this.findById(roomId)
  }

  findBySocketId(socketId: string): Room | null {
    for (const room of this.cache.values()) {
      if (room.players.find((p) => p.socketId === socketId)) return room
    }
    return null
  }

  findByUserId(userId: string): Room | null {
    for (const room of this.cache.values()) {
      if (room.players.find((p) => p.userId === userId)) return room
    }
    return null
  }

  findAll(): Room[] {
    return Array.from(this.cache.values())
  }

  save(room: Room): void {
    if (hasRoomTombstone(room.id) || isRoomInactive(room)) throw new Error('ROOM_DELETED_OR_EXPIRED')
    this.cache.set(room.id, room)
    // Fire and forget Redis save, but log if it fails
    this.queueWrite(room.id, async () => {
      await this.redisSave(room)
      autoSaveRoom(room)
    }).catch(err =>
      operationDiagnostic('room_commit', 'failed')
    )
  }

  async saveAndWait(room: Room): Promise<void> {
    cancelPendingRoomSave(room.id)
    await this.queueWrite(room.id, async () => {
      cancelPendingRoomSave(room.id)
      if (isRedisAvailable()) {
        // Redis is the existing primary store. Once committed, a JSON backup failure
        // must not report the business action as rejected and invite double spending.
        await this.redisSave(room, true)
        this.cache.set(room.id, room)
        try { saveRoomStrict(room) }
        catch { operationDiagnostic('room_commit', 'degraded') }
      } else {
        if (process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required') throw new Error('PRIMARY_STORAGE_UNAVAILABLE')
        saveRoomStrict(room)
        this.cache.set(room.id, room)
      }
    })
  }

  update(roomId: string, updates: Partial<Room>): Room | null {
    if (hasRoomTombstone(roomId)) return null
    const room = this.cache.get(roomId)
    if (!room) return null
    const updated = { ...room, ...updates, lastActivity: Date.now() }
    this.cache.set(roomId, updated)
    // Fire and forget Redis save, but log if it fails
    this.queueWrite(roomId, async () => {
      await this.redisSave(updated)
      autoSaveRoom(updated)
    }).catch(err =>
      operationDiagnostic('room_commit', 'failed')
    )
    return updated
  }

  delete(roomId: string): boolean {
    const existed = this.cache.has(roomId)
    if (existed) {
      // Compatibility callers have no ACK. Runtime cleanup/leave use the awaited API.
      void this.deleteAndWait(roomId).catch(err =>
        operationDiagnostic('room_delete', 'failed')
      )
    }
    return existed
  }

  async deleteAndWait(roomId: string, inactiveAt?: number): Promise<boolean> {
    let deleted = false
    await this.queueWrite(roomId, async () => {
      const room = this.cache.get(roomId)
      if (!room || (inactiveAt !== undefined && !isRoomInactive(room, inactiveAt))) return
      const now = Date.now()
      cancelPendingRoomSave(roomId)
      if (isRedisAvailable()) {
        const marker = { version: 'room-deletion/v1', id: roomId, deletedAt: now, expiresAt: now + BACKUP_RETENTION_MS }
        const result = await redisClient.eval(DELETE_ROOM, 3, roomKey(roomId), ROOM_INDEX, ROOM_TOMBSTONE_PREFIX + roomId,
          roomId, room.revision ?? 0, inactiveAt === undefined ? '' : inactiveAt - ROOM_INACTIVITY_MS,
          JSON.stringify(marker), BACKUP_RETENTION_MS) as [number, string]
        if (!Array.isArray(result) || result[0] !== 1) return
        this.cache.delete(roomId)
        deleted = true
        try { recordRoomDeletionStrict(typeof result[1] === 'string' && result[1] ? JSON.parse(result[1]) : room, now) }
        catch { operationDiagnostic('room_delete', 'degraded') }
      } else {
        if (process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required') throw new Error('PRIMARY_STORAGE_UNAVAILABLE')
        try { recordRoomDeletionStrict(room, now) }
        catch (error) {
          // In JSON-only mode the atomic marker is the deletion commit. A later
          // backup/unlink failure must not report that committed effect as rejected.
          if (!hasRoomTombstone(roomId)) throw error
          operationDiagnostic('room_delete', 'degraded')
        }
        this.cache.delete(roomId)
        deleted = true
      }
    })
    return deleted
  }

  /** Redis-only admin receipt and deletion share the same atomic primary commit. */
  async closeWithAuditAndWait(command: AdminCloseCommand): Promise<{ success: true; replayed: boolean }> {
    if (!validAdminClose(command)) throw new Error('INVALID_CLOSE_REQUEST')
    let replayed = false
    await this.queueWrite(command.roomId, async () => {
      if (!isRedisAvailable()) throw new Error('PRIMARY_STORAGE_UNAVAILABLE')
      const existing = await redisClient.get(ROOM_TOMBSTONE_PREFIX + command.roomId)
      if (existing !== null) {
        const marker = JSON.parse(existing)
        const audit = marker?.adminAudit as AdminCloseAudit | undefined
        if (marker?.version === 'room-deletion/v1' && marker.id === command.roomId &&
            Number.isSafeInteger(marker.deletedAt) && Number.isSafeInteger(marker.expiresAt) &&
            marker.expiresAt - marker.deletedAt === BACKUP_RETENTION_MS && marker.expiresAt > Date.now() &&
            audit?.version === 'admin-close/v1' && audit.actor === ADMIN_EMAIL &&
            audit.committedAt === marker.deletedAt &&
            audit.roomId === command.roomId && audit.requestId === command.requestId &&
            audit.expectedRevision === command.expectedRevision && audit.reason === command.reason) {
          this.cache.delete(command.roomId)
          replayed = true
          return
        }
        throw new Error('ROOM_CLOSE_CONFLICT')
      }
      const room = this.cache.get(command.roomId)
      if (!room) throw new Error('ROOM_NOT_FOUND')
      if ((room.revision ?? 0) !== command.expectedRevision) throw new Error('ROOM_CLOSE_CONFLICT')
      const now = Date.now()
      const adminAudit: AdminCloseAudit = { ...command, version: 'admin-close/v1', actor: ADMIN_EMAIL, committedAt: now }
      const marker = { version: 'room-deletion/v1', id: room.id, deletedAt: now,
        expiresAt: now + BACKUP_RETENTION_MS, adminAudit }
      cancelPendingRoomSave(room.id)
      const result = await redisClient.eval(DELETE_ROOM, 3, roomKey(room.id), ROOM_INDEX,
        ROOM_TOMBSTONE_PREFIX + room.id, room.id, command.expectedRevision, '',
        JSON.stringify(marker), BACKUP_RETENTION_MS) as [number, string]
      if (!Array.isArray(result) || result[0] !== 1) throw new Error('ROOM_CLOSE_CONFLICT')
      this.cache.delete(room.id)
      try { recordRoomDeletionStrict(room, now) }
      catch { operationDiagnostic('room_delete', 'degraded') }
    })
    return { success: true, replayed }
  }

  count(): number {
    return this.cache.size
  }

  async drainWrites(): Promise<void> {
    await Promise.allSettled([...this.writes.values()])
  }

  getRawMap(): Map<string, Room> {
    return this.cache
  }

  clear(): void {
    this.cache.clear()
  }

  load(data: Map<string, Room>): void {
    this.cache = data
  }
}

export const roomRepository = new RoomRepository()
