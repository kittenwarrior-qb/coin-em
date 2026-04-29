import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  getRoomBySocket,
  startGame,
  publicRoomState,
  getRooms,
  addFakePlayers,
} from './rooms.js'
import { autoSave } from './persistence.js'
import {
  healerAction,
  silencerAction,
  guideAction,
  nextPhase,
  giveCoin,
  submitVote,
  calculateScores,
} from './gameActions.js'
import { nextTurn, nightAction } from './gamePhases.js'

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[connect] ${socket.id}`)

    // ─── join_room ────────────────────────────────────────────────────────────
    // Client emits: { name: string, roomId: string, userId: string, createIfMissing?: boolean }
    socket.on('join_room', ({ name, roomId, userId, createIfMissing = false } = {}) => {
      if (!name || !roomId || !userId) {
        return socket.emit('error', { code: 'invalid_params', message: 'name, roomId và userId là bắt buộc.' })
      }

      let room = getRoom(roomId)

      if (!room) {
        if (!createIfMissing) {
          return socket.emit('error', { code: 'room_not_found', message: `Phòng "${roomId}" không tồn tại.` })
        }
        // Host tạo phòng mới
        room = createRoom(roomId, { socketId: socket.id, userId, name })
        socket.join(roomId)
        console.log(`[create_room] ${name} (userId: ${userId}) tạo phòng ${roomId}`)
      } else {
        if (room.status !== 'waiting') {
          return socket.emit('error', { code: 'game_in_progress', message: 'Trò chơi đã bắt đầu, không thể tham gia.' })
        }
        if (room.players.length >= 11) {
          return socket.emit('error', { code: 'room_full', message: 'Phòng đã đủ 11 người.' })
        }
        
        // Check if player already exists (by userId)
        const existingPlayer = room.players.find(p => p.userId === userId)
        if (existingPlayer) {
          // Update socketId
          room.players = room.players.map(p => 
            p.userId === userId ? { ...p, socketId: socket.id } : p
          )
          console.log(`[join_room] ${name} (userId: ${userId}) reconnected, updated socketId to ${socket.id}`)
        } else {
          // Add new player
          addPlayer(roomId, { socketId: socket.id, userId, name })
          console.log(`[join_room] ${name} (userId: ${userId}) vào phòng ${roomId}`)
        }
        
        socket.join(roomId)
      }

      // Gửi state hiện tại cho người vừa join
      socket.emit('room_state', publicRoomState(getRoom(roomId)))

      // Thông báo cho cả phòng có người mới
      socket.to(roomId).emit('player_joined', { socketId: socket.id, userId, name, players: getRoom(roomId).players })
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
          not_enough_players: 'Cần ít nhất 7 người để bắt đầu.',
          too_many_players: 'Tối đa 11 người chơi.',
          role_assignment_failed: result.message || 'Không thể chia vai trò.',
        }
        return socket.emit('error', { code: result.error, message: messages[result.error] })
      }
      console.log(`[start_game] Phòng ${roomId} bắt đầu - Roles assigned`)
      io.to(roomId).emit('game_started', publicRoomState(result.room))
    })

    // ─── add_fake_players ─────────────────────────────────────────────────────
    // Debug function to add fake players for testing (one at a time)
    socket.on('add_fake_players', ({ roomId, count = 1 } = {}) => {
      const result = addFakePlayers(roomId, count)
      if (result.error) {
        const messages = {
          room_not_found: 'Phòng không tồn tại.',
          game_already_started: 'Trò chơi đã bắt đầu, không thể thêm bot.',
          room_full: 'Phòng đã đủ 11 người.',
        }
        return socket.emit('error', { code: result.error, message: messages[result.error] })
      }
      console.log(`[add_fake_players] Added ${result.added} fake player(s) to room ${roomId}`)
      io.to(roomId).emit('room_state', publicRoomState(result.room))
    })

    // ─── next_turn ────────────────────────────────────────────────────────────
    // Narrator advances to next turn/phase
    socket.on('next_turn', ({ roomId } = {}) => {
      const result = nextTurn(roomId, socket.id)
      if (result.error) {
        const messages = {
          room_not_found: 'Phòng không tồn tại.',
          not_narrator: 'Chỉ Quản trò mới có thể chuyển lượt.',
        }
        return socket.emit('error', { code: result.error, message: messages[result.error] })
      }
      
      if (result.gameEnded) {
        console.log(`[next_turn] Game ended in room ${roomId}`)
        io.to(roomId).emit('game_ended', publicRoomState(result.room))
      } else {
        console.log(`[next_turn] Room ${roomId} -> Turn ${result.room.turn}, Phase ${result.room.phase}`)
        io.to(roomId).emit('turn_changed', publicRoomState(result.room))
      }
    })

    // ─── night_action ─────────────────────────────────────────────────────────
    socket.on('night_action', ({ roomId, action, targetSocketId } = {}) => {
      const result = nightAction(roomId, action, socket.id, targetSocketId)
      
      if (result.error) {
        const messages = {
          room_not_found: 'Phòng không tồn tại.',
          not_night_phase: 'Không phải giai đoạn ban đêm.',
          player_not_found: 'Người chơi không tồn tại.',
          not_silencer: 'Bạn không phải Người Im Lặng.',
          not_healer: 'Bạn không phải Người Chữa Lành.',
        }
        return socket.emit('error', { code: result.error, message: messages[result.error] })
      }
      
      console.log(`[night_action] ${action} by ${socket.id} in room ${roomId}`)
      io.to(roomId).emit('night_action_completed', { action, room: publicRoomState(result.room) })
    })

    // ─── next_phase ───────────────────────────────────────────────────────────
    socket.on('next_phase', ({ roomId } = {}) => {
      const result = nextPhase(roomId)
      if (result.error) {
        return socket.emit('error', { code: result.error, message: 'Không thể chuyển phase.' })
      }
      console.log(`[next_phase] Room ${roomId} -> ${result.room.phase}`)
      io.to(roomId).emit('phase_changed', publicRoomState(result.room))
    })

    // ─── give_coin ────────────────────────────────────────────────────────────
    socket.on('give_coin', ({ roomId, receiverSocketId, coinType } = {}) => {
      const result = giveCoin(roomId, socket.id, receiverSocketId, coinType)
      if (result.error) {
        const messages = {
          room_not_found: 'Phòng không tồn tại.',
          player_not_found: 'Người chơi không tồn tại.',
          insufficient_coins: 'Không đủ xu.',
        }
        return socket.emit('error', { code: result.error, message: messages[result.error] })
      }
      console.log(`[give_coin] ${coinType} from ${socket.id} to ${receiverSocketId}`)
      io.to(roomId).emit('coin_given', {
        giver: socket.id,
        receiver: receiverSocketId,
        coinType,
        room: publicRoomState(result.room),
      })
    })

    // ─── submit_vote ──────────────────────────────────────────────────────────
    socket.on('submit_vote', ({ roomId, suspectSocketId } = {}) => {
      const result = submitVote(roomId, socket.id, suspectSocketId)
      if (result.error) {
        return socket.emit('error', { code: result.error, message: 'Không thể vote.' })
      }
      console.log(`[vote] ${socket.id} votes ${suspectSocketId}`)
      socket.emit('vote_submitted', { success: true })
      
      // Check if all players voted
      const room = getRoom(roomId)
      if (room && room.votes && Object.keys(room.votes).length === room.players.length) {
        // All voted, reveal results
        io.to(roomId).emit('voting_complete', { votes: room.votes })
      }
    })

    // ─── end_game ─────────────────────────────────────────────────────────────
    socket.on('end_game', ({ roomId } = {}) => {
      const room = getRoom(roomId)
      if (!room) return socket.emit('error', { code: 'room_not_found', message: 'Phòng không tồn tại.' })
      
      const scores = calculateScores(room)
      room.status = 'ended'
      autoSave(getRooms())
      
      console.log(`[end_game] Room ${roomId} ended`)
      io.to(roomId).emit('game_ended', { scores })
    })

    // ─── reconnect_room ───────────────────────────────────────────────────────
    // Client emits: { roomId: string, userId: string, oldSocketId: string, name: string }
    socket.on('reconnect_room', ({ roomId, userId, oldSocketId, name } = {}) => {
      if (!roomId || !userId) {
        return socket.emit('error', { code: 'invalid_params', message: 'roomId và userId là bắt buộc.' })
      }

      let room = getRoom(roomId)
      if (!room) {
        return socket.emit('error', { code: 'room_not_found', message: 'Phòng không còn tồn tại.' })
      }

      console.log(`[reconnect_room] Attempting reconnect: roomId=${roomId}, userId=${userId}, name=${name}, oldSocketId=${oldSocketId}, newSocketId=${socket.id}`)

      // Find existing player by userId (most reliable)
      let existingPlayer = room.players.find(p => p.userId === userId)
      
      if (!existingPlayer && name) {
        // Fallback: try to find by name (for reconnect after userId changed)
        existingPlayer = room.players.find(p => p.name === name)
        if (existingPlayer) {
          console.log(`[reconnect_room] Found player by name, updating userId from ${existingPlayer.userId} to ${userId}`)
        }
      }

      if (existingPlayer) {
        // Update existing player's socketId AND userId (in case userId changed)
        room.players = room.players.map(p => 
          p === existingPlayer ? { ...p, socketId: socket.id, userId } : p
        )
        
        // Update host if this player is host
        if (room.host === existingPlayer.userId) {
          room.host = userId
          console.log(`[reconnect_room] Updated host userId to ${userId}`)
        }
        
        // Update currentNarrator if this player is narrator
        if (room.currentNarrator === existingPlayer.userId) {
          room.currentNarrator = userId
          console.log(`[reconnect_room] Updated currentNarrator userId to ${userId}`)
        }
        
        // Update currentNTG if this player is sender
        if (room.currentNTG === existingPlayer.userId) {
          room.currentNTG = userId
          console.log(`[reconnect_room] Updated currentNTG userId to ${userId}`)
        }
        
        room.lastActivity = Date.now()
        autoSave(getRooms())
        console.log(`[reconnect_room] ${name} (userId: ${userId}) reconnected (updated socketId to ${socket.id})`)
      } else {
        // Player not found - this shouldn't happen during game
        console.log(`[reconnect_room] WARNING: Player ${name} (userId: ${userId}) not found in room!`)
        return socket.emit('error', { code: 'player_not_found', message: 'Không tìm thấy người chơi trong phòng.' })
      }

      socket.join(roomId)

      // Get updated room state
      room = getRoom(roomId)
      if (room) {
        socket.emit('room_state', publicRoomState(room))
        socket.to(roomId).emit('player_joined', { socketId: socket.id, userId, name, players: room.players })
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

    // ─── cleanup_fake_rooms ───────────────────────────────────────────────────
    // Admin function to manually cleanup rooms with only fake players
    socket.on('cleanup_fake_rooms', () => {
      const allRooms = getRooms()
      let cleaned = 0
      
      for (const [roomId, room] of allRooms.entries()) {
        const hasOnlyFakePlayers = room.players.every(p => p.isFake)
        if (hasOnlyFakePlayers) {
          allRooms.delete(roomId)
          cleaned++
        }
      }
      
      autoSave(allRooms)
      console.log(`[cleanup_fake_rooms] Removed ${cleaned} fake rooms`)
      socket.emit('cleanup_complete', { cleaned, remaining: allRooms.size })
    })

    // ─── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const room = getRoomBySocket(socket.id)
      if (!room) return
      const roomId = room.id
      
      // If game is playing, don't remove player - just mark as disconnected
      if (room.status === 'playing') {
        console.log(`[disconnect] ${socket.id} disconnected from playing game ${roomId} - keeping player in room`)
        // Player will reconnect later
        return
      }
      
      // If game is waiting, remove player
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
