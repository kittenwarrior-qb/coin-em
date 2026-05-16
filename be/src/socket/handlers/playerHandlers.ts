import { Server, Socket } from 'socket.io'
import { roomRepository, roomService } from '../../modules/room'

// Track pending disconnect timers: socketId → timer
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
let cleanupStarted = false

function emitDisconnectedSummary(io: Server, roomId: string) {
  const room = roomRepository.findById(roomId)
  if (!room) return

  const players = room.players
    .filter(p => !p.isFake && p.isDisconnected)
    .map(p => ({ userId: p.userId, name: p.name, disconnectedAt: p.disconnectedAt }))

  io.to(roomId).emit('players_disconnected', {
    players,
    room: roomService.getPublicState(room),
  })
}

export function startDisconnectedRoomCleanup(io: Server) {
  if (cleanupStarted) return
  cleanupStarted = true

  setInterval(() => {
    const deletedRoomIds = roomService.cleanupDisconnectedRooms()
    for (const roomId of deletedRoomIds) {
      io.to(roomId).emit('room_closed', { roomId, reason: 'inactive_timeout' })
      console.log(`[room_closed] Room ${roomId} deleted after 2h disconnected timeout`)
    }
  }, 60_000)
}

export function registerPlayerHandlers(io: Server, socket: Socket) {
  /**
   * Intentional leave — remove player immediately, no grace period
   */
  socket.on('leave_room', ({ roomId }: { roomId: string }) => {
    cancelDisconnectTimer(socket.id)

    const room = roomRepository.findById(roomId)
    if (!room) {
      console.log(`[leave_room] Room ${roomId} not found for socket ${socket.id}`)
      return
    }

    console.log(`[leave_room] Socket ${socket.id} leaving room ${roomId} (status: ${room.status}, players: ${room.players.length})`)

    // If game is playing or has started, don't remove player - just mark disconnected
    if (room.status === 'playing' || room.status === 'ended') {
      const updatedRoom = roomService.markPlayerDisconnected(roomId, socket.id)
      socket.leave(roomId)
      console.log(`[leave_room] ${socket.id} left ${room.status} room ${roomId} - marked disconnected (remaining players: ${updatedRoom?.players.length})`)
      if (updatedRoom) emitDisconnectedSummary(io, roomId)
      return
    }

    // Only remove player if game is still in waiting phase
    const updatedRoom = roomService.removePlayer(roomId, socket.id)
    console.log(`[leave_room] ${socket.id} intentionally left waiting room ${roomId} (room ${updatedRoom ? 'kept' : 'deleted'})`)
    if (updatedRoom) {
      io.to(roomId).emit('player_left', {
        socketId: socket.id,
        players: updatedRoom.players,
        host: updatedRoom.host,
      })
    } else {
      io.to(roomId).emit('room_closed', { roomId })
      console.log(`[room_closed] Room ${roomId} closed after last player left`)
    }
  })

  /**
   * Disconnect handler — grace period for accidental disconnects
   */
  socket.on('disconnect', () => {
    const room = roomRepository.findBySocketId(socket.id)
    if (!room) return

    const roomId = room.id

    // If game is playing, don't remove player - just mark as disconnected
    if (room.status === 'playing') {
      const updatedRoom = roomService.markPlayerDisconnected(roomId, socket.id)
      console.log(`[disconnect] ${socket.id} disconnected from playing game ${roomId} - keeping player in room`)
      if (updatedRoom) emitDisconnectedSummary(io, roomId)
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
        io.to(roomId).emit('room_closed', { roomId })
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
