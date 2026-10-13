import { adminRequest, AdminRequestError } from './client'

export interface TrafficTotals { visitors: number; views: number; rooms: number; games: number }
export type TrafficMetric = keyof TrafficTotals
export interface TrafficRow { label: string; count: number }
export interface TrafficReport {
  days: number; from: string; to: string; hasData: boolean
  totals: TrafficTotals; previous: TrafficTotals
  daily: ({ day: string } & TrafficTotals)[]
  pages: TrafficRow[]; sources: TrafficRow[]; devices: TrafficRow[]
}
export interface SystemInfo {
  process: { uptimeSeconds: number; memoryBytes: number; node: string; environment: 'production' | 'development' }
  catalog: { bytes: number; cards: number; archived: number; revision: number; snapshots: number; activeVersion: string | null } | null
  rooms: { mode: 'redis' | 'file'; connected: boolean; total: number; waiting: number; playing: number; ended: number; retentionMinutes: number }
  traffic: { bytes: number; rows: number; firstDay: string | null; retentionDays: number; visitorHashDays: number } | null
}
export const TRAFFIC_RANGES = [7, 30, 90] as const
export type TrafficRange = typeof TRAFFIC_RANGES[number]

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0
const day = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const invalid = () => new AdminRequestError(502)

function totals(value: unknown): TrafficTotals {
  if (!object(value) || !count(value.visitors) || !count(value.views) || !count(value.rooms) || !count(value.games)) throw invalid()
  return { visitors: value.visitors, views: value.views, rooms: value.rooms, games: value.games }
}
function rows(value: unknown, limit: number): TrafficRow[] {
  if (!Array.isArray(value) || value.length > limit) throw invalid()
  return value.map(row => {
    if (!object(row) || typeof row.label !== 'string' || !row.label || row.label.length > 200 || !count(row.count)) throw invalid()
    return { label: row.label, count: row.count }
  })
}

/** Keep only the approved daily aggregates, even if a future server adds fields. */
export function parseTrafficReport(value: unknown): TrafficReport {
  if (!object(value) || value.version !== 'traffic/v1' || !(TRAFFIC_RANGES as readonly unknown[]).includes(value.days) ||
      !day(value.from) || !day(value.to) || typeof value.hasData !== 'boolean' ||
      !Array.isArray(value.daily) || value.daily.length !== value.days) throw invalid()
  return { days: value.days as number, from: value.from, to: value.to, hasData: value.hasData,
    totals: totals(value.totals), previous: totals(value.previous),
    daily: value.daily.map(item => { if (!object(item) || !day(item.day)) throw invalid(); return { day: item.day, ...totals(item) } }),
    pages: rows(value.pages, 10), sources: rows(value.sources, 8), devices: rows(value.devices, 3) }
}

export function parseSystemInfo(value: unknown): SystemInfo {
  if (!object(value) || value.version !== 'system/v1' || !object(value.process) || !object(value.rooms) || !object(value.catalog) || !object(value.traffic)) throw invalid()
  const { process, rooms, catalog, traffic } = value as Record<string, Record<string, unknown>>
  if (!count(process.uptimeSeconds) || !count(process.memoryBytes) || typeof process.node !== 'string' || process.node.length > 32 ||
      (process.environment !== 'production' && process.environment !== 'development') ||
      (rooms.mode !== 'redis' && rooms.mode !== 'file') || typeof rooms.connected !== 'boolean' ||
      !count(rooms.total) || !count(rooms.waiting) || !count(rooms.playing) || !count(rooms.ended) || !count(rooms.retentionMinutes)) throw invalid()
  if (catalog.available === true && (!count(catalog.bytes) || !count(catalog.cards) || !count(catalog.archived) || !count(catalog.revision) || !count(catalog.snapshots) ||
      (catalog.activeVersion !== null && (typeof catalog.activeVersion !== 'string' || !/^catalog-[a-f0-9]{1,64}$/.test(catalog.activeVersion))))) throw invalid()
  if (traffic.available === true && (!count(traffic.bytes) || !count(traffic.rows) || (traffic.firstDay !== null && !day(traffic.firstDay)) ||
      !count(traffic.retentionDays) || !count(traffic.visitorHashDays))) throw invalid()
  return {
    process: { uptimeSeconds: process.uptimeSeconds, memoryBytes: process.memoryBytes, node: process.node, environment: process.environment },
    catalog: catalog.available === true ? { bytes: catalog.bytes as number, cards: catalog.cards as number, archived: catalog.archived as number,
      revision: catalog.revision as number, snapshots: catalog.snapshots as number, activeVersion: catalog.activeVersion as string | null } : null,
    rooms: { mode: rooms.mode, connected: rooms.connected, total: rooms.total, waiting: rooms.waiting, playing: rooms.playing, ended: rooms.ended, retentionMinutes: rooms.retentionMinutes },
    traffic: traffic.available === true ? { bytes: traffic.bytes as number, rows: traffic.rows as number, firstDay: traffic.firstDay as string | null,
      retentionDays: traffic.retentionDays as number, visitorHashDays: traffic.visitorHashDays as number } : null,
  }
}

export const insightsClient = {
  traffic: async (days: TrafficRange, signal: AbortSignal) => parseTrafficReport(await adminRequest(`/traffic?days=${days}`, signal)),
  system: async (signal: AbortSignal) => parseSystemInfo(await adminRequest('/system', signal)),
}
