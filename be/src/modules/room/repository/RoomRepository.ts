import { Room, Player } from '../../game/types'
import { loadRooms, autoSave } from '../../../persistence'

export class RoomRepository {
  private rooms: Map<string, Room>

  constructor() {
    // Load rooms from disk on startup
    this.rooms = loadRooms()
  }

  /**
   * Find room by ID
   */
  findById(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }

  /**
   * Find room by socket ID
   */
  findBySocketId(socketId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.players.find((p) => p.socketId === socketId)) {
        return room
      }
    }
    return null
  }

  /**
   * Find room by user ID
   */
  findByUserId(userId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.players.find((p) => p.userId === userId)) {
        return room
      }
    }
    return null
  }

  /**
   * Get all rooms
   */
  findAll(): Room[] {
    return Array.from(this.rooms.values())
  }

  /**
   * Save room (with auto-persist)
   */
  save(room: Room): void {
    this.rooms.set(room.id, room)
    autoSave(this.rooms) // Debounced write to disk
  }

  /**
   * Update room (with auto-persist)
   */
  update(roomId: string, updates: Partial<Room>): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const updated = { ...room, ...updates, lastActivity: Date.now() }
    this.rooms.set(roomId, updated)
    autoSave(this.rooms) // Debounced write to disk
    return updated
  }

  /**
   * Delete room (with auto-persist)
   */
  delete(roomId: string): boolean {
    const result = this.rooms.delete(roomId)
    if (result) {
      autoSave(this.rooms) // Debounced write to disk
    }
    return result
  }

  /**
   * Get room count
   */
  count(): number {
    return this.rooms.size
  }

  /**
   * Clear all rooms (for testing)
   */
  clear(): void {
    this.rooms.clear()
  }

  /**
   * Load rooms from data (for persistence)
   */
  load(data: Map<string, Room>): void {
    this.rooms = data
  }

  /**
   * Get raw map (for persistence)
   */
  getRawMap(): Map<string, Room> {
    return this.rooms
  }
}

// Singleton instance
export const roomRepository = new RoomRepository()
