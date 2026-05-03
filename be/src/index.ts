import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import cors from 'cors'
import { connectRedis, pubClient, subClient } from './redis'
import { registerSocketHandlers } from './socket/handlers/index'
import { roomRepository } from './modules/room/repository/RoomRepository'
import { cleanupRooms } from './persistence'

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
  }),
)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
})

async function start(): Promise<void> {
  // Connect Redis clients
  await connectRedis()

  // Attach Redis adapter so all containers share Socket.IO rooms/events
  io.adapter(createAdapter(pubClient, subClient))

  // Load existing rooms from Redis into memory cache
  await roomRepository.loadFromRedis()

  registerSocketHandlers(io)

  // Periodic cleanup every 1 hour
  setInterval(() => {
    cleanupRooms(roomRepository.getRawMap())
  }, 60 * 60 * 1000)

  httpServer.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`)
    console.log(`✅ Redis: Connected`)
    console.log(`✅ Socket.IO: Redis adapter attached`)
    console.log(`✅ Game Engine: Active`)
    console.log(`✅ Socket Handlers: Registered`)
    console.log(`✅ Cleanup: Scheduled (every 1 hour)`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
