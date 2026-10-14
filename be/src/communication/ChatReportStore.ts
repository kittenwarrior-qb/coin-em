import { DatabaseSync } from 'node:sqlite'
import { chmodSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { COMMUNICATION_POLICY, normalizeCommunicationText } from './policy'
import type { RoomChatMessage } from './RoomChat'

export const CHAT_REPORT_REASONS = ['harassment', 'unsafe', 'privacy', 'other'] as const
export type ChatReportReason = typeof CHAT_REPORT_REASONS[number]
export type ChatReportStatus = 'open' | 'resolved' | 'dismissed'
export interface ChatReportInput { requestId: string; roomId: string; reporterId: string; reason: ChatReportReason; message: RoomChatMessage }
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const identity = (value: unknown, max = 128): value is string => typeof value === 'string' && new RegExp(`^[A-Za-z0-9_-]{1,${max}}$`).test(value)
const validClock = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER - COMMUNICATION_POLICY.reportRetentionMs

/** Selected evidence only; never a whole room archive. Caller owns authorization. */
export class ChatReportStore {
  private db: DatabaseSync
  constructor(file: string) {
    this.db = new DatabaseSync(file)
    const version = this.db.prepare('PRAGMA user_version').get()!.user_version as number
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
    const expected = 'id|fingerprint|room_id|reporter_id|reason|message|incident|created_at|expires_at|status|resolution_id|resolved_at'
    const columns = this.db.prepare('PRAGMA table_info(chat_report)').all().map(column => column.name).join('|')
    if (![0, 1].includes(version) || tables.some(table => table.name !== 'chat_report') || (columns && columns !== expected)) {
      this.db.close(); throw Error('CHAT_REPORT_SCHEMA_MISMATCH')
    }
    if (file !== ':memory:') chmodSync(file, 0o600)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS chat_report (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, room_id TEXT NOT NULL,
        reporter_id TEXT NOT NULL, reason TEXT NOT NULL, message TEXT NOT NULL, incident TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, status TEXT NOT NULL,
        resolution_id TEXT, resolved_at INTEGER);
      CREATE INDEX IF NOT EXISTS chat_report_expiry ON chat_report(expires_at);
      PRAGMA user_version=1;`)
  }
  prune(now = Date.now()): void {
    if (!validClock(now)) throw Error('INVALID_REPORT_CLOCK')
    this.db.prepare('DELETE FROM chat_report WHERE expires_at<=?').run(now)
  }
  isAvailable(now = Date.now()): boolean {
    try {
      this.prune(now)
      return (this.db.prepare('SELECT count(*) AS total FROM chat_report').get()!.total as number) < 2000
    } catch { return false }
  }
  submit(input: ChatReportInput, now = Date.now()) {
    const message = input?.message
    if (!validClock(now) || !message || !validClock(message.sentAt) || message.sentAt > now || !uuid(input.requestId) || !uuid(message.id) ||
        !identity(input.roomId, 64) || !identity(input.reporterId) || !identity(message.senderId) ||
        typeof message.senderName !== 'string' || !message.senderName.trim() || message.senderName.length > 80 ||
        typeof message.text !== 'string' || !(CHAT_REPORT_REASONS as readonly unknown[]).includes(input.reason) || normalizeCommunicationText(message.text) !== message.text) throw Error('INVALID_CHAT_REPORT')
    // Anchor expiry to the server-authored message timestamp: replay cannot resurrect expired evidence.
    const expiresAt = message.sentAt + COMMUNICATION_POLICY.reportRetentionMs
    if (expiresAt <= now) { this.prune(now); throw Error('REPORT_EXPIRED') }
    this.prune(now)
    const serialized = JSON.stringify({ id: message.id, senderId: message.senderId, senderName: message.senderName, text: message.text, sentAt: message.sentAt })
    const fingerprint = createHash('sha256').update(JSON.stringify([input.roomId, input.reporterId, input.reason, serialized])).digest('hex')
    const incident = createHash('sha256').update(JSON.stringify([input.roomId, input.reporterId, message.id])).digest('hex')
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const old = this.db.prepare('SELECT fingerprint FROM chat_report WHERE id=?').get(input.requestId)
      if (old) {
        if (old.fingerprint !== fingerprint) throw Error('REPORT_REQUEST_CONFLICT')
        this.db.exec('COMMIT'); return { success: true as const, id: input.requestId, replayed: true }
      }
      const existingIncident = this.db.prepare('SELECT id FROM chat_report WHERE incident=?').get(incident)
      if (existingIncident) { this.db.exec('COMMIT'); return { success: true as const, id: existingIncident.id as string, replayed: true } }
      const recent = this.db.prepare('SELECT count(*) AS total FROM chat_report WHERE reporter_id=? AND created_at>?').get(input.reporterId, now - 60_000)!.total as number
      if (recent >= 5) throw Error('REPORT_RATE_LIMITED')
      const count = this.db.prepare('SELECT count(*) AS total FROM chat_report').get()!.total as number
      if (count >= 2000) throw Error('REPORT_CAPACITY_REACHED')
      this.db.prepare('INSERT INTO chat_report(id,fingerprint,room_id,reporter_id,reason,message,incident,created_at,expires_at,status) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(input.requestId, fingerprint, input.roomId, input.reporterId, input.reason, serialized, incident, now, expiresAt, 'open')
      this.db.exec('COMMIT'); return { success: true as const, id: input.requestId, replayed: false }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  list(status: 'all' | ChatReportStatus = 'open', now = Date.now()) {
    if (!['all', 'open', 'resolved', 'dismissed'].includes(status)) throw Error('INVALID_REPORT_STATUS')
    this.prune(now)
    const rows = this.db.prepare('SELECT id,room_id,reporter_id,reason,message,created_at,expires_at,status,resolved_at FROM chat_report WHERE (? = ? OR status = ?) ORDER BY created_at DESC,id LIMIT 50')
      .all(status, 'all', status)
    const total = this.db.prepare('SELECT count(*) AS total FROM chat_report WHERE (? = ? OR status = ?)').get(status, 'all', status)!.total as number
    return { version: 'chat-reports/v1' as const, total, reports: rows.map(row => ({ id: row.id as string, roomId: row.room_id as string,
      reporterId: row.reporter_id as string, reason: row.reason as ChatReportReason, message: JSON.parse(row.message as string) as RoomChatMessage,
      createdAt: row.created_at as number, expiresAt: row.expires_at as number, status: row.status as ChatReportStatus, resolvedAt: row.resolved_at as number | null })) }
  }
  resolve(id: unknown, status: unknown, requestId: unknown, now = Date.now()) {
    if (!uuid(id) || !uuid(requestId) || (status !== 'resolved' && status !== 'dismissed')) throw Error('INVALID_REPORT_RESOLUTION')
    this.prune(now)
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const used = this.db.prepare('SELECT id FROM chat_report WHERE resolution_id=?').get(requestId)
      if (used && used.id !== id) throw Error('REPORT_REQUEST_CONFLICT')
      const row = this.db.prepare('SELECT status,resolution_id FROM chat_report WHERE id=?').get(id)
      if (!row) throw Error('REPORT_NOT_FOUND')
      if (row.status !== 'open') {
        if (row.status !== status || row.resolution_id !== requestId) throw Error('REPORT_STATUS_CONFLICT')
        this.db.exec('COMMIT'); return { success: true as const, replayed: true }
      }
      this.db.prepare('UPDATE chat_report SET status=?,resolution_id=?,resolved_at=? WHERE id=?').run(status, requestId, now, id)
      this.db.exec('COMMIT'); return { success: true as const, replayed: false }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  close(): void { this.db.close() }
}
