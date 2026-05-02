import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Room } from './modules/game/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../data/rooms.json')

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

/**
 * Load rooms from disk
 */
export function loadRooms(): Map<string, Room> {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('[Persistence] No saved rooms found, starting fresh')
      return new Map()
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    const rooms = new Map(Object.entries(parsed))
    console.log(`[Persistence] Loaded ${rooms.size} room(s) from disk`)
    return rooms as Map<string, Room>
  } catch (err) {
    console.error('[Persistence] Error loading rooms:', err)
    return new Map()
  }
}

/**
 * Save rooms to disk
 */
export function saveRooms(rooms: Map<string, Room>): void {
  try {
    const obj = Object.fromEntries(rooms)
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8')
    console.log(`[Persistence] Saved ${rooms.size} room(s) to disk`)
  } catch (err) {
    console.error('[Persistence] Error saving rooms:', err)
  }
}

/**
 * Auto-save with debounce
 */
let saveTimeout: NodeJS.Timeout | null = null
export function autoSave(rooms: Map<string, Room>): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveRooms(rooms)
  }, 1000) // Save after 1s of inactivity
}

/**
 * Clean up old/empty rooms (run periodically)
 */
export function cleanupRooms(rooms: Map<string, Room>): void {
  const now = Date.now()
  const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours
  const MAX_AGE_FAKE = 2 * 60 * 60 * 1000 // 2 hours for fake player rooms

  for (const [roomId, room] of rooms.entries()) {
    // Remove empty rooms
    if (room.players.length === 0) {
      rooms.delete(roomId)
      console.log(`[Cleanup] Removed empty room: ${roomId}`)
      continue
    }

    // Check if room has only fake players
    const hasOnlyFakePlayers = room.players.every((p) => p.isFake)
    const maxAge = hasOnlyFakePlayers ? MAX_AGE_FAKE : MAX_AGE

    // Remove old inactive rooms
    if (room.lastActivity && now - room.lastActivity > maxAge) {
      rooms.delete(roomId)
      console.log(
        `[Cleanup] Removed inactive room: ${roomId} (${hasOnlyFakePlayers ? 'fake players only' : 'normal'})`
      )
    }
  }

  saveRooms(rooms)
  console.log(`[Cleanup] Completed. Active rooms: ${rooms.size}`)
}
