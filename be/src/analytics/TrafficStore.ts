import { DatabaseSync } from 'node:sqlite'
import { createHash, randomBytes } from 'node:crypto'
import { cleanPath, dayOf, deviceOf, isBot, lastDays, sourceOf, TRAFFIC_TIME_ZONE } from './trafficRules'

export type TrafficEvent = 'room' | 'game'
export interface TrafficRow { label: string; count: number }
export interface TrafficTotals { visitors: number; views: number; rooms: number; games: number }
export interface TrafficReport {
  version: 'traffic/v1'; days: number; from: string; to: string; timeZone: string
  /** false until the first visit has been counted */
  hasData: boolean
  totals: TrafficTotals
  /** the same number of days just before, for "compared with the previous period" */
  previous: TrafficTotals
  daily: ({ day: string } & TrafficTotals)[]
  pages: TrafficRow[]; sources: TrafficRow[]; devices: TrafficRow[]
}

export const TRAFFIC_RANGES = [7, 30, 90] as const
export const TRAFFIC_KEEP_DAYS = 400
export const TRAFFIC_VISITOR_HASH_DAYS = 2
const MAX_SOURCES_PER_DAY = 60
const OTHER_SOURCE = 'other'

/**
 * Daily totals only: one row per day, kind and key. No cookies, paths outside the public
 * allowlist, room/player identifiers or content. "Who was already counted today" is a salted
 * one-way hash that is deleted after two days and cannot be turned back into an address.
 */
export class TrafficStore {
  private readonly db: DatabaseSync
  private readonly salt: string
  private prunedDay = ''
  constructor(filename: string) {
    this.db = new DatabaseSync(filename)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS traffic_daily (day TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day,kind,key)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS traffic_visitor (day TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY(day,hash)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS traffic_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;`)
    this.db.prepare('INSERT OR IGNORE INTO traffic_meta VALUES(?,?)').run('salt', randomBytes(32).toString('hex'))
    this.salt = this.db.prepare('SELECT value FROM traffic_meta WHERE key=?').get('salt')!.value as string
  }
  close() { this.db.close() }

  private bump(day: string, kind: string, key: string) {
    this.db.prepare('INSERT INTO traffic_daily VALUES(?,?,?,1) ON CONFLICT(day,kind,key) DO UPDATE SET count=count+1').run(day, kind, key)
  }
  private prune(now: Date) {
    const today = dayOf(now)
    if (this.prunedDay === today) return
    this.prunedDay = today
    this.db.prepare('DELETE FROM traffic_daily WHERE day < ?').run(dayOf(new Date(now.getTime() - TRAFFIC_KEEP_DAYS * 864e5)))
    this.db.prepare('DELETE FROM traffic_visitor WHERE day < ?').run(dayOf(new Date(now.getTime() - (TRAFFIC_VISITOR_HASH_DAYS - 1) * 864e5)))
  }

  /** Counts one public page view. Returns false for anything not worth counting. */
  recordView(input: { path: unknown; referrer?: unknown; first?: unknown; address: string; userAgent: string; host?: string }, now = new Date()): boolean {
    const path = cleanPath(input.path)
    if (!path || isBot(input.userAgent)) return false
    const day = dayOf(now)
    this.prune(now)
    this.bump(day, 'view', path)
    const hash = createHash('sha256').update(`${day}|${input.address}|${input.userAgent}|${this.salt}`).digest('hex').slice(0, 32)
    if (this.db.prepare('INSERT OR IGNORE INTO traffic_visitor VALUES(?,?)').run(day, hash).changes > 0) {
      this.bump(day, 'visitor', 'all')
      this.bump(day, 'device', deviceOf(input.userAgent))
    }
    // How they arrived: counted once per visit, on the first page they open.
    if (input.first === true) {
      let source = sourceOf(input.referrer, input.host)
      const known = this.db.prepare('SELECT 1 FROM traffic_daily WHERE day=? AND kind=? AND key=?').get(day, 'source', source)
      // Referrer hosts are caller-supplied: keep the per-day key space bounded.
      if (!known && (this.db.prepare('SELECT count(*) AS total FROM traffic_daily WHERE day=? AND kind=?').get(day, 'source')!.total as number) >= MAX_SOURCES_PER_DAY) source = OTHER_SOURCE
      this.bump(day, 'source', source)
    }
    return true
  }

  /** Server-observed product activity: a room was created or a game started. No identifiers. */
  recordEvent(kind: TrafficEvent, now = new Date()) {
    this.prune(now)
    this.bump(dayOf(now), kind, 'all')
  }

  report(days: number, now = new Date()): TrafficReport {
    if (!(TRAFFIC_RANGES as readonly number[]).includes(days)) throw new Error('INVALID_TRAFFIC_RANGE')
    this.prune(now)
    const range = lastDays(days, now), before = lastDays(days * 2, now).slice(0, days)
    const from = range[0], to = range[range.length - 1]
    const rows = this.db.prepare('SELECT day,kind,key,count FROM traffic_daily WHERE day >= ? AND day <= ?').all(before[0], to)
      .map(row => ({ day: row.day as string, kind: row.kind as string, key: row.key as string, count: row.count as number }))
    const current = rows.filter(row => row.day >= from), earlier = rows.filter(row => row.day < from)
    const sum = (list: typeof rows, kind: string) => list.reduce((total, row) => row.kind === kind ? total + row.count : total, 0)
    const totals = (list: typeof rows): TrafficTotals => ({ visitors: sum(list, 'visitor'), views: sum(list, 'view'), rooms: sum(list, 'room'), games: sum(list, 'game') })
    const top = (kind: string, limit: number): TrafficRow[] => {
      const byKey = new Map<string, number>()
      for (const row of current) if (row.kind === kind) byKey.set(row.key, (byKey.get(row.key) ?? 0) + row.count)
      return [...byKey].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit)
    }
    return { version: 'traffic/v1', days, from, to, timeZone: TRAFFIC_TIME_ZONE,
      hasData: (this.db.prepare('SELECT count(*) AS total FROM traffic_daily').get()!.total as number) > 0,
      totals: totals(current), previous: totals(earlier),
      daily: range.map(day => ({ day, ...totals(current.filter(row => row.day === day)) })),
      pages: top('view', 10), sources: top('source', 8), devices: top('device', 3) }
  }

  stats() {
    const row = this.db.prepare('SELECT count(*) AS total, min(day) AS first FROM traffic_daily').get()!
    return { rows: row.total as number, firstDay: (row.first as string | null) ?? null,
      retentionDays: TRAFFIC_KEEP_DAYS, visitorHashDays: TRAFFIC_VISITOR_HASH_DAYS }
  }
}
