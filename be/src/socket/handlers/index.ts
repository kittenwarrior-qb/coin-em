import { Server } from 'socket.io'
import { registerRoomHandlers } from './roomHandlers'
import { registerGameHandlers } from './gameHandlers'
import { registerPlayerHandlers } from './playerHandlers'

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`)

    // Attach userId to socket (from auth or use socket.id as fallback)
    ;(socket as any).userId = (socket.handshake.auth as any)?.userId || socket.id

    // Register all handlers
    registerRoomHandlers(io, socket)
    registerGameHandlers(io, socket)
    registerPlayerHandlers(io, socket)
  })
}
