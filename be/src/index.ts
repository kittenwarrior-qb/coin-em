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

const app = express()
app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.get('/metrics', (_, res) =>
  res.json({
    rooms: roomRepository.count(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    redis: redisAvailable,
  }),
)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
})

async function start(): Promise<void> {
  const hasRedis = await connectRedis()

  if (hasRedis) {
    // Production path: Redis adapter + load rooms from Redis
    io.adapter(createAdapter(pubClient, subClient))
    await roomRepository.loadFromRedis()
    console.log('✅ Redis: Connected — multi-instance mode')
  } else {
    // Fallback path: no adapter, load rooms from JSON files
    const rooms = loadRooms()
    roomRepository.load(rooms)
    console.log('⚠️  Redis: Unavailable — single-instance mode (JSON fallback)')
  }

  registerSocketHandlers(io)

  setInterval(() => {
    cleanupRooms(roomRepository.getRawMap())
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
