import { Server, Socket } from 'socket.io'
import { roomRepository, roomService } from '../../modules/room'
import { gameService } from '../../modules/game'
import { rateLimitAction } from '../middleware/rateLimiter'
import { phaseTimer } from '../../modules/game/PhaseTimer'

export function registerGameHandlers(io: Server, socket: Socket) {
  /**
   * Start game
   */
  socket.on('start_game', async ({ roomId }, callback) => {
    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Check if host
      const hostPlayer = room.players.find((p) => p.socketId === socket.id)
      if (!hostPlayer || room.host !== hostPlayer.userId) {
        const error = { error: 'NOT_HOST', message: 'Chỉ host mới có thể bắt đầu trò chơi.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Start game via engine
      const result = await gameService.startGame(room)

      if (!result.success) {
        const messages = {
          GAME_ALREADY_STARTED: 'Trò chơi đã bắt đầu rồi.',
          NOT_ENOUGH_PLAYERS: 'Cần ít nhất 7 người để bắt đầu.',
          TOO_MANY_PLAYERS: 'Tối đa 11 người chơi.',
          ROLE_ASSIGNMENT_FAILED: result.message || 'Không thể chia vai trò.',
        }
        const error = {
          error: result.error,
          message: messages[result.error as keyof typeof messages] || 'Lỗi không xác định',
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room
      roomRepository.save(result.room!)

      // Broadcast
      console.log(`[start_game] Phòng ${roomId} bắt đầu - Roles assigned`)
      io.to(roomId).emit('game_started', gameService.getPublicState(result.room!))

      // Start phase timer for role-reveal phase
      phaseTimer.startTimer(roomId, result.room!.phase, () => {
        // Auto-advance when timer expires
        const room = roomRepository.findById(roomId)
        if (room && room.currentNarrator) {
          gameService.advanceTurn(room, room.currentNarrator).then((advanceResult) => {
            if (advanceResult.success && advanceResult.room) {
              roomRepository.save(advanceResult.room)
              io.to(roomId).emit('turn_changed', gameService.getPublicState(advanceResult.room))
              // Start timer for next phase
              phaseTimer.startTimer(roomId, advanceResult.room.phase, () => {
                /* recursive auto-advance */
              })
            }
          })
        }
      })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[start_game] Error:', error)
      const err = { error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Advance turn
   */
  socket.on('next_turn', async ({ roomId }, callback) => {
    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find narrator by socket ID
      const narratorPlayer = room.players.find((p) => p.socketId === socket.id)
      if (!narratorPlayer) {
        const error = { error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Advance turn via engine
      const result = await gameService.advanceTurn(room, narratorPlayer.userId)

      if (!result.success) {
        const messages = {
          NOT_NARRATOR: 'Chỉ Quản trò mới có thể chuyển lượt.',
        }
        const error = {
          error: result.error,
          message: messages[result.error as keyof typeof messages] || 'Không thể chuyển lượt',
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room
      roomRepository.save(result.room!)

      // Broadcast
      if (result.message === 'GAME_ENDED') {
        console.log(`[next_turn] Game ended in room ${roomId}`)
        phaseTimer.clearTimer(roomId) // Clear timer when game ends
        io.to(roomId).emit('game_ended', gameService.getPublicState(result.room!))
      } else {
        console.log(`[next_turn] Room ${roomId} -> Turn ${result.room!.turn}, Phase ${result.room!.phase}`)
        io.to(roomId).emit('turn_changed', gameService.getPublicState(result.room!))

        // Start phase timer for new phase
        phaseTimer.startTimer(roomId, result.room!.phase, () => {
          // Auto-advance when timer expires
          const room = roomRepository.findById(roomId)
          if (room && room.currentNarrator) {
            gameService.advanceTurn(room, room.currentNarrator).then((advanceResult) => {
              if (advanceResult.success && advanceResult.room) {
                roomRepository.save(advanceResult.room)
                if (advanceResult.message === 'GAME_ENDED') {
                  phaseTimer.clearTimer(roomId)
                  io.to(roomId).emit('game_ended', gameService.getPublicState(advanceResult.room))
                } else {
                  io.to(roomId).emit('turn_changed', gameService.getPublicState(advanceResult.room))
                  // Recursively start timer for next phase
                  phaseTimer.startTimer(roomId, advanceResult.room.phase, () => {
                    /* recursive */
                  })
                }
              }
            })
          }
        })
      }

      if (callback) callback({ success: true, data: gameService.getPublicState(result.room!) })
    } catch (error: any) {
      console.error('[next_turn] Error:', error)
      const err = { error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Night action
   */
  socket.on('night_action', async ({ roomId, action, targetSocketId }, callback) => {
    // Rate limit: 1 action per second
    if (!rateLimitAction(socket, 'night_action', 1000)) {
      const error = { error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi thực hiện hành động tiếp theo.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find actor and target
      const actor = room.players.find((p) => p.socketId === socket.id)
      const target = room.players.find((p) => p.socketId === targetSocketId)

      if (!actor || !target) {
        const error = { error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Create game action
      const gameAction = {
        type: action.toUpperCase() as 'SILENCE' | 'HEAL',
        actorId: actor.userId,
        targetId: target.userId,
      }

      // Execute via engine
      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const messages = {
          NOT_NIGHT_PHASE: 'Không phải giai đoạn ban đêm.',
          'Not a silencer': 'Bạn không phải Người Im Lặng.',
          'Not a healer': 'Bạn không phải Người Chữa Lành.',
        }
        const error = {
          error: result.error,
          message: messages[result.error as keyof typeof messages] || result.error,
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room
      roomRepository.save(result.room!)

      // Broadcast
      console.log(`[night_action] ${action} by ${socket.id} in room ${roomId}`)
      io.to(roomId).emit('night_action_completed', {
        action,
        room: gameService.getPublicState(result.room!),
      })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[night_action] Error:', error)
      const err = { error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Give coin
   */
  socket.on('give_coin', async ({ roomId, receiverSocketId, coinType }, callback) => {
    // Rate limit: 1 coin per second
    if (!rateLimitAction(socket, 'give_coin', 1000)) {
      const error = { error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi tặng coin tiếp theo.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find giver and receiver
      const giver = room.players.find((p) => p.socketId === socket.id)
      const receiver = room.players.find((p) => p.socketId === receiverSocketId)

      if (!giver || !receiver) {
        const error = { error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Create game action
      const gameAction = {
        type: 'GIVE_COIN' as const,
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType },
      }

      // Execute via engine
      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const error = { error: result.error, message: result.error || 'Không thể tặng coin' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room
      roomRepository.save(result.room!)

      // Broadcast
      console.log(`[give_coin] ${coinType} from ${socket.id} to ${receiverSocketId}`)
      io.to(roomId).emit('coin_given', {
        giver: giver.userId,
        receiver: receiver.userId,
        coinType,
        room: gameService.getPublicState(result.room!),
      })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[give_coin] Error:', error)
      const err = { error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Submit vote
   */
  socket.on('submit_vote', async ({ roomId, suspectSocketId }, callback) => {
    // Rate limit: 1 vote per 2 seconds
    if (!rateLimitAction(socket, 'submit_vote', 2000)) {
      const error = { error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi bình chọn.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find voter and suspect
      const voter = room.players.find((p) => p.socketId === socket.id)
      const suspect = room.players.find((p) => p.socketId === suspectSocketId)

      if (!voter || !suspect) {
        const error = { error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Create game action
      const gameAction = {
        type: 'VOTE' as const,
        actorId: voter.userId,
        targetId: suspect.userId,
      }

      // Execute via engine
      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const messages = {
          NOT_VOTE_PHASE: 'Không phải giai đoạn bình chọn.',
          ALREADY_VOTED: 'Bạn đã bình chọn rồi.',
        }
        const error = {
          error: result.error,
          message: messages[result.error as keyof typeof messages] || 'Không thể vote',
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room
      roomRepository.save(result.room!)

      console.log(`[vote] ${socket.id} votes ${suspectSocketId}`)
      socket.emit('vote_submitted', { success: true })

      // Check if all voted
      if (result.autoAdvance) {
        console.log(`[vote] All players voted in room ${roomId}`)
        io.to(roomId).emit('voting_complete', { votes: result.room!.votes })
      }

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[submit_vote] Error:', error)
      const err = { error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * End game
   */
  socket.on('end_game', async ({ roomId }, callback) => {
    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Calculate scores
      const scores = room.players.map((p) => ({
        userId: p.userId,
        socketId: p.socketId,
        name: p.name,
        role: p.role,
        coins: p.coins,
        score: (p.coins?.green || 0) * 3 + (p.coins?.yellow || 0) * 2 + (p.coins?.red || 0),
      })).sort((a, b) => b.score - a.score)

      // Update room status
      roomRepository.update(roomId, { status: 'ended', phase: 'ended' })

      // Clear phase timer
      phaseTimer.clearTimer(roomId)

      console.log(`[end_game] Room ${roomId} ended`)
      io.to(roomId).emit('game_ended', { scores })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[end_game] Error:', error)
      const err = { error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })
}
