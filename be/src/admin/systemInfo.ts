import { statSync } from 'node:fs'
import type { Room } from '../modules/game/types'
import type { CatalogStore } from '../catalog/CatalogStore'
import type { TrafficStore } from '../analytics/TrafficStore'
import { ROOM_INACTIVITY_MS } from '../retention'

/** SQLite keeps recent writes in a -wal file beside the database. */
function fileBytes(filename: string): number {
  let bytes = 0
  for (const file of [filename, `${filename}-wal`]) { try { bytes += statSync(file).size } catch { /* not created yet */ } }
  return bytes
}

/** Storage and process facts for the admin "Dữ liệu" screen: sizes and counts, never content or paths. */
export function systemInfo(sources: {
  rooms: readonly Room[]; redisAvailable: boolean
  catalog?: CatalogStore; catalogFile: string
  traffic?: TrafficStore; trafficFile: string
}) {
  const count = (status: Room['status']) => sources.rooms.filter(room => room.status === status).length
  return {
    version: 'system/v1' as const,
    process: { uptimeSeconds: Math.floor(process.uptime()), memoryBytes: process.memoryUsage().rss, node: process.version,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      startedAt: Date.now() - Math.floor(process.uptime() * 1000) },
    catalog: sources.catalog ? { available: true as const, bytes: fileBytes(sources.catalogFile), ...sources.catalog.stats() } : { available: false as const },
    rooms: { mode: sources.redisAvailable ? 'redis' : 'file', connected: sources.redisAvailable, total: sources.rooms.length,
      waiting: count('waiting'), playing: count('playing'), ended: count('ended'), retentionMinutes: ROOM_INACTIVITY_MS / 60_000 },
    traffic: sources.traffic ? { available: true as const, bytes: fileBytes(sources.trafficFile), ...sources.traffic.stats() } : { available: false as const },
  }
}
