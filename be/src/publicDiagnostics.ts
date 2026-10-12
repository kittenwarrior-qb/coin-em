import type { Express } from 'express'
import type { Room } from './modules/game/types'
import { readiness } from './readiness'

export interface DiagnosticSources {
  rooms: () => readonly Room[]
  startupComplete: () => boolean
  primaryRequired: boolean
  redisAvailable: () => boolean
  uptime: () => number
}

/** Public, aggregate-only allowlist. Never spread snapshots or attach room labels. */
export function publicMetrics(rooms: readonly Room[], uptime: number, redis: boolean) {
  const roomsByStatus = { waiting: 0, playing: 0, ended: 0 }
  let players = 0
  for (const room of rooms) {
    players += room.players.length
    if (room.status === 'waiting' || room.status === 'playing' || room.status === 'ended') roomsByStatus[room.status]++
  }
  return { rooms: rooms.length, players, roomsByStatus, uptime, redis }
}

/** Shared with loopback HTTP fixtures so tests exercise the actual route contract. */
export function registerPublicDiagnostics(app: Express, sources: DiagnosticSources): void {
  app.get('/health', (_, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const health = readiness(sources.startupComplete(), sources.primaryRequired, sources.redisAvailable())
    res.status(health.statusCode).json(health.body)
  })
  app.get('/metrics', (_, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json(publicMetrics(sources.rooms(), sources.uptime(), sources.redisAvailable()))
  })
}
