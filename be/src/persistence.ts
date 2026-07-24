import fs from 'fs'
import path from 'path'
import { Room } from './modules/game/types'
import { redisClient } from './redis'

const ROOM_PREFIX = 'room:'
const ROOM_INDEX = 'rooms:index'

export const DATA_DIR = path.join(__dirname, '../data/rooms')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function roomFilePath(roomId: string): string {
  return path.join(DATA_DIR, `${roomId}.json`)
}

/**
 * Load all rooms from per-room JSON files
 */
export function loadRooms(): Map<string, Room> {
  const rooms = new Map<string, Room>()
  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log('[Persistence] No saved rooms found, starting fresh')
      return rooms
    }
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      try {
        const roomId = file.replace('.json', '')
        const data = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')
        const room = JSON.parse(data) as Room
        rooms.set(roomId, room)
      } catch (err) {
        console.error(`[Persistence] Error loading room file ${file}:`, err)
      }
    }
    console.log(`[Persistence] Loaded ${rooms.size} room(s) from disk`)
  } catch (err) {
    console.error('[Persistence] Error reading data directory:', err)
  }
  return rooms
}

/**
 * Save a single room to its own file
 */
export function saveRoom(room: Room): void {
  try {
    const filePath = roomFilePath(room.id)
    const tmpPath = filePath + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(room, null, 2), 'utf-8')
    fs.renameSync(tmpPath, filePath)
  } catch (err) {
    console.error(`[Persistence] Error saving room ${room.id}:`, err)
  }
}

/**
 * Save all rooms (used by cleanup)
 */
export function saveRooms(rooms: Map<string, Room>): void {
  for (const room of rooms.values()) {
    saveRoom(room)
  }
}

/**
 * Delete a room file from disk
 */
export function deleteRoomFile(roomId: string): void {
  try {
    const filePath = roomFilePath(roomId)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.error(`[Persistence] Error deleting room file ${roomId}:`, err)
  }
}

/**
 * Auto-save a single room with debounce per room
 */
const saveTimeouts = new Map<string, NodeJS.Timeout>()

export function autoSave(rooms: Map<string, Room>): void {
  // Legacy: debounce-save all dirty rooms — kept for compatibility
  // Prefer autoSaveRoom for per-room saves
  for (const room of rooms.values()) {
    autoSaveRoom(room)
  }
}

export function autoSaveRoom(room: Room): void {
  const existing = saveTimeouts.get(room.id)
  if (existing) clearTimeout(existing)
  saveTimeouts.set(
    room.id,
    setTimeout(() => {
      saveRoom(room)
      saveTimeouts.delete(room.id)
    }, 3000), // 3s debounce
  )
}

/**
 * Clean up old/empty rooms (run periodically)
 */
export async function cleanupRooms(rooms: Map<string, Room>): Promise<void> {
  const now = Date.now()
  const MAX_AGE = 24 * 60 * 60 * 1000
  const MAX_AGE_FAKE = 2 * 60 * 60 * 1000

  const toDelete: string[] = []

  for (const [roomId, room] of rooms.entries()) {
    if (room.players.length === 0) {
      toDelete.push(roomId)
      console.log(`[Cleanup] Marking empty room for deletion: ${roomId}`)
      continue
    }

    const hasOnlyFakePlayers = room.players.every((p) => p.isFake)
    const maxAge = hasOnlyFakePlayers ? MAX_AGE_FAKE : MAX_AGE

    if (room.lastActivity && now - room.lastActivity > maxAge) {
      toDelete.push(roomId)
      console.log(`[Cleanup] Marking inactive room for deletion: ${roomId} (last activity: ${new Date(room.lastActivity).toISOString()})`)
    }
  }

  // Delete through repository to ensure Redis sync
  const deletePromises: Promise<any>[] = []
  
  for (const roomId of toDelete) {
    rooms.delete(roomId)
    deleteRoomFile(roomId)
    deletePromises.push(
      redisClient.del(`${ROOM_PREFIX}${roomId}`),
      redisClient.srem(ROOM_INDEX, roomId)
    )
  }

  // Wait for all Redis deletes to complete
  await Promise.allSettled(deletePromises).catch(err =>
    console.error('[Cleanup] Redis delete errors:', err)
  )

  console.log(`[Cleanup] Completed. Deleted ${toDelete.length} room(s). Active rooms: ${rooms.size}`)
}
