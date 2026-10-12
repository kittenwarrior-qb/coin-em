import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { Room } from './modules/game/types'
import type { RoomRepository } from './modules/room/repository/RoomRepository'
import { BACKUP_RETENTION_MS, isRoomInactive } from './retention'
import { inRoomQueue } from './socket/roomQueue'
import { operationDiagnostic } from './telemetry/operationalDiagnostics'

export const DATA_DIR = process.env.ROOM_DATA_DIR
  ? path.resolve(process.env.ROOM_DATA_DIR)
  : path.join(__dirname, '../data/rooms')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function roomFilePath(roomId: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(roomId)) throw new Error('INVALID_ROOM_ID')
  return path.join(DATA_DIR, `${roomId}.json`)
}

export const DELETED_BACKUP_DIR = path.join(DATA_DIR, '.deleted-backups')
export const TOMBSTONE_DIR = path.join(DATA_DIR, '.tombstones')

function managedDirectory(directory: string): void {
  if (path.dirname(directory) !== DATA_DIR) throw new Error('UNSAFE_MANAGED_DIRECTORY')
  if (!fs.existsSync(directory)) fs.mkdirSync(directory)
  if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink() ||
      fs.realpathSync(directory) !== directory) throw new Error('UNSAFE_MANAGED_DIRECTORY')
}

function writeAtomic(filename: string, value: unknown): void {
  const temporary = `${filename}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporary, JSON.stringify(value), { encoding: 'utf8', flag: 'wx' })
    fs.renameSync(temporary, filename)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}

export function hasRoomTombstone(roomId: string, now = Date.now()): boolean {
  roomFilePath(roomId) // validates the ID before constructing a marker path
  const filename = path.join(TOMBSTONE_DIR, `${roomId}.json`)
  if (!fs.existsSync(filename)) return false
  managedDirectory(TOMBSTONE_DIR)
  if (!fs.lstatSync(filename).isFile() || fs.lstatSync(filename).isSymbolicLink()) throw new Error('CORRUPT_ROOM_TOMBSTONE')
  const marker = JSON.parse(fs.readFileSync(filename, 'utf8'))
  if (marker?.version !== 'room-deletion/v1' || marker.id !== roomId ||
      !Number.isSafeInteger(marker.deletedAt) || !Number.isSafeInteger(marker.expiresAt) ||
      marker.expiresAt - marker.deletedAt !== BACKUP_RETENTION_MS) throw new Error('CORRUPT_ROOM_TOMBSTONE')
  return marker.expiresAt > now
}

/** After primary deletion: keep only a minimal marker, never archive room content. */
export function recordRoomDeletionStrict(room: Room, deletedAt = Date.now()): void {
  roomFilePath(room.id)
  cancelPendingRoomSave(room.id)
  managedDirectory(TOMBSTONE_DIR)
  const expiresAt = deletedAt + BACKUP_RETENTION_MS
  // Marker first: even an unlink fault must not make a deleted JSON room loadable.
  writeAtomic(path.join(TOMBSTONE_DIR, `${room.id}.json`), { version: 'room-deletion/v1', id: room.id, deletedAt, expiresAt })
  const filename = roomFilePath(room.id)
  if (fs.existsSync(filename)) fs.unlinkSync(filename)
}

/** @deprecated Compatibility name only: no content archive is created. */
export const archiveDeletedRoomStrict = recordRoomDeletionStrict

/** Only generated direct files in the two managed subdirectories, never external backups. */
export function pruneExpiredRoomBackups(now = Date.now()): number {
  let removed = 0
  for (const [directory, version] of [[DELETED_BACKUP_DIR, 'deleted-room-backup/v1'], [TOMBSTONE_DIR, 'room-deletion/v1']]) {
    if (!fs.existsSync(directory)) continue
    managedDirectory(directory)
    for (const name of fs.readdirSync(directory)) {
      if (!name.endsWith('.json')) continue
      const filename = path.join(directory, name)
      if (path.dirname(path.resolve(filename)) !== directory || !fs.lstatSync(filename).isFile() || fs.lstatSync(filename).isSymbolicLink()) throw new Error('UNSAFE_RETENTION_FILE')
      const value = JSON.parse(fs.readFileSync(filename, 'utf8'))
      if (value?.version !== version || !Number.isSafeInteger(value.deletedAt) || !Number.isSafeInteger(value.expiresAt) ||
          value.expiresAt - value.deletedAt !== BACKUP_RETENTION_MS) throw new Error('CORRUPT_RETENTION_METADATA')
      if (version === 'room-deletion/v1') {
        if (name !== `${value.id}.json`) throw new Error('CORRUPT_RETENTION_METADATA')
        const activeFile = roomFilePath(value.id)
        if (fs.existsSync(activeFile)) {
          if (!fs.lstatSync(activeFile).isFile() || fs.lstatSync(activeFile).isSymbolicLink()) throw new Error('UNSAFE_RETENTION_FILE')
          const snapshot = JSON.parse(fs.readFileSync(activeFile, 'utf8'))
          if (snapshot.id !== value.id) throw new Error('CORRUPT_RETENTION_METADATA')
          // Retry a degraded unlink, but never remove a newly created room after marker expiry.
          if (value.expiresAt > now || snapshot.lastActivity <= value.deletedAt) { fs.unlinkSync(activeFile); removed++ }
        }
      }
      if (value.expiresAt <= now) { fs.unlinkSync(filename); removed++ }
    }
  }
  return removed
}

/**
 * Load all rooms from per-room JSON files
 */
export function loadRooms(): Map<string, Room> {
  const rooms = new Map<string, Room>()
  try {
    if (!fs.existsSync(DATA_DIR)) {
      operationDiagnostic('room_recovery', 'ok')
      return rooms
    }
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      try {
        const roomId = file.replace('.json', '')
        const data = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')
        const room = JSON.parse(data) as Room
        if (room?.id !== roomId || hasRoomTombstone(roomId) || isRoomInactive(room)) continue
        rooms.set(roomId, room)
      } catch (err) {
        operationDiagnostic('room_recovery', 'failed')
      }
    }
    operationDiagnostic('room_recovery', 'ok')
  } catch (err) {
    operationDiagnostic('room_recovery', 'failed')
  }
  return rooms
}

/**
 * Save a single room to its own file
 */
export function saveRoom(room: Room): void {
  try {
    saveRoomStrict(room)
  } catch (err) {
    operationDiagnostic('room_commit', 'failed')
  }
}

export function saveRoomStrict(room: Room): void {
  if (hasRoomTombstone(room.id)) throw new Error('ROOM_DELETED')
  if (isRoomInactive(room)) throw new Error('ROOM_EXPIRED')
  const filePath = roomFilePath(room.id)
  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(room, null, 2), 'utf-8')
  fs.renameSync(tmpPath, filePath)
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
  cancelPendingRoomSave(roomId)
  try {
    const filePath = roomFilePath(roomId)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    operationDiagnostic('room_delete', 'failed')
  }
}

/**
 * Auto-save a single room with debounce per room
 */
const saveTimeouts = new Map<string, NodeJS.Timeout>()

/** Cancel delayed writes before a test fixture or server is disposed. */
export function cancelPendingRoomSaves(): void {
  for (const timer of saveTimeouts.values()) clearTimeout(timer)
  saveTimeouts.clear()
}

export function cancelPendingRoomSave(roomId: string): void {
  const timer = saveTimeouts.get(roomId)
  if (timer) clearTimeout(timer)
  saveTimeouts.delete(roomId)
}

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
export async function cleanupRooms(repository: RoomRepository, now = Date.now()): Promise<string[]> {
  const deleted: string[] = []
  const results = await Promise.allSettled(repository.findAll().map(candidate => inRoomQueue(candidate.id, async () => {
    const room = await repository.findByIdFresh(candidate.id)
    if (!room || !isRoomInactive(room, now)) return
    if (await repository.deleteAndWait(room.id, now)) deleted.push(room.id)
  })))
  if (results.some(result => result.status === 'rejected')) operationDiagnostic('room_cleanup', 'failed')
  try { pruneExpiredRoomBackups(now) }
  catch { operationDiagnostic('room_cleanup', 'failed') }
  return deleted
}
