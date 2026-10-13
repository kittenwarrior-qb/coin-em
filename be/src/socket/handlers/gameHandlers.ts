import { Server, Socket } from 'socket.io'
import { operationDiagnostic } from '../../telemetry/operationalDiagnostics'
import { emitRoomView } from '../emitRoomView'
import { roomView } from '../../modules/game/services/RoomView'
import { roomRepository, roomService } from '../../modules/room'
import { gameService, Role } from '../../modules/game'
import { rateLimitAction } from '../middleware/rateLimiter'
import { phaseTimer } from '../../modules/game/PhaseTimer'
import { inRoomQueue } from '../roomQueue'
import { recordGameEvent } from '../../analytics/gameEvents'
import { receivedCoinTotal } from '../../modules/game/services/CoinCycle'
import { isCardEnabled, resolveWebCard } from '../../modules/game/services/CardCatalog'

const INTERNAL_ERROR_MESSAGE = 'Chưa thể xác nhận thao tác. Vui lòng kiểm tra lại trạng thái phòng.'

export function registerGameHandlers(io: Server, socket: Socket) {
  /**
   * Start game
   */
  socket.on('start_game', async ({ roomId, expectedRevision }, callback) => {
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
      if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision !== (room.revision ?? 0))) {
        callback?.({ success: false, error: 'ROUND_REVISION_CONFLICT', message: 'Phòng đã thay đổi. Kiểm tra lại số lượt trước khi bắt đầu.', data: roomView(room, hostPlayer.userId) }); return
      }
      const result = await gameService.startGame(room)

      if (!result.success) {
        const messages = {
          GAME_ALREADY_STARTED: 'Trò chơi đã bắt đầu rồi.',
          NOT_ENOUGH_PLAYERS: 'Cần ít nhất 5 người để bắt đầu.',
          TOO_MANY_PLAYERS: 'Tối đa 10 người chơi.',
          INVALID_ROUND_LIMIT: 'Số lượt vượt số người hiện có. Quản trò cần chọn lại.',
          CATALOG_UNAVAILABLE: 'Chưa tải được đúng bộ thẻ của phòng. Chưa bắt đầu trò chơi.',
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
      operationDiagnostic('start_game', 'ok')
      recordGameEvent('game')
      await emitRoomView(io, result.room!, 'game_started')

      // General phase timers stay disabled in the approved manual baseline.
      phaseTimer.clearTimer(roomId)

      if (callback) callback({ success: true, data: roomView(result.room!, hostPlayer.userId) })
    } catch {
      operationDiagnostic('start_game', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Advance turn
   */
  socket.on('next_turn', async ({ roomId }, callback) => {
    try {
      const room = await roomRepository.findByIdFresh(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Find narrator by current socket first, then stable browser identity after reload/reconnect.
      const narratorPlayer = room.players.find(p => p.socketId === socket.id && !p.isDisconnected)
      if (!narratorPlayer) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'Người chơi không tồn tại.' }
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
        operationDiagnostic('next_turn', 'ok')
        phaseTimer.clearTimer(roomId) // Clear timer when game ends
        await emitRoomView(io, result.room!, 'game_ended')
      } else {
        operationDiagnostic('next_turn', 'ok')
        await emitRoomView(io, result.room!, 'turn_changed')

        phaseTimer.clearTimer(roomId)
      }

      if (callback) callback({ success: true, data: roomView(result.room!, narratorPlayer.userId) })
    } catch {
      operationDiagnostic('next_turn', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Move back one phase
   */
  socket.on('prev_turn', async ({ roomId }, callback) => {
    try {
      const room = await roomRepository.findByIdFresh(roomId)
      if (!room) {
        const error = { success: false, error: 'ROOM_NOT_FOUND', message: 'PhÃ²ng khÃ´ng tá»“n táº¡i.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      const narratorPlayer = room.players.find(p => p.socketId === socket.id && !p.isDisconnected)
      if (!narratorPlayer) {
        const error = { success: false, error: 'PLAYER_NOT_FOUND', message: 'NgÆ°á»i chÆ¡i khÃ´ng tá»“n táº¡i.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }


      const phaseBefore = room.phase

      const result = await gameService.previousTurn(room, narratorPlayer.userId)

      if (!result.success) {
        operationDiagnostic('prev_turn', 'rejected')
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
      const publicState = roomView(result.room!, narratorPlayer.userId)
      operationDiagnostic('prev_turn', 'ok')
      await emitRoomView(io, result.room!, 'turn_changed')

      if (callback) callback({ success: true, data: publicState, previousPhase: phaseBefore, phase: result.room!.phase })
    } catch {
      operationDiagnostic('prev_turn', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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
      if (result.room!.currentNarrator && ['healer-turn', 'silencer-turn'].includes(result.room!.phase)) {
        result.room!.pendingAutoAdvance = {
          kind: 'night', dueAt: Date.now() + 1200, phase: result.room!.phase,
          phaseInstance: result.room!.phaseInstance, round: result.room!.currentRound,
          narratorId: result.room!.currentNarrator,
        }
      }
      await roomRepository.saveAndWait(result.room!)

      // Broadcast night action to all clients
      operationDiagnostic('night_action', 'ok')
      await emitRoomView(io, result.room!, 'night_action_completed', {
        action,
        actorId: actor.userId,
        targetId: target.userId,
        actorSocketId: actor.socketId,
        targetSocketId: target.socketId,      })

      if (callback) callback({ success: true })

    } catch {
      operationDiagnostic('night_action', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  /**
   * Give coin
   */
  socket.on('give_coin', async ({ roomId, receiverSocketId, coinType, amount = 1, requestId, round }, callback) => {
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
        data: { coinType, amount, requestId, round },
      }

      // Execute via engine
      const result = await gameService.executeAction(room, gameAction)

      if (!result.success) {
        const error = { success: false, error: result.error, message: result.error || 'Không thể tặng coin' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // The engine validates the complete receipt fingerprint, including actor,
      // target, color, amount and round. Replaying a committed receipt is a read:
      // it must not consume rate limit, create a revision or replay celebrations.
      const duplicate = room.coinCycle?.transfers.some(transfer => transfer.id === requestId)
      if (duplicate) {
        if (callback) callback({ success: true, data: roomView(room, giver.userId) })
        return
      }
      if (!rateLimitAction(socket, 'give_coin', 1000)) {
        const error = { success: false, error: 'RATE_LIMITED', message: 'Vui lòng chờ trước khi tặng coin tiếp theo.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }

      // Acknowledge only after the critical coin snapshot has been saved.
      await roomRepository.saveAndWait(result.room!)

      // Broadcast
      operationDiagnostic('give_coin', 'ok')
      await emitRoomView(io, result.room!, 'coin_given', {
        giver: giver.userId,
        receiver: receiver.userId,
        coinType,      })

      if (callback) callback({ success: true, data: roomView(result.room!, giver.userId) })
    } catch {
      operationDiagnostic('give_coin', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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
      await roomRepository.saveAndWait(result.room!)

      operationDiagnostic('submit_vote', 'ok')
      socket.emit('vote_submitted', { success: true, room: roomView(result.room!, voter.userId) })
      await emitRoomView(io, result.room!, 'vote_updated', {})

      // Check if all voted
      if (result.autoAdvance) {
        operationDiagnostic('submit_vote', 'ok')
        await emitRoomView(io, result.room!, 'voting_complete', { votes: result.room!.votes })
      }

      if (callback) callback({ success: true })
    } catch {
      operationDiagnostic('submit_vote', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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

      if (type !== 'SELECT_SELFCARE_CARD' && type !== 'SELECT_CARD') {
        const error = { success: false, error: 'INVALID_CARD_ACTION', message: 'Loại thao tác thẻ không hợp lệ.' }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }
      const actionType = type
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

      const autoCardPhase = result.room!.phase
      if (result.room!.currentNarrator &&
        ((actionType === 'SELECT_CARD' && ['situation-card', 'emotion-card'].includes(autoCardPhase)) ||
         (actionType === 'SELECT_SELFCARE_CARD' && autoCardPhase === 'selfcare-card'))) {
        result.room!.pendingAutoAdvance = {
          kind: 'card', dueAt: Date.now() + (autoCardPhase === 'situation-card' ? 2000 : 350),
          phase: autoCardPhase, phaseInstance: result.room!.phaseInstance,
          round: result.room!.currentRound, narratorId: result.room!.currentNarrator,
        }
      }
      await roomRepository.saveAndWait(result.room!)
      operationDiagnostic('select_card', 'ok')
      await emitRoomView(io, result.room!, 'card_selected', {
        actorId: actor.userId,
        card: result.room!.selectedCard,
        type: actionType,      })


      if (callback) callback({ success: true })
    } catch {
      operationDiagnostic('select_card', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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

      await roomRepository.saveAndWait(result.room!)
      operationDiagnostic('send_response', 'ok')

      // Broadcast response to all (so everyone sees who responded)
      await emitRoomView(io, result.room!, 'response_received', {
        actorId: actor.userId,
        actorName: actor.name,
        message,      })

      if (callback) callback({ success: true })
    } catch {
      operationDiagnostic('send_response', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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
          operationDiagnostic('ntg_vote', 'rejected')
          continue
        }

        const gameAction = {
          type: 'NTG_VOTE' as const,
          actorId: actor.userId,
          targetId: target.userId,
        }

        const result = await gameService.executeAction(updatedRoom, gameAction)
        if (!result.success) {
          operationDiagnostic('ntg_vote', 'rejected')
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

      await roomRepository.saveAndWait(updatedRoom)
      operationDiagnostic('ntg_vote', 'ok')

      // Emit event for each voted player
      for (const voted of votedPlayers) {
        await emitRoomView(io, updatedRoom, 'ntg_vote_cast', {
          ntgId: actor.userId,
          votedId: voted.userId,
          votedName: voted.name,
          bonus: 5,        })
      }

      if (callback) callback({ success: true, votedCount: votedPlayers.length })
    } catch {
      operationDiagnostic('ntg_vote', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })

  // Relay: NTG is browsing situation cards — broadcast current card to others (read-only)
  socket.on('card_preview', ({ roomId, card }: { roomId: string; card: object | null }) => {
    const room = roomRepository.findById(roomId)
    const resolved = card === null ? null : resolveWebCard(card, room ?? undefined)
    if (!room || (card !== null && (!resolved || resolved.category !== 'situation' || !isCardEnabled(room, resolved)))) return
    socket.to(roomId).emit('card_preview', { card: resolved })
  })

  // Relay: NTG fan state for spectators (only position changes + initial cards)
  socket.on('situation_fan_state', ({ roomId, cards, activePosition }: { roomId: string; cards?: object[]; activePosition: number }) => {
    const room = roomRepository.findById(roomId)
    if (!room) return
    const resolved = cards?.map(card => resolveWebCard(card, room ?? undefined))
    if (resolved && (resolved.some(card => !card || card.category !== 'situation' || !isCardEnabled(room, card)) ||
        new Set(resolved.map(card => card!.id)).size !== resolved.length || activePosition >= resolved.length)) return
    socket.to(roomId).emit('situation_fan_state', { cards: resolved, activePosition })
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

      await roomRepository.saveAndWait(result.room!)
      operationDiagnostic('share_reflection', 'ok')

      await emitRoomView(io, result.room!, 'reflection_shared', {
        ntgId: ntgPlayer.userId,
        ntgName: ntgPlayer.name,
        message,
        bonus: 5,      })

      if (callback) callback({ success: true })
    } catch {
      operationDiagnostic('share_reflection', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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

      if (room.coinCycle) {
        if (callback) callback({ success: true, rewards: [] })
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

      await roomRepository.saveAndWait(updatedRoom)

      await emitRoomView(io, updatedRoom, 'role_rewards_confirmed', {
        rewards,      })

      if (callback) callback({ success: true, rewards })
    } catch {
      operationDiagnostic('confirm_role_rewards', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
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

      const actor = room.players.find(p => p.socketId === socket.id)
      if (!actor || actor.userId !== room.currentNarrator) {
        if (callback) callback({ success: false, error: 'NOT_NARRATOR' })
        else socket.emit('error', { success: false, error: 'NOT_NARRATOR' })
        return
      }
      const result = await gameService.endGame(room, actor.userId)
      if (!result.success || !result.room) {
        const error = { success: false, error: result.error }
        if (callback) callback(error)
        else socket.emit('error', error)
        return
      }
      const finalRoom = result.room
      // Coin summary per player — no ranking, no score
      const coinSummary = room.players
        .filter((p) => !p.isFake)
        .map((p) => ({
          userId: p.userId,
          name: p.name,
          coins: receivedCoinTotal(finalRoom, p.userId),
        }))

      const updatedRoom = finalRoom
      if (updatedRoom) {
        // Ensure Redis save completes for ended game
        await roomRepository.saveAndWait(updatedRoom)
      }
      phaseTimer.clearTimer(roomId)

      operationDiagnostic('end_game', 'ok')
      await emitRoomView(io, updatedRoom, 'game_ended', { coinSummary }, undefined, true)

      if (callback) callback({ success: true, data: roomView(updatedRoom, actor.userId) })
    } catch {
      operationDiagnostic('end_game', 'failed')
      const err = { success: false, error: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE }
      if (callback) callback(err)
      else socket.emit('error', err)
    }
  })
}
