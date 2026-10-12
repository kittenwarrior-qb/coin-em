import { ADMIN_EMAIL } from './AdminAuth'
import type { RoomRepository } from '../modules/room/repository/RoomRepository'
import { inRoomQueue } from '../socket/roomQueue'
import { operationDiagnostic } from '../telemetry/operationalDiagnostics'

export const ADMIN_CLOSE_REASONS = ['operator-request', 'stuck-room', 'safety'] as const
export interface AdminCloseCommand {
  roomId: string; expectedRevision: number; requestId: string
  reason: typeof ADMIN_CLOSE_REASONS[number]
}
export interface AdminCloseAudit extends AdminCloseCommand {
  version: 'admin-close/v1'; actor: typeof ADMIN_EMAIL; committedAt: number
}

export function validAdminClose(value: unknown): value is AdminCloseCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const command = value as Record<string, unknown>
  return Object.keys(command).length === 4 &&
    typeof command.roomId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(command.roomId) &&
    Number.isSafeInteger(command.expectedRevision) && (command.expectedRevision as number) >= 0 &&
    typeof command.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(command.requestId) &&
    typeof command.reason === 'string' && (ADMIN_CLOSE_REASONS as readonly string[]).includes(command.reason)
}

/** Revalidate the cookie after queue admission: logout/relogin may happen while waiting. */
export function closeAdminRoom(repository: RoomRepository, command: AdminCloseCommand,
  authorized: () => boolean, notify: (roomId: string) => void) {
  return inRoomQueue(command.roomId, async () => {
    if (!authorized()) throw new Error('ADMIN_AUTH_REQUIRED')
    if (!validAdminClose(command)) throw new Error('INVALID_CLOSE_REQUEST')
    await repository.findByIdFresh(command.roomId)
    if (!authorized()) throw new Error('ADMIN_AUTH_REQUIRED')
    const result = await repository.closeWithAuditAndWait(command)
    // Notification is best-effort after the durable commit, never a deletion rollback.
    // Replay can repair a commit followed by ACK/notification loss. Terminal
    // recipients must scope the existing event by room ID; delivery is not exactly-once.
    try { notify(command.roomId) } catch { operationDiagnostic('room_delivery', 'degraded') }
    return result
  })
}
