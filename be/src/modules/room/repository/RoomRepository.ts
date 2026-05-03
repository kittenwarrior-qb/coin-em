import { Room } from '../../game/types'
import { redisClient, redisAvailable } from '../../../redis'

const ROOM_PREFIX = 'room:'
const ROOM_INDEX = 'rooms:index'

function roomKey(roomId: string): string {
  return `${ROOM_PREFIX}${roomId}`
}

export class RoomRepository {
  private cache: Map<string, Room> = new Map()

  private async redisSave(room: Room): Promise<void> {
    if (!redisAvailable) return
    try {
      await Promise.all([
        redisClient.set(roomKey(room.id), JSON.stringify(room)),
        redisClient.sadd(ROOM_INDEX, room.id),
      ])
    } catch (err) {
      console.error(`[RoomRepository] Redis save error for ${room.id}:`, err)
    }
  }

  private async redisDelete(roomId: string): Promise<void> {
    if (!redisAvailable) return
    try {
      await Promise.all([
        redisClient.del(roomKey(roomId)),
        redisClient.srem(ROOM_INDEX, roomId),
      ])
    } catch (err) {
      console.error(`[RoomRepository] Redis delete error for ${roomId}:`, err)
    }
  }

  async loadFromRedis(): Promise<void> {
    try {
      const ids = await redisClient.smembers(ROOM_INDEX)
      if (ids.length === 0) return

      const pipeline = redisClient.pipeline()
      ids.forEach((id) => pipeline.get(roomKey(id)))
      const results = await pipeline.exec()

      results?.forEach((result) => {
        const [err, value] = result
        if (!err && typeof value === 'string') {
          try {
            const room = JSON.parse(value) as Room
            this.cache.set(room.id, room)
          } catch {
            // skip corrupted entry
          }
        }
      })

      console.log(`[RoomRepository] Loaded ${this.cache.size} room(s) from Redis`)
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
  }

  update(roomId: string, updates: Partial<Room>): Room | null {
    const room = this.cache.get(roomId)
    if (!room) return null
    const updated = { ...room, ...updates, lastActivity: Date.now() }
    this.cache.set(roomId, updated)
    void this.redisSave(updated)
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
