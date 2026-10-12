import type { Room } from './modules/game/types'

export const ROOM_INACTIVITY_MS = 60 * 60 * 1000
export const BACKUP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
export const ROOM_CLEANUP_INTERVAL_MS = 60_000

export function isRoomInactive(room: Pick<Room, 'lastActivity'>, now = Date.now()): boolean {
  return Number.isSafeInteger(room.lastActivity) && room.lastActivity >= 0 && now - room.lastActivity >= ROOM_INACTIVITY_MS
}
