import { adminRequest, AdminRequestError } from './client'

export type ReportStatus = 'open' | 'resolved' | 'dismissed'
export type ReportFilter = ReportStatus | 'all'
export const reportReasons = { harassment: 'Quấy rối', unsafe: 'Không an toàn', privacy: 'Thông tin riêng tư', other: 'Khác' } as const
export const reportStatuses = { open: 'Chờ xử lý', resolved: 'Đã xử lý', dismissed: 'Không cần xử lý' } as const
export interface SafetyReport {
  id: string; roomId: string; reporterId: string; reason: keyof typeof reportReasons
  message: { id: string; senderId: string; senderName: string; text: string; sentAt: number }
  createdAt: number; expiresAt: number; status: ReportStatus; resolvedAt: number | null
}
export interface ReportsPage { version: 'chat-reports/v1'; total: number; reports: SafetyReport[] }
export interface ReportResolution { id: string; status: 'resolved' | 'dismissed'; requestId: string }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const identity = (v: unknown, max = 128): v is string => typeof v === 'string' && new RegExp(`^[A-Za-z0-9_-]{1,${max}}$`).test(v)
const clock = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const invalid = (): never => { throw new AdminRequestError(502) }

/** Allowlist selected evidence only; never retain future private server fields. */
export function parseReports(value: unknown): ReportsPage {
  if (!object(value) || value.version !== 'chat-reports/v1' || !clock(value.total) || value.total > 2000 ||
    !Array.isArray(value.reports) || value.reports.length > 50 || value.reports.length > value.total) return invalid()
  const seen = new Set<string>()
  const reports = value.reports.map((row): SafetyReport => {
    if (!object(row) || !uuid(row.id) || seen.has(row.id) || !identity(row.roomId, 64) || !identity(row.reporterId) ||
      typeof row.reason !== 'string' || !Object.prototype.hasOwnProperty.call(reportReasons, row.reason) ||
      typeof row.status !== 'string' || !Object.prototype.hasOwnProperty.call(reportStatuses, row.status) ||
      !clock(row.createdAt) || !clock(row.expiresAt) || !object(row.message)) return invalid()
    const m = row.message
    if (!uuid(m.id) || !identity(m.senderId) || typeof m.senderName !== 'string' || !m.senderName.trim() || m.senderName.length > 80 ||
      typeof m.text !== 'string' || !m.text.trim() || m.text.length > 500 || [...m.text].some(c => { const n = c.charCodeAt(0); return n === 127 || (n < 32 && n !== 9 && n !== 10 && n !== 13) }) ||
      !clock(m.sentAt) || m.sentAt > row.createdAt || row.expiresAt !== m.sentAt + 7 * 86400000 || row.createdAt >= row.expiresAt ||
      (row.status === 'open' ? row.resolvedAt !== null : !clock(row.resolvedAt) || row.resolvedAt < row.createdAt || row.resolvedAt >= row.expiresAt)) return invalid()
    seen.add(row.id)
    return { id: row.id, roomId: row.roomId, reporterId: row.reporterId, reason: row.reason as SafetyReport['reason'],
      status: row.status as ReportStatus, createdAt: row.createdAt, expiresAt: row.expiresAt, resolvedAt: row.resolvedAt as number | null,
      message: { id: m.id, senderId: m.senderId, senderName: m.senderName, text: m.text, sentAt: m.sentAt } }
  })
  return { version: 'chat-reports/v1', total: value.total, reports }
}
export const reportsClient = {
  list: async (status: ReportFilter, signal: AbortSignal) => parseReports(await adminRequest(`/reports?status=${status}`, signal)),
  resolve: async (command: ReportResolution, signal: AbortSignal) => {
    const result = await adminRequest('/reports/resolve', signal, command)
    if (!object(result) || result.success !== true || typeof result.replayed !== 'boolean') return invalid()
    return { success: true as const, replayed: result.replayed }
  },
}
