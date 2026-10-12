import { Server, Socket } from 'socket.io'
import { operationDiagnostic } from '../../telemetry/operationalDiagnostics'
import { roomRepository, roomService } from '../../modules/room'
import { Player, Role, RoomSettings } from '../../modules/game/types'
import { cancelDisconnectTimer } from './playerHandlers'
import { getRoleDeck, MAX_PLAYERS } from '../../modules/game/engine/RoleDeck'
import { authenticateSeat, issueSeatSession, publicPlayer } from '../SeatSession'
import { roomView } from '../../modules/game/services/RoomView'
import { emitRoomView } from '../emitRoomView'
import { changeRoundLimit } from '../../modules/game/services/RoundLimit'
import { rateLimitAction } from '../middleware/rateLimiter'

export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on('set_round_limit', async (payload, callback) => {
    const reject = (error: string) => callback?.({ success: false, error, message: 'Chưa lưu số lượt. Kiểm tra số người và làm mới trạng thái phòng.' })
    if (!rateLimitAction(socket, 'set_round_limit', 500)) { reject('RATE_LIMITED'); return }
    try {
      if (!payload || Object.keys(payload).sort().join('|') !== 'expectedRevision|limit|requestId|roomId') { reject('INVALID_ROUND_LIMIT'); return }
      const room = await roomRepository.findByIdFresh(payload.roomId)
      const actor = room?.players.find(player => player.socketId === socket.id && !player.isDisconnected)
      if (!room || !actor) { reject('NOT_ROOM_MEMBER'); return }
      const updated = changeRoundLimit(room, actor.userId, payload)
      if (updated !== room) await roomRepository.saveAndWait(updated)
      await emitRoomView(io, updated, 'room_state')
      callback?.({ success: true, data: roomView(updated, actor.userId) })
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      reject(['NOT_HOST', 'GAME_ALREADY_STARTED', 'INVALID_ROUND_LIMIT', 'ROUND_REVISION_CONFLICT', 'ROUND_REQUEST_CONFLICT'].includes(code) ? code : 'INTERNAL_ERROR')
    }
  })
  const AVATAR_COUNT = 22
  const BG_COUNT = 12

  function randomAvatarIndex() { return Math.floor(Math.random() * AVATAR_COUNT) }
  function randomBgIndex()     { return Math.floor(Math.random() * BG_COUNT) }

  function parseSettings(value: unknown): RoomSettings | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const { situationGroups, emotionGroups } = value as RoomSettings
    const allowedSituation = ['light', 'medium', 'sensitive']
    const allowedEmotion = ['basic', 'light', 'strong', 'advanced']
    if (!Array.isArray(situationGroups) || situationGroups.length < 1 || situationGroups.length > 3 ||
      new Set(situationGroups).size !== situationGroups.length || !situationGroups.every(group => allowedSituation.includes(group)) ||
      !Array.isArray(emotionGroups) || emotionGroups.length < 1 || emotionGroups.length > 4 ||
      new Set(emotionGroups).size !== emotionGroups.length || !emotionGroups.every(group => allowedEmotion.includes(group))) return null
    return { situationGroups: [...situationGroups], emotionGroups: [...emotionGroups] }
  }

  function getDebugRoleDeck(count: number): Role[] {
    try { return getRoleDeck(count) } catch { return [] }
  }

  function countRoles(roles: Role[]): Partial<Record<Role, number>> {
    return roles.reduce<Partial<Record<Role, number>>>((acc, role) => {
      acc[role] = (acc[role] ?? 0) + 1
      return acc
    }, {})
  }

  function normalizeDebugRole(role: unknown): Role | null {
    if (typeof role !== 'string') return null
    if ((Object.values(Role) as string[]).includes(role)) return role as Role

    const compact = role
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

    if (compact.includes('quan tro')) return Role.NARRATOR
    if (compact.includes('trao gui')) return Role.SENDER
    if (compact.includes('im lang')) return Role.SILENCER
    if (compact.includes('ket noi')) return Role.CONNECTOR
    if (compact.includes('goi mo')) return Role.OPENER
    if (compact.includes('dan loi')) return Role.GUIDE
    if (compact.includes('chua lanh')) return Role.HEALER
    return null
  }

  function fillLastDebugRole(players: Player[], hostUserId: string, roleDeck: Role[]): Player[] {
    const selected = players
      .map(p => p.userId === hostUserId ? Role.NARRATOR : p.debugPreferredRole)
      .filter(Boolean) as Role[]
    const remaining = [...roleDeck]

    for (const role of selected) {
      const index = remaining.indexOf(role)
      if (index !== -1) remaining.splice(index, 1)
    }

    const unassigned = players.filter(p => p.userId !== hostUserId && !p.debugPreferredRole)
    if (unassigned.length !== 1 || remaining.length !== 1) return players

    return players.map(p =>
      p.userId === unassigned[0].userId
        ? { ...p, debugPreferredRole: remaining[0] }
        : p
    )
  }
  /**
   * Join or create room
   */
  type AdmissionAck = (result: { success: boolean; error?: string; code?: string; message?: string; session?: { roomId: string; userId: string; token: string; generation: number } }) => void

  function rejectAdmission(code: string, callback?: AdmissionAck) {
    const error = { success: false, error: code, code, message: code }
    if (callback) callback(error)
    else socket.emit('error', error)
  }

  async function resumeSeat(roomId: string, userId: string, token: unknown, callback?: AdmissionAck) {
    const room = await roomRepository.findByIdFresh(roomId)
    if (!room) return rejectAdmission('room_not_found', callback)
    const player = room.players.find(p => p.userId === userId && !p.isFake)
    if (!player || !authenticateSeat(player, token)) return rejectAdmission('INVALID_SESSION', callback)
    const activeSockets = await io.in(player.socketId).fetchSockets()
    const active = activeSockets.some(s => s.id === player.socketId && s.data.seatSession?.roomId === roomId &&
      s.data.seatSession?.generation === player.session!.generation)
    if (!authenticateSeat(player, token, Date.now(), active)) return rejectAdmission('INVALID_SESSION', callback)
    const bound = socket.data.seatSession
    if (bound && (bound.roomId !== roomId || bound.userId !== userId)) return rejectAdmission('ALREADY_SEATED', callback)
    const oldSocketId = player.socketId
    const generation = player.session!.generation + 1
    const updatedRoom = { ...room, lastActivity: Date.now(), players: room.players.map(p =>
      p.userId === userId ? { ...p, socketId: socket.id, isDisconnected: false, disconnectedAt: null,
        lastSeenAt: Date.now(), session: { ...p.session!, generation } } : p) }
    await roomRepository.saveAndWait(updatedRoom)
    socket.data.seatSession = { roomId, userId, generation }
    cancelDisconnectTimer(oldSocketId)
    await socket.join(roomId)
    if (oldSocketId !== socket.id) {
      io.to(oldSocketId).emit('session_replaced', { roomId })
      io.in(oldSocketId).disconnectSockets(true)
    }
    // Token stays stable for safe ACK-loss retries; only the active generation is replaced.
    callback?.({ success: true, session: { roomId, userId, token: token as string, generation } })
    socket.emit('room_state', roomView(updatedRoom, userId))
    await emitRoomView(io, updatedRoom, 'player_reconnected', {
      socketId: socket.id, userId, name: player.name,
      players: updatedRoom.players.map(publicPlayer), room: roomService.getPublicState(updatedRoom),
    }, socket.id)
  }

  socket.on('join_room', async ({ name, roomId, userId, createIfMissing = false, sessionToken, settings }, callback?: AdmissionAck) => {
    if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(userId) || typeof name !== 'string' || !name.trim() || typeof createIfMissing !== 'boolean') return rejectAdmission('invalid_params', callback)
    if (socket.data.seatSession) return rejectAdmission('ALREADY_SEATED', callback)
    let room = await roomRepository.findByIdFresh(roomId)
    if (room?.players.some(p => p.userId === userId)) {
      return resumeSeat(roomId, userId, sessionToken, callback)
    }
    if (!room && !createIfMissing) return rejectAdmission('room_not_found', callback)
    if (room && room.status !== 'waiting') return rejectAdmission('game_in_progress', callback)
    if (room && room.players.length >= MAX_PLAYERS) return rejectAdmission('room_full', callback)
    let initialSettings: RoomSettings | null = null
    if (settings !== undefined) {
      if (!createIfMissing) return rejectAdmission('invalid_params', callback)
      if (room) return rejectAdmission('room_already_exists', callback)
      initialSettings = parseSettings(settings)
      if (!initialSettings) return rejectAdmission('invalid_settings', callback)
    }
    const issued = issueSeatSession()
    const player: Player = {
      socketId: socket.id, userId, name: name.trim(), session: issued.session,
      isDisconnected: false, disconnectedAt: null, lastSeenAt: Date.now(),
      avatarIndex: randomAvatarIndex(), bgIndex: randomBgIndex(),
      coins: { red: 0, yellow: 0, green: 0 },
    }
    room = room ? { ...room, players: [...room.players, player], lastActivity: Date.now() }
      : roomService.createRoom(roomId, player, false)
    if (initialSettings) room = { ...room, settings: initialSettings }
    await roomRepository.saveAndWait(room)
    socket.data.seatSession = { roomId, userId, generation: 1 }
    await socket.join(roomId)
    callback?.({ success: true, session: { roomId, userId, token: issued.token, generation: 1 } })
    socket.emit('room_state', roomView(room, userId))
    await emitRoomView(io, room, 'player_joined', { socketId: socket.id, userId, name: player.name, players: room.players.map(publicPlayer) }, socket.id)
    io.emit('rooms_list', roomService.getAvailableRooms())
  })

  socket.on('reconnect_room', async ({ roomId, userId, sessionToken }, callback?: AdmissionAck) => {
    if (typeof userId !== 'string' || userId.length > 128) return rejectAdmission('invalid_params', callback)
    return resumeSeat(roomId, userId, sessionToken, callback)
  })

  /**
   * List available rooms
   */
  socket.on('list_rooms', () => {
    const availableRooms = roomService.getAvailableRooms()
    socket.emit('rooms_list', availableRooms)
  })

  /**
   * Get room state
   */
  socket.on('get_room_state', async ({ roomId }) => {
    const room = await roomRepository.findByIdFresh(roomId)
    if (!room) {
      return socket.emit('error', {
        code: 'room_not_found',
        message: 'Phòng không tồn tại.',
      })
    }
    socket.emit('room_state', roomView(room, room.players.find(p => p.socketId === socket.id)?.userId))
  })

  /**
   * Add fake players (debug)
   */
  socket.on('add_fake_players', async ({ roomId, count = 1 }) => {
    if (process.env.NODE_ENV === 'production') {
      return socket.emit('error', { code: 'debug_disabled', message: 'Debug actions are disabled in production.' })
    }
    const room = roomRepository.findById(roomId)
    const actor = room?.players.find((player) => player.socketId === socket.id)
    if (!room || !actor || actor.userId !== room.host) {
      return socket.emit('error', { code: 'not_host', message: 'Only the connected host can add debug players.' })
    }
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return socket.emit('error', { code: 'invalid_params', message: 'count must be an integer from 1 to 10.' })
    }
    const result = roomService.addFakePlayers(roomId, count)

    if ('error' in result) {
      const messages = {
        room_not_found: 'Phòng không tồn tại.',
        game_already_started: 'Trò chơi đã bắt đầu, không thể thêm bot.',
        room_full: 'Phòng đã đủ 10 người.',
      }
      return socket.emit('error', {
        code: result.error,
        message: messages[result.error as keyof typeof messages],
      })
    }

    operationDiagnostic('add_fake_players', 'ok')
    await emitRoomView(io, result.room, 'room_state')
  })

  /**
   * Debug role picker: host assigns first-round roles in the waiting room.
   */
  socket.on('set_debug_role_preference', async ({ roomId, userId, targetUserId, role }) => {
    if (process.env.NODE_ENV === 'production' || process.env.DEBUG_ROLE_PICKER !== 'true') {
      return socket.emit('error', {
        code: 'debug_role_picker_disabled',
        message: 'Debug role picker is disabled.',
      })
    }

    if (!roomId || !userId || !targetUserId || !role) {
      return socket.emit('error', {
        code: 'invalid_params',
        message: 'roomId, userId, targetUserId and role are required.',
      })
    }

    const room = roomRepository.findById(roomId)
    if (!room) {
      return socket.emit('error', {
        code: 'room_not_found',
        message: 'Room not found.',
      })
    }

    if (room.status !== 'waiting') {
      return socket.emit('error', {
        code: 'game_in_progress',
        message: 'Cannot change debug role after the game starts.',
      })
    }

    if (room.host !== userId) {
      return socket.emit('error', {
        code: 'not_host',
        message: 'Only host can assign debug roles.',
      })
    }

    const hostPlayer = room.players.find((p) => p.userId === userId)
    if (!hostPlayer || hostPlayer.socketId !== socket.id) {
      return socket.emit('error', {
        code: 'player_not_found',
        message: 'Host player not found.',
      })
    }

    const targetPlayer = room.players.find((p) => p.userId === targetUserId)
    if (!targetPlayer) {
      return socket.emit('error', {
        code: 'target_not_found',
        message: 'Target player not found.',
      })
    }

    const selectedRole = normalizeDebugRole(role)
    if (!selectedRole) {
      return socket.emit('error', {
        code: 'invalid_debug_role',
        message: 'Invalid debug role.',
      })
    }

    const roleDeck = getDebugRoleDeck(room.players.length)
    if (!roleDeck.length) {
      return socket.emit('error', {
        code: 'not_enough_players_for_debug_roles',
        message: 'Need at least 5 players before assigning debug roles.',
      })
    }

    if (!roleDeck.includes(selectedRole)) {
      return socket.emit('error', {
        code: 'invalid_debug_role',
        message: 'Invalid debug role.',
      })
    }

    if (targetUserId === room.host && selectedRole !== Role.NARRATOR) {
      return socket.emit('error', {
        code: 'host_role_locked',
        message: 'Host is locked as Narrator.',
      })
    }

    if (targetUserId !== room.host && selectedRole === Role.NARRATOR) {
      return socket.emit('error', {
        code: 'narrator_locked',
        message: 'Narrator is reserved for host.',
      })
    }

    const roleCapacity = countRoles(roleDeck)
    const selectedRoles = [
      Role.NARRATOR,
      ...room.players
        .filter((p) => p.userId !== room.host && p.userId !== targetUserId)
        .map((p) => p.debugPreferredRole)
        .filter(Boolean) as Role[],
      selectedRole,
    ]
    const selectedCounts = countRoles(selectedRoles)
    if ((selectedCounts[selectedRole] ?? 0) > (roleCapacity[selectedRole] ?? 0)) {
      return socket.emit('error', {
        code: 'role_quota_full',
        message: 'This role has already been assigned enough times.',
      })
    }

    const updatedPlayers = room.players.map((p) =>
      p.userId === targetUserId ? { ...p, debugPreferredRole: selectedRole } : p
    )
    const updatedRoom = roomRepository.update(roomId, {
      players: fillLastDebugRole(updatedPlayers, room.host, roleDeck),
    })
    await emitRoomView(io, updatedRoom!, 'room_state')
  })

  /**
   * Update room settings (host only)
   */
  socket.on('update_room_settings', async ({ roomId, userId, settings }, callback) => {
    const reject = (code: string, message: string) => callback ? callback({ success: false, error: code, message }) : socket.emit('error', { code, message })
    if (!roomId || !userId || !settings) {
      return reject('invalid_params', 'roomId, userId và settings là bắt buộc.')
    }

    const room = roomRepository.findById(roomId)
    if (!room) {
      return reject('room_not_found', 'Phòng không tồn tại.')
    }

    // Only host can update settings
    if (room.host !== userId || !room.players.some(p => p.socketId === socket.id && p.userId === room.host)) {
      return reject('not_host', 'Chỉ host mới có thể thay đổi cài đặt.')
    }

    // Can only update in waiting phase
    if (room.status !== 'waiting') {
      return reject('game_in_progress', 'Không thể thay đổi cài đặt khi game đã bắt đầu.')
    }

    const parsed = parseSettings(settings)
    if (!parsed) return reject('invalid_settings', 'Nhóm thẻ không hợp lệ hoặc bị trùng.')
    const updatedRoom = { ...room, settings: parsed, lastActivity: Date.now() }
    await roomRepository.saveAndWait(updatedRoom)

    operationDiagnostic('update_room_settings', 'ok')
    io.to(roomId).emit('room_settings_updated', updatedRoom!.settings)
    await emitRoomView(io, updatedRoom!, 'room_state')
    if (callback) callback({ success: true, data: roomView(updatedRoom, userId) })
  })

  /**
   * Update player profile (name + avatarIndex + bgIndex)
   */
  socket.on('update_profile', async ({ roomId, userId, name, avatarIndex, bgIndex }, callback) => {
    const reject = (code: string, message: string) => callback ? callback({ success: false, error: code, message }) : socket.emit('error', { code, message })
    if (!roomId || !userId || !name) {
      return reject('invalid_params', 'roomId, userId và name là bắt buộc.')
    }

    const room = roomRepository.findById(roomId)
    if (!room) return reject('ROOM_NOT_FOUND', 'Phòng không tồn tại.')
    if (!room.players.some(p => p.socketId === socket.id && p.userId === userId)) {
      return reject('NOT_PROFILE_OWNER', 'Chỉ được sửa hồ sơ của mình.')
    }
    if ((avatarIndex !== undefined && (!Number.isSafeInteger(avatarIndex) || avatarIndex < 0 || avatarIndex >= AVATAR_COUNT)) ||
      (bgIndex !== undefined && (!Number.isSafeInteger(bgIndex) || bgIndex < 0 || bgIndex >= BG_COUNT))) {
      return reject('INVALID_PROFILE', 'Ảnh đại diện hoặc nền không hợp lệ.')
    }

    const updatedPlayers = room.players.map(p =>
      p.userId === userId
        ? { ...p, name: name.trim(), avatarIndex: avatarIndex ?? p.avatarIndex, bgIndex: bgIndex ?? p.bgIndex }
        : p
    )

    const updatedRoom = { ...room, players: updatedPlayers, lastActivity: Date.now() }
    await roomRepository.saveAndWait(updatedRoom)
    operationDiagnostic('update_profile', 'ok')
    await emitRoomView(io, updatedRoom!, 'room_state')
    if (callback) callback({ success: true, data: roomView(updatedRoom, userId) })
  })
}
