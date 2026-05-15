import { Room } from '../../game/types'
import { redisClient, redisAvailable as getRedisAvailable } from '../../../redis'
import { autoSaveRoom } from '../../../persistence'

// Helper to get live redisAvailable value (avoids stale primitive import)
import * as redisModule from '../../../redis'
const isRedisAvailable = () => redisModule.redisAvailable

const ROOM_PREFIX = 'room:'
const ROOM_INDEX = 'rooms:index'

function roomKey(roomId: string): string {
  return `${ROOM_PREFIX}${roomId}`
}

export class RoomRepository {
  private cache: Map<string, Room> = new Map()

  private async redisSave(room: Room): Promise<void> {
    if (!isRedisAvailable()) return
    try {
      await Promise.all([
        redisClient.set(roomKey(room.id), JSON.stringify(room)),
        redisClient.sadd(ROOM_INDEX, room.id),
      ])
      console.log(`[RoomRepository] Saved room ${room.id} to Redis (status: ${room.status}, players: ${room.players.length})`)
    } catch (err) {
      console.error(`[RoomRepository] Redis save error for ${room.id}:`, err)
    }
  }

  private async redisDelete(roomId: string): Promise<void> {
    if (!isRedisAvailable()) return
    try {
      await Promise.all([
        redisClient.del(roomKey(roomId)),
        redisClient.srem(ROOM_INDEX, roomId),
      ])
      console.log(`[RoomRepository] Deleted room ${roomId} from Redis`)
    } catch (err) {
      console.error(`[RoomRepository] Redis delete error for ${roomId}:`, err)
    }
  }

  async loadFromRedis(): Promise<void> {
    try {
      const ids = await redisClient.smembers(ROOM_INDEX)
      console.log(`[RoomRepository] Found ${ids.length} room ID(s) in Redis index`)
      if (ids.length === 0) return

      const pipeline = redisClient.pipeline()
      ids.forEach((id) => pipeline.get(roomKey(id)))
      const results = await pipeline.exec()

      let loaded = 0
      let corrupted = 0
      let missing = 0
      const orphanedIds: string[] = []
      
      results?.forEach((result, index) => {
        const [err, value] = result
        const roomId = ids[index]
        
        if (!err && typeof value === 'string') {
          try {
            const room = JSON.parse(value) as Room
            this.cache.set(room.id, room)
            loaded++
          } catch {
            corrupted++
            console.warn(`[RoomRepository] Corrupted room data for ${roomId}`)
            orphanedIds.push(roomId)
          }
        } else if (err) {
          console.error(`[RoomRepository] Redis error loading ${roomId}:`, err)
        } else {
          missing++
          console.warn(`[RoomRepository] Room ${roomId} in index but data missing`)
          orphanedIds.push(roomId)
        }
      })

      // Clean up orphaned index entries
      if (orphanedIds.length > 0) {
        console.log(`[RoomRepository] Cleaning up ${orphanedIds.length} orphaned index entries`)
        await redisClient.srem(ROOM_INDEX, ...orphanedIds)
      }

      console.log(`[RoomRepository] Loaded ${loaded} room(s) from Redis (${corrupted} corrupted, ${missing} missing)`)
    } catch (err) {
      console.error('[RoomRepository] Failed to load from Redis:', err)
    }
  }

  findById(roomId: string): Room | null {
    return this.cache.get(roomId) ?? null
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
    this.cache.set(room.id, room)
    void this.redisSave(room)
    // Always save to JSON as backup, even when Redis is available
    autoSaveRoom(room)
  }

  update(roomId: string, updates: Partial<Room>): Room | null {
    const room = this.cache.get(roomId)
    if (!room) return null
    const updated = { ...room, ...updates, lastActivity: Date.now() }
    this.cache.set(roomId, updated)
    void this.redisSave(updated)
    // Always save to JSON as backup, even when Redis is available
    autoSaveRoom(updated)
    return updated
  }

  delete(roomId: string): boolean {
    const existed = this.cache.delete(roomId)
    if (existed) void this.redisDelete(roomId)
    return existed
  }

  count(): number {
    return this.cache.size
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
