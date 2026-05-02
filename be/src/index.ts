import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { registerSocketHandlers } from './socket/handlers/index'
import { roomRepository } from './modules/room/repository/RoomRepository'
import { cleanupRooms } from './persistence'

const PORT = process.env.PORT || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()
app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
})

registerSocketHandlers(io)

// Periodic cleanup of old/empty rooms (every 1 hour)
setInterval(() => {
  cleanupRooms(roomRepository.getRawMap())
}, 60 * 60 * 1000)

httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`)
  console.log(`✅ Game Engine: Active`)
  console.log(`✅ Socket Handlers: Registered`)
  console.log(`✅ Persistence: Enabled (rooms loaded from disk)`)
  console.log(`✅ Cleanup: Scheduled (every 1 hour)`)
})
