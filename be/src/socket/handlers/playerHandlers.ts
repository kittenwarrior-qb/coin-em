import { Server, Socket } from 'socket.io'
import { roomRepository, roomService } from '../../modules/room'

// Track pending disconnect timers: socketId → timer
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function registerPlayerHandlers(io: Server, socket: Socket) {
  /**
   * Disconnect handler
   */
  socket.on('disconnect', () => {
    const room = roomRepository.findBySocketId(socket.id)
    if (!room) return

    const roomId = room.id

    // If game is playing, don't remove player - just mark as disconnected
    if (room.status === 'playing') {
      console.log(`[disconnect] ${socket.id} disconnected from playing game ${roomId} - keeping player in room`)
      return
    }

    // If game is waiting, give a grace period before removing
    // This allows page reloads / brief disconnects to reconnect without losing their slot
    console.log(`[disconnect] ${socket.id} disconnected from waiting room ${roomId} - grace period 10s`)
    const timer = setTimeout(() => {
      disconnectTimers.delete(socket.id)

      // Re-check room still exists and player hasn't reconnected (socketId still matches)
      const currentRoom = roomRepository.findBySocketId(socket.id)
      if (!currentRoom) return

      const updatedRoom = roomService.removePlayer(roomId, socket.id)
      console.log(`[disconnect] ${socket.id} removed from room ${roomId} after grace period`)

      if (updatedRoom) {
        io.to(roomId).emit('player_left', {
          socketId: socket.id,
          players: updatedRoom.players,
          host: updatedRoom.host,
        })
      } else {
        console.log(`[room_closed] Phòng ${roomId} đã đóng`)
      }
    }, 10_000)

    disconnectTimers.set(socket.id, timer)
  })
}

/**
 * Cancel pending disconnect timer for a socket (called on reconnect)
 */
export function cancelDisconnectTimer(socketId: string) {
  const timer = disconnectTimers.get(socketId)
  if (timer) {
    clearTimeout(timer)
    disconnectTimers.delete(socketId)
    console.log(`[reconnect] Cancelled disconnect timer for ${socketId}`)
  }
}
