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

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// Support multiple origins (comma-separated)
const corsOrigin = CLIENT_ORIGIN.includes(',')
  ? CLIENT_ORIGIN.split(',').map(o => o.trim())
  : CLIENT_ORIGIN

const app = express()
app.use(cors({ origin: corsOrigin }))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.get('/metrics', (_, res) =>
  res.json({
    rooms: roomRepository.count(),
    roomDetails: roomRepository.findAll().map(r => ({
      id: r.id,
      status: r.status,
      players: r.players.length,
      lastActivity: r.lastActivity,
      lastActivityAgo: r.lastActivity ? `${Math.round((Date.now() - r.lastActivity) / 1000)}s` : 'never',
    })),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    redis: redisAvailable,
  }),
)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
})

async function start(): Promise<void> {
  const hasRedis = await connectRedis()

  if (hasRedis) {
    // Production path: Redis adapter + load rooms from Redis
    io.adapter(createAdapter(pubClient, subClient))
    await roomRepository.loadFromRedis()
    console.log('✅ Redis: Connected — multi-instance mode')
    
    // If Redis is empty but we have JSON backups, load them
    if (roomRepository.count() === 0) {
      console.log('[startup] Redis is empty, checking JSON backups...')
      const jsonRooms = loadRooms()
      if (jsonRooms.size > 0) {
        roomRepository.load(jsonRooms)
        console.log(`[startup] Restored ${jsonRooms.size} room(s) from JSON backup`)
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
    console.log('⚠️  Redis: Unavailable — single-instance mode (JSON fallback)')
  }

  // After restart, all sockets are gone.
  // Clear players from waiting rooms (no one is connected anymore).
  // Playing rooms keep their players so reconnect can work.
  console.log(`[startup] Total rooms loaded: ${roomRepository.count()}`)
  
  let clearedWaitingRooms = 0
  let deletedEmptyRooms = 0
  
  for (const room of roomRepository.findAll()) {
    if (room.status === 'waiting') {
      if (room.players.length > 0) {
        console.log(`[startup] Clearing ${room.players.length} stale player(s) from waiting room ${room.id}`)
        roomRepository.update(room.id, { players: [] })
        clearedWaitingRooms++
      }
    } else {
      console.log(`[startup] Keeping ${room.status} room ${room.id} with ${room.players.length} player(s) for reconnect`)
    }
  }
  
  // Remove now-empty waiting rooms
  for (const room of roomRepository.findAll()) {
    if (room.status === 'waiting' && room.players.length === 0) {
      roomRepository.delete(room.id)
      console.log(`[startup] Deleted empty waiting room ${room.id}`)
      deletedEmptyRooms++
    }
  }
  
  console.log(`[startup] Cleanup complete: ${clearedWaitingRooms} waiting rooms cleared, ${deletedEmptyRooms} empty rooms deleted, ${roomRepository.count()} rooms remaining`)

  registerSocketHandlers(io)

  setInterval(() => {
    cleanupRooms(roomRepository.getRawMap()).catch(err =>
      console.error('[Cleanup] Error:', err)
    )
  }, 60 * 60 * 1000)

  httpServer.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`)
    console.log(`✅ Game Engine: Active`)
    console.log(`✅ Socket Handlers: Registered`)
    console.log(`✅ Cleanup: Scheduled (every 1 hour)`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
