import { Server, Socket } from 'socket.io'
import { roomRepository, roomService } from '../../modules/room'
import { gameService, Role } from '../../modules/game'
import { rateLimitAction } from '../middleware/rateLimiter'
import { phaseTimer } from '../../modules/game/PhaseTimer'

export function registerGameHandlers(io: Server, socket: Socket) {
  /**
   * Start game
   */
  socket.on('start_game', async ({ roomId }, callback) => {
    try {
      const room = await roomRepository.findByIdFresh(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Check if host
      const hostPlayer = room.players.find((p) => p.socketId === socket.id)
      if (!hostPlayer || room.host !== hostPlayer.userId) {
        const error = { success: false, error: 'NOT_HOST', message: 'Chỉ host mới có thể bắt đầu trò chơi.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Start game via engine
      const result = await gameService.startGame(room)

      if (!result.success) {
        const messages = {
          GAME_ALREADY_STARTED: 'Trò chơi đã bắt đầu rồi.',
          NOT_ENOUGH_PLAYERS: 'Cần ít nhất 5 người để bắt đầu.',
          TOO_MANY_PLAYERS: 'Tối đa 10 người chơi.',
          ROLE_ASSIGNMENT_FAILED: result.message || 'Không thể chia vai trò.',
        }
        const error = {
          success: false,
          error: result.error,
          message: messages[result.error as keyof typeof messages] || 'Lỗi không xác định',
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room and wait for Redis to complete
      await roomRepository.saveAndWait(result.room!)

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
              roomRepository.saveAndWait(advanceResult.room).catch(err =>
                console.error(`[phase_timer] Failed to save room ${roomId}:`, err)
              )
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
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Advance turn
   */
  socket.on('next_turn', async ({ roomId, userId, deviceId }, callback) => {
    try {
      const room = await roomRepository.findByIdFresh(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find narrator by current socket first, then stable browser identity after reload/reconnect.
      let narratorPlayer = room.players.find((p) => p.socketId === socket.id)
      if (!narratorPlayer) {
        narratorPlayer = room.players.find((p) =>
          (!!userId && p.userId === userId) || (!!deviceId && p.deviceId === deviceId)
        )
      }
      if (!narratorPlayer) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      if (narratorPlayer.socketId !== socket.id || narratorPlayer.isDisconnected) {
        const updatedRoom = roomRepository.update(roomId, {
          players: room.players.map((p) =>
            p.userId === narratorPlayer!.userId
              ? {
                  ...p,
                  socketId: socket.id,
                  deviceId: deviceId ?? p.deviceId,
                  isDisconnected: false,
                  disconnectedAt: null,
                  lastSeenAt: Date.now(),
                }
              : p
          ),
        })
        if (updatedRoom) {
          socket.join(roomId)
          Object.assign(room, updatedRoom)
          narratorPlayer = updatedRoom.players.find((p) => p.userId === narratorPlayer!.userId) ?? narratorPlayer
        }
      }

      // Advance turn via engine
      const result = await gameService.advanceTurn(room, narratorPlayer.userId)

      if (!result.success) {
        const messages = {
          NOT_NARRATOR: 'Chỉ Quản trò mới có thể chuyển lượt.',
        }
        const error = {
          success: false,
          error: result.error,
          message: messages[result.error as keyof typeof messages] || 'Không thể chuyển lượt',
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room and wait for Redis
      await roomRepository.saveAndWait(result.room!)

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
                roomRepository.saveAndWait(advanceResult.room).catch(err =>
                  console.error(`[phase_timer] Failed to save room ${roomId}:`, err)
                )
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
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Move back one phase
   */
  socket.on('prev_turn', async ({ roomId, userId, deviceId }, callback) => {
    try {
      console.log('[prev_turn] Received:', {
        roomId,
        socketId: socket.id,
        userId,
        deviceId,
      })
      const room = await roomRepository.findByIdFresh(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'PhÃ²ng khÃ´ng tá»“n táº¡i.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      let narratorPlayer = room.players.find((p) => p.socketId === socket.id)
      if (!narratorPlayer) {
        narratorPlayer = room.players.find((p) =>
          (!!userId && p.userId === userId) || (!!deviceId && p.deviceId === deviceId)
        )
      }
      if (!narratorPlayer) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'NgÆ°á»i chÆ¡i khÃ´ng tá»“n táº¡i.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      if (narratorPlayer.socketId !== socket.id || narratorPlayer.isDisconnected) {
        const updatedRoom = roomRepository.update(roomId, {
          players: room.players.map((p) =>
            p.userId === narratorPlayer!.userId
              ? {
                  ...p,
                  socketId: socket.id,
                  deviceId: deviceId ?? p.deviceId,
                  isDisconnected: false,
                  disconnectedAt: null,
                  lastSeenAt: Date.now(),
                }
              : p
          ),
        })
        if (updatedRoom) {
          socket.join(roomId)
          Object.assign(room, updatedRoom)
          narratorPlayer = updatedRoom.players.find((p) => p.userId === narratorPlayer!.userId) ?? narratorPlayer
        }
      }

      const phaseBefore = room.phase
      console.log('[prev_turn] Before:', {
        roomId,
        turn: room.turn,
        phase: phaseBefore,
        currentNarrator: room.currentNarrator,
        actorUserId: narratorPlayer.userId,
        actorSocketId: narratorPlayer.socketId,
      })

      const result = await gameService.previousTurn(room, narratorPlayer.userId)

      if (!result.success) {
        console.warn('[prev_turn] Failed:', {
          roomId,
          reason: result.error,
          phase: room.phase,
          currentNarrator: room.currentNarrator,
          actorUserId: narratorPlayer.userId,
        })
        const messages = {
          NOT_NARRATOR: 'Chỉ Quản trò mới có thể chuyển lượt.',
          NO_PREVIOUS_PHASE: 'Không thể quay lại phase trước.',
        }
        const error = {
          success: false,
          error: result.error,
          message: messages[result.error as keyof typeof messages] || 'Không thể quay lại phase trước',
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      await roomRepository.saveAndWait(result.room!)
      phaseTimer.clearTimer(roomId)
      socket.join(roomId)
      const publicState = gameService.getPublicState(result.room!)
      console.log(`[prev_turn] Room ${roomId}: ${phaseBefore} -> ${result.room!.phase} (turn ${result.room!.turn})`)
      io.to(roomId).emit('turn_changed', publicState)

      if (callback) callback({ success: true, data: publicState, previousPhase: phaseBefore, phase: result.room!.phase })
    } catch (error: any) {
      console.error('[prev_turn] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
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
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi thực hiện hành động tiếp theo.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find actor and target
      const actor = room.players.find((p) => p.socketId === socket.id)
      const target = room.players.find((p) => p.socketId === targetSocketId)

      if (!actor || !target) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
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
          CANNOT_TARGET_PUBLIC_ROLE: 'Không thể chọn Quản trò hoặc Người Trao Gửi.',
        }
        const error = {
          success: false,
          error: result.error,
          message: messages[result.error as keyof typeof messages] || result.error,
        }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Save room before broadcasting
      await roomRepository.saveAndWait(result.room!)

      // Broadcast night action to all clients
      console.log(`[night_action] ${action} by ${socket.id} in room ${roomId}`)
      io.to(roomId).emit('night_action_completed', {
        action,
        actorId: actor.userId,
        targetId: target.userId,
        actorSocketId: actor.socketId,
        targetSocketId: target.socketId,
        room: gameService.getPublicState(result.room!),
      })

      if (callback) callback({ success: true })

      // Auto-advance after healer/silencer acts — narrator doesn't need to tap through these
      const autoPhase = result.room!.phase
      const narratorId = result.room!.currentNarrator
      if (narratorId && (autoPhase === 'healer-turn' || autoPhase === 'silencer-turn')) {
        setTimeout(async () => {
          try {
            const freshRoom = await roomRepository.findByIdFresh(roomId)
            if (!freshRoom || freshRoom.phase !== autoPhase) return
            const advResult = await gameService.advanceTurn(freshRoom, narratorId)
            if (advResult.success && advResult.room) {
              await roomRepository.saveAndWait(advResult.room)
              io.to(roomId).emit('turn_changed', gameService.getPublicState(advResult.room))
              console.log(`[night_action] Auto-advanced ${autoPhase} → ${advResult.room.phase} in room ${roomId}`)
            }
          } catch (e) {
            console.error('[night_action] Auto-advance error:', e)
          }
        }, 1200)
      }
    } catch (error: any) {
      console.error('[night_action] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Give coin
   */
  socket.on('give_coin', async ({ roomId, receiverSocketId, coinType, amount = 1 }, callback) => {
    // Rate limit: 1 coin per second
    if (!rateLimitAction(socket, 'give_coin', 1000)) {
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi tặng coin tiếp theo.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find giver and receiver
      const giver = room.players.find((p) => p.socketId === socket.id)
      const receiver = room.players.find((p) => p.socketId === receiverSocketId)

      if (!giver || !receiver) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Create game action
      const gameAction = {
        type: 'GIVE_COIN' as const,
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType, amount },
      }

      // Execute via engine
      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const error = { success: false, error: result.error, message: result.error || 'Không thể tặng coin' }
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
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
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
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi bình chọn.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find voter and suspect
      const voter = room.players.find((p) => p.socketId === socket.id)
      const suspect = room.players.find((p) => p.socketId === suspectSocketId)

      if (!voter || !suspect) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
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
          CANNOT_VOTE_AS_PUBLIC_ROLE: 'Quản trò và Người Im Lặng không tham gia bình chọn.',
        }
        const error = {
          success: false,
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
      socket.emit('vote_submitted', { success: true, room: gameService.getPublicState(result.room!) })
      io.to(roomId).emit('vote_updated', { room: gameService.getPublicState(result.room!) })

      // Check if all voted
      if (result.autoAdvance) {
        console.log(`[vote] All players voted in room ${roomId}`)
        io.to(roomId).emit('voting_complete', { votes: result.room!.votes })
      }

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[submit_vote] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Select card (NTG draws situation card in situation-card phase)
   * Also used for selfcare-card phase (Guide selects selfcare card)
   */
  socket.on('select_card', async ({ roomId, card, type = 'SELECT_CARD' }, callback) => {
    if (!rateLimitAction(socket, 'select_card', 1000)) {
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi thực hiện.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const actor = room.players.find((p) => p.socketId === socket.id)
      if (!actor) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const actionType = type === 'SELECT_SELFCARE_CARD' ? 'SELECT_SELFCARE_CARD' : 'SELECT_CARD'
      const gameAction = {
        type: actionType as 'SELECT_CARD' | 'SELECT_SELFCARE_CARD',
        actorId: actor.userId,
        data: { card },
      }

      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const error = { success: false, error: result.error, message: result.error || 'Không thể chọn thẻ.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      await roomRepository.saveAndWait(result.room!)
      console.log(`[select_card] ${actionType} by ${socket.id} in room ${roomId}`)
      io.to(roomId).emit('card_selected', {
        actorId: actor.userId,
        card,
        type: actionType,
        room: gameService.getPublicState(result.room!),
      })

      // Auto-advance after card selection (situation, emotion, selfcare)
      const shouldAutoAdvance =
        (actionType === 'SELECT_CARD' && (result.room!.phase === 'situation-card' || result.room!.phase === 'emotion-card')) ||
        (actionType === 'SELECT_SELFCARE_CARD' && result.room!.phase === 'selfcare-card')

      if (shouldAutoAdvance) {
        const selectedPhase = result.room!.phase
        const delayMs = selectedPhase === 'situation-card' ? 2000 : 350
        
        setTimeout(async () => {
          const currentRoom = roomRepository.findById(roomId)
          if (!currentRoom || currentRoom.phase !== selectedPhase) return
          if (!currentRoom.currentNarrator) return
          
          const advanceResult = await gameService.advanceTurn(currentRoom, currentRoom.currentNarrator)
          if (advanceResult.success && advanceResult.room) {
            await roomRepository.saveAndWait(advanceResult.room)
            io.to(roomId).emit('turn_changed', gameService.getPublicState(advanceResult.room))
          }
        }, delayMs)
      }

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[select_card] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Send response during group-response phase
   * Any player can respond; NTG will vote for best responder
   */
  socket.on('send_response', async ({ roomId, message }, callback) => {
    if (!rateLimitAction(socket, 'send_response', 500)) {
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi gửi.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const actor = room.players.find((p) => p.socketId === socket.id)
      if (!actor) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const gameAction = {
        type: 'SEND_RESPONSE' as const,
        actorId: actor.userId,
        data: { message },
      }

      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const error = { success: false, error: result.error, message: result.error || 'Không thể gửi phản hồi.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      roomRepository.save(result.room!)
      console.log(`[send_response] ${socket.id} responded in room ${roomId}`)

      // Broadcast response to all (so everyone sees who responded)
      io.to(roomId).emit('response_received', {
        actorId: actor.userId,
        actorName: actor.name,
        message,
        room: gameService.getPublicState(result.room!),
      })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[send_response] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * NTG votes for best responder(s) in group-response phase
   * Awards +5 yellow coins to each voted player
   * Accepts single targetSocketId or array of targetSocketIds
   */
  socket.on('ntg_vote', async ({ roomId, targetSocketId, targetSocketIds }, callback) => {
    if (!rateLimitAction(socket, 'ntg_vote', 2000)) {
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi vote.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const actor = room.players.find((p) => p.socketId === socket.id)
      if (!actor) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Only NTG can vote
      if (!actor.isSender) {
        const error = { success: false, error: 'ONLY_NTG_CAN_VOTE', message: 'Chỉ NTG mới có thể vote.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Must be group-response phase
      if (room.phase !== 'group-response') {
        const error = { success: false, error: 'WRONG_PHASE', message: 'Không phải giai đoạn phản hồi nhóm.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Support both single and multiple targets
      const targets = targetSocketIds || (targetSocketId ? [targetSocketId] : [])
      if (targets.length === 0) {
        const error = { success: false, error: 'NO_TARGET', message: 'Chưa chọn người chơi nào.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      let updatedRoom = room
      const votedPlayers: Array<{ userId: string; name: string }> = []

      // Execute vote for each target
      for (const targetId of targets) {
        // Find target by socketId first, then try matching by index position
        const target = updatedRoom.players.find((p) => p.socketId === targetId) 
          || updatedRoom.players.find((p) => p.userId === targetId)
        if (!target) {
          console.warn(`[ntg_vote] Target ${targetId} not found, skipping`)
          continue
        }

        const gameAction = {
          type: 'NTG_VOTE' as const,
          actorId: actor.userId,
          targetId: target.userId,
        }

        const result = await gameService.executeAction(updatedRoom, gameAction)
        if (!result.success) {
          console.warn(`[ntg_vote] Failed to vote for ${targetId}: ${result.error}`)
          continue
        }

        updatedRoom = result.room!
        votedPlayers.push({ userId: target.userId, name: target.name })
      }

      if (votedPlayers.length === 0) {
        const error = { success: false, error: 'NO_VOTES_PROCESSED', message: 'Không thể vote cho người chơi nào.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      roomRepository.save(updatedRoom)
      console.log(`[ntg_vote] NTG ${socket.id} voted for ${votedPlayers.length} player(s) in room ${roomId}`)

      // Emit event for each voted player
      for (const voted of votedPlayers) {
        io.to(roomId).emit('ntg_vote_cast', {
          ntgId: actor.userId,
          votedId: voted.userId,
          votedName: voted.name,
          bonus: 5,
          room: gameService.getPublicState(updatedRoom),
        })
      }

      if (callback) callback({ success: true, votedCount: votedPlayers.length })
    } catch (error: any) {
      console.error('[ntg_vote] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  // Relay: NTG is browsing situation cards — broadcast current card to others (read-only)
  socket.on('card_preview', ({ roomId, card }: { roomId: string; card: object | null }) => {
    socket.to(roomId).emit('card_preview', { card })
  })

  // Relay: NTG fan state for spectators (only position changes + initial cards)
  socket.on('situation_fan_state', ({ roomId, cards, activePosition }: { roomId: string; cards?: object[]; activePosition: number }) => {
    socket.to(roomId).emit('situation_fan_state', { cards, activePosition })
  })

  /**
   * NTG shares reflection card in reflection-sharing phase
   * Awards +5 yellow coins to NTG
   */
  socket.on('share_reflection', async ({ roomId, message }, callback) => {
    if (!rateLimitAction(socket, 'share_reflection', 2000)) {
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const actor = room.players.find((p) => p.socketId === socket.id)
      if (!actor) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Must be NTG or Narrator (narrator can confirm reward for NTG)
      const isNarrator = room.players.find(p => p.isNarrator)?.socketId === socket.id
      if (!actor.isSender && !isNarrator) {
        const error = { success: false, error: 'ONLY_NTG_OR_NARRATOR', message: 'Chỉ NTG hoặc Quản trò mới có thể xác nhận.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // If narrator is confirming, find the actual NTG
      const ntgPlayer = actor.isSender ? actor : room.players.find(p => p.isSender)
      if (!ntgPlayer) {
        const error = { success: false, error: 'NTG_NOT_FOUND', message: 'Không tìm thấy Người Trao Gửi.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Must be reflection-sharing phase
      if (room.phase !== 'reflection-sharing') {
        const error = { success: false, error: 'WRONG_PHASE', message: 'Không phải giai đoạn chia sẻ phản tư.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const gameAction = {
        type: 'SHARE_REFLECTION' as const,
        actorId: ntgPlayer.userId, // Use NTG's userId, not narrator's
        data: { message },
      }

      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const error = { success: false, error: result.error, message: result.error || 'Không thể chia sẻ.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      roomRepository.save(result.room!)
      console.log(`[share_reflection] ${isNarrator ? 'Narrator confirmed reward for' : ''} NTG ${ntgPlayer.socketId} in room ${roomId}`)

      io.to(roomId).emit('reflection_shared', {
        ntgId: ntgPlayer.userId,
        ntgName: ntgPlayer.name,
        message,
        bonus: 5,
        room: gameService.getPublicState(result.room!),
      })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[share_reflection] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Narrator confirms role completion rewards for Connector, Opener, and Guide.
   * A player gets +5 yellow if NTG already rewarded them, otherwise +2 yellow.
   */
  socket.on('confirm_role_rewards', async ({ roomId, targetSocketIds }, callback) => {
    if (!rateLimitAction(socket, 'confirm_role_rewards', 2000)) {
      const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ.' }
      if (callback) callback(error)
      else socket.emit('error', error)
      return
    }

    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const actor = room.players.find((p) => p.socketId === socket.id)
      if (!actor) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      if (!actor.isNarrator) {
        const error = { success: false, error: 'NOT_NARRATOR', message: 'Chỉ Quản trò mới có thể xác nhận phần thưởng vai trò.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      if (room.phase !== 'reflection-sharing') {
        const error = { success: false, error: 'WRONG_PHASE', message: 'Không phải giai đoạn xác nhận phần thưởng vai trò.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const targets: string[] = Array.isArray(targetSocketIds) ? targetSocketIds : []
      if (targets.length === 0) {
        const error = { success: false, error: 'NO_TARGET', message: 'Chưa chọn người chơi nào.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const eligibleRoles = new Set([Role.CONNECTOR, Role.OPENER, Role.GUIDE])
      const ntgVotedIds = new Set<string>(Object.values(room.ntgVotes ?? {}).flat())
      const alreadyRewardedIds = new Set(
        room.gameLog
          .filter((entry) => entry.type === 'ROLE_REWARD' && entry.targetId)
          .map((entry) => entry.targetId as string),
      )
      const now = Date.now()
      const rewards: Array<{ userId: string; socketId: string; name: string; bonus: number }> = []

      const updatedPlayers = room.players.map((player) => {
        if (!targets.includes(player.socketId) && !targets.includes(player.userId)) return player
        if (!player.originalRole || !eligibleRoles.has(player.originalRole)) return player
        if (alreadyRewardedIds.has(player.userId)) return player

        const bonus = ntgVotedIds.has(player.userId) ? 5 : 2
        rewards.push({ userId: player.userId, socketId: player.socketId, name: player.name, bonus })
        alreadyRewardedIds.add(player.userId)

        return {
          ...player,
          coins: {
            ...player.coins,
            yellow: player.coins.yellow + bonus,
          },
        }
      })

      if (rewards.length === 0) {
        const error = { success: false, error: 'NO_REWARDS_PROCESSED', message: 'Không có phần thưởng nào được áp dụng.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const updatedRoom = {
        ...room,
        players: updatedPlayers,
        lastActivity: now,
        gameLog: [
          ...room.gameLog,
          ...rewards.map((reward, index) => ({
            type: 'ROLE_REWARD',
            actorId: actor.userId,
            targetId: reward.userId,
            timestamp: now + index,
            data: { bonus: reward.bonus },
          })),
        ],
      }

      roomRepository.save(updatedRoom)

      io.to(roomId).emit('role_rewards_confirmed', {
        rewards,
        room: gameService.getPublicState(updatedRoom),
      })

      if (callback) callback({ success: true, rewards })
    } catch (error: any) {
      console.error('[confirm_role_rewards] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * End game — no scoring, just coin summary + closing ritual
   */
  socket.on('end_game', async ({ roomId }, callback) => {
    try {
      const room = roomRepository.findById(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Coin summary per player — no ranking, no score
      const coinSummary = room.players
        .filter((p) => !p.isFake)
        .map((p) => ({
          userId: p.userId,
          name: p.name,
          coins: {
            red: p.coins.red,
            yellow: p.coins.yellow,
            green: p.coins.green,
          },
        }))

      const updatedRoom = roomRepository.update(roomId, { status: 'ended', phase: 'ended' })
      if (updatedRoom) {
        // Ensure Redis save completes for ended game
        await roomRepository.saveAndWait(updatedRoom)
      }
      phaseTimer.clearTimer(roomId)

      console.log(`[end_game] Room ${roomId} ended`)
      io.to(roomId).emit('game_ended', { coinSummary })

      if (callback) callback({ success: true })
    } catch (error: any) {
      console.error('[end_game] Error:', error)
      const err = { success: false, error: 'INTERNAL_ERROR', message: error.message }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })
}
