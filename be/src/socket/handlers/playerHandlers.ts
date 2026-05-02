import { Server, Socket } from 'socket.io'
import { roomRepository, roomService } from '../../modules/room'

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

    // If game is waiting, remove player
    const updatedRoom = roomService.removePlayer(roomId, socket.id)
    console.log(`[disconnect] ${socket.id} rời phòng ${roomId}`)

    if (updatedRoom) {
      io.to(roomId).emit('player_left', {
        socketId: socket.id,
        players: updatedRoom.players,
        host: updatedRoom.host,
      })
    } else {
      console.log(`[room_closed] Phòng ${roomId} đã đóng`)
    }
  })
}
