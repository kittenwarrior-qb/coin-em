import './env'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import cors from 'cors'
import { connectRedis, redisAvailable, pubClient, subClient } from './redis'
import { registerSocketHandlers } from './socket/handlers/index'
import { roomRepository } from './modules/room/repository/RoomRepository'
import { cleanupRooms, loadRooms } from './persistence'
import { registerPublicDiagnostics } from './publicDiagnostics'
import { OperationalAnalytics, operationalAnalyticsMiddleware } from './admin/operationalAnalytics'
import { AdminAuth } from './admin/AdminAuth'
import { AdminCredentialStore } from './admin/AdminCredentialStore'
import { registerAdminApi } from './admin/adminApi'
import { closeAdminRoom } from './admin/closeRoom'
import { roomService } from './modules/room/services/RoomService'
import { operationDiagnostic } from './telemetry/operationalDiagnostics'
import { registerSafeHttpErrors } from './telemetry/safeHttpErrors'
import { CatalogStore } from './catalog/CatalogStore'
import { pdfCatalogDraft } from './catalog/pdfDraft'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { configureRuntimeCatalog } from './catalog/runtimeCatalog'
import { registerPublicCatalogApi } from './catalog/publicCatalogApi'

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Support multiple origins (comma-separated)
const corsOrigin = CLIENT_ORIGIN.includes(',')
  ? CLIENT_ORIGIN.split(',').map(o => o.trim())
  : CLIENT_ORIGIN

const app = express()
const operationalAnalytics = new OperationalAnalytics()
let catalog: CatalogStore | undefined
const credentialDirectory = path.dirname(process.env.EMCOIN_CATALOG_DB || path.resolve('data/catalog.sqlite'))
let credentials: AdminCredentialStore | undefined
if (process.env.EMCOIN_ADMIN_PASSWORD_HASH) {
  mkdirSync(credentialDirectory, { recursive: true, mode: 0o700 })
  credentials = new AdminCredentialStore(path.join(credentialDirectory, 'admin-credential.sqlite'), process.env.EMCOIN_ADMIN_PASSWORD_HASH)
}
app.use(operationalAnalyticsMiddleware(operationalAnalytics))
app.use(cors({ origin: corsOrigin }))
registerPublicCatalogApi(app, () => catalog)
registerAdminApi(app, {
  auth: new AdminAuth(credentials?.read(), undefined, credentials ? hash => credentials!.save(hash) : undefined),
  catalog: () => catalog,
  origin: process.env.EMCOIN_ADMIN_PASSWORD_HASH ? process.env.EMCOIN_ADMIN_ORIGIN : undefined,
  rooms: () => roomRepository.findAll(), analytics: operationalAnalytics,
  closeRoom: (command, authorized) => closeAdminRoom(roomRepository, command, authorized,
    roomId => {
      io.to(roomId).emit('room_closed', { roomId })
      io.in(roomId).socketsLeave(roomId)
      io.emit('rooms_list', roomService.getAvailableRooms())
    }),
})
app.use(express.json())

const primaryRequired = process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required'
let startupComplete = false
registerPublicDiagnostics(app, {
  rooms: () => roomRepository.findAll(),
  startupComplete: () => startupComplete,
  primaryRequired,
  redisAvailable: () => redisAvailable,
  uptime: () => process.uptime(),
})
registerSafeHttpErrors(app)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
})

async function start(): Promise<void> {
  const hasRedis = await connectRedis()
  if (!hasRedis && primaryRequired) throw new Error('PRIMARY_STORAGE_UNAVAILABLE')

  if (hasRedis) {
    // Production path: Redis adapter + load rooms from Redis
    io.adapter(createAdapter(pubClient, subClient))
    await roomRepository.loadFromRedis()
    operationDiagnostic('redis_connection', 'ok')
    
    // If Redis is empty but we have JSON backups, load them
    if (!primaryRequired && roomRepository.count() === 0) {
      operationDiagnostic('room_recovery', 'fallback')
      const jsonRooms = loadRooms()
      if (jsonRooms.size > 0) {
        roomRepository.load(jsonRooms)
        operationDiagnostic('room_recovery', 'fallback')
        // Save them back to Redis
        for (const room of roomRepository.findAll()) {
          roomRepository.save(room)
        }
      }
    }
  } else {
    // Fallback path: no adapter, load rooms from JSON files
    const rooms = loadRooms()
    roomRepository.load(rooms)
    operationDiagnostic('room_recovery', 'fallback')
  }

  // Restart is not room activity and must not erase a fresh waiting-room roster.
  await roomRepository.drainWrites()
  await cleanupRooms(roomRepository)

  const catalogFile = process.env.EMCOIN_CATALOG_DB || path.resolve('data/catalog.sqlite')
  mkdirSync(path.dirname(catalogFile), { recursive: true })
  catalog = new CatalogStore(catalogFile)
  catalog.seed(pdfCatalogDraft())
  catalog.fillMissingContent(pdfCatalogDraft())
  catalog.reviewMatchingSource(pdfCatalogDraft())
  configureRuntimeCatalog(catalog)

  registerSocketHandlers(io)
  startupComplete = true

  httpServer.listen(PORT, () => {
    operationDiagnostic('startup', 'ok')
  })
}

start().catch(() => {
  operationDiagnostic('startup', 'failed')
  process.exit(1)
})
