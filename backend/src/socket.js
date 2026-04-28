import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  getRoomBySocket,
  startGame,
  publicRoomState,
  getRooms,
} from './rooms.js'
import { autoSave } from './persistence.js'

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`)

    // ─── join_room ────────────────────────────────────────────────────────────
    // Client emits: { name: string, roomId: string, createIfMissing?: boolean }
    socket.on('join_room', ({ name, roomId, createIfMissing = false } = {}) => {
      if (!name || !roomId) {
        return socket.emit('error', { code: 'invalid_params', message: 'name và roomId là bắt buộc.' })
      }

      let room = getRoom(roomId)

      if (!room) {
        if (!createIfMissing) {
          return socket.emit('error', { code: 'room_not_found', message: `Phòng "${roomId}" không tồn tại.` })
        }
        // Host tạo phòng mới
        room = createRoom(roomId, { socketId: socket.id, name })
        socket.join(roomId)
        console.log(`[create_room] ${name} tạo phòng ${roomId}`)
      } else {
        if (room.status !== 'waiting') {
          return socket.emit('error', { code: 'game_in_progress', message: 'Trò chơi đã bắt đầu, không thể tham gia.' })
        }
        if (room.players.length >= 8) {
          return socket.emit('error', { code: 'room_full', message: 'Phòng đã đủ 8 người.' })
        }
        addPlayer(roomId, { socketId: socket.id, name })
        socket.join(roomId)
        console.log(`[join_room] ${name} vào phòng ${roomId}`)
      }

      // Gửi state hiện tại cho người vừa join
      socket.emit('room_state', publicRoomState(getRoom(roomId)))

      // Thông báo cho cả phòng có người mới
      socket.to(roomId).emit('player_joined', { socketId: socket.id, name, players: getRoom(roomId).players })
    })

    // ─── start_game ───────────────────────────────────────────────────────────
    // Chỉ host mới được emit event này
    socket.on('start_game', ({ roomId } = {}) => {
      const result = startGame(roomId, socket.id)
      if (result.error) {
        const messages = {
          room_not_found: 'Phòng không tồn tại.',
          not_host: 'Chỉ host mới có thể bắt đầu trò chơi.',
          already_started: 'Trò chơi đã bắt đầu rồi.',
          not_enough_players: 'Cần ít nhất 2 người để bắt đầu.',
        }
        return socket.emit('error', { code: result.error, message: messages[result.error] })
      }
      console.log(`[start_game] Phòng ${roomId} bắt đầu`)
      io.to(roomId).emit('game_started', publicRoomState(result.room))
    })

    // ─── reconnect_room ───────────────────────────────────────────────────────
    // Client emits: { roomId: string, oldSocketId: string, name: string }
    socket.on('reconnect_room', ({ roomId, oldSocketId, name } = {}) => {
      if (!roomId || !name) {
        return socket.emit('error', { code: 'invalid_params', message: 'roomId và name là bắt buộc.' })
      }

      let room = getRoom(roomId)
      if (!room) {
        return socket.emit('error', { code: 'room_not_found', message: 'Phòng không còn tồn tại.' })
      }

      // Find existing player by oldSocketId or name
      let existingPlayer = null
      if (oldSocketId) {
        existingPlayer = room.players.find(p => p.socketId === oldSocketId)
      }
      if (!existingPlayer) {
        existingPlayer = room.players.find(p => p.name === name)
      }

      if (existingPlayer) {
        // Update existing player's socketId
        room.players = room.players.map(p => 
          p === existingPlayer ? { ...p, socketId: socket.id } : p
        )
        // Update host if needed
        if (room.host === existingPlayer.socketId) {
          room.host = socket.id
        }
        room.lastActivity = Date.now()
        autoSave(getRooms())
        console.log(`[reconnect] ${name} reconnect vào phòng ${roomId} (updated socketId)`)
      } else {
        // Player not found, add as new
        addPlayer(roomId, { socketId: socket.id, name })
        console.log(`[reconnect] ${name} reconnect vào phòng ${roomId} (new player)`)
      }

      socket.join(roomId)

      // Get updated room state
      room = getRoom(roomId)
      if (room) {
        socket.emit('room_state', publicRoomState(room))
        socket.to(roomId).emit('player_joined', { socketId: socket.id, name, players: room.players })
      }
    })

    // ─── list_rooms ───────────────────────────────────────────────────────────
    socket.on('list_rooms', () => {
      const allRooms = getRooms()
      const availableRooms = []
      
      for (const room of allRooms.values()) {
        // Only show waiting rooms that aren't full
        if (room.status === 'waiting' && room.players.length < 8) {
          availableRooms.push({
            id: room.id,
            playerCount: room.players.length,
            hostName: room.players[0]?.name || 'Unknown',
          })
        }
      }
      
      socket.emit('rooms_list', availableRooms)
    })

    // ─── get_room_state ───────────────────────────────────────────────────────
    socket.on('get_room_state', ({ roomId } = {}) => {
      const room = getRoom(roomId)
      if (!room) return socket.emit('error', { code: 'room_not_found', message: 'Phòng không tồn tại.' })
      socket.emit('room_state', publicRoomState(room))
    })

    // ─── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const room = getRoomBySocket(socket.id)
      if (!room) return
      const roomId = room.id
      const updatedRoom = removePlayer(roomId, socket.id)
      console.log(`[disconnect] ${socket.id} rời phòng ${roomId}`)
      if (updatedRoom) {
        io.to(roomId).emit('player_left', { socketId: socket.id, players: updatedRoom.players, host: updatedRoom.host })
      } else {
        // Phòng đã bị xóa vì không còn ai
        console.log(`[room_closed] Phòng ${roomId} đã đóng`)
      }
    })
  })
}
