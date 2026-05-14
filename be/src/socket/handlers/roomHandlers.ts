import { Server, Socket } from 'socket.io'
import { roomRepository, roomService } from '../../modules/room'
import { Player, Role } from '../../modules/game/types'
import { cancelDisconnectTimer } from './playerHandlers'

export function registerRoomHandlers(io: Server, socket: Socket) {
  const AVATAR_COUNT = 22
  const BG_COUNT = 12

  function randomAvatarIndex() { return Math.floor(Math.random() * AVATAR_COUNT) }
  function randomBgIndex()     { return Math.floor(Math.random() * BG_COUNT) }

  function getDebugRoleDeck(count: number): Role[] {
    switch (count) {
      case 5:
        return [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.CONNECTOR, Role.OPENER]
      case 6:
        return [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.CONNECTOR, Role.OPENER, Role.GUIDE]
      case 7:
        return [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.CONNECTOR, Role.OPENER, Role.GUIDE, Role.HEALER]
      case 8:
        return [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.SILENCER, Role.CONNECTOR, Role.OPENER, Role.GUIDE, Role.HEALER]
      case 9:
        return [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.SILENCER, Role.CONNECTOR, Role.CONNECTOR, Role.OPENER, Role.GUIDE, Role.HEALER]
      case 10:
        return [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.SILENCER, Role.CONNECTOR, Role.CONNECTOR, Role.OPENER, Role.OPENER, Role.GUIDE, Role.HEALER]
      default:
        return []
    }
  }

  function countRoles(roles: Role[]): Partial<Record<Role, number>> {
    return roles.reduce<Partial<Record<Role, number>>>((acc, role) => {
      acc[role] = (acc[role] ?? 0) + 1
      return acc
    }, {})
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
  socket.on('join_room', ({ name, roomId, userId, createIfMissing = false }) => {
    if (!name || !roomId || !userId) {
      return socket.emit('error', {
        code: 'invalid_params',
        message: 'name, roomId và userId là bắt buộc.',
      })
    }

    let room = roomRepository.findById(roomId)

    if (!room) {
      if (!createIfMissing) {
        return socket.emit('error', {
          code: 'room_not_found',
          message: `Phòng "${roomId}" không tồn tại.`,
        })
      }

      // Create new room
      const host: Player = {
        socketId: socket.id,
        userId,
        name,
        avatarIndex: randomAvatarIndex(),
        bgIndex: randomBgIndex(),
        coins: { red: 0, yellow: 0, green: 0 },
      }

      room = roomService.createRoom(roomId, host)
      socket.join(roomId)
      console.log(`[create_room] ${name} (userId: ${userId}) tạo phòng ${roomId}`)
    } else {
      if (room.status !== 'waiting') {
        return socket.emit('error', {
          code: 'game_in_progress',
          message: 'Trò chơi đã bắt đầu, không thể tham gia.',
        })
      }

      if (room.players.length >= 11) {
        return socket.emit('error', {
          code: 'room_full',
          message: 'Phòng đã đủ 11 người.',
        })
      }

      // Cancel any pending disconnect timer for this player's old socket
      const existingPlayer = room.players.find((p) => p.userId === userId)
      if (existingPlayer) {
        cancelDisconnectTimer(existingPlayer.socketId)
      }

      // Add or update player
      const player: Player = {
        socketId: socket.id,
        userId,
        name,
        avatarIndex: existingPlayer?.avatarIndex ?? randomAvatarIndex(),
        bgIndex: existingPlayer?.bgIndex ?? randomBgIndex(),
        coins: { red: 0, yellow: 0, green: 0 },
      }

      room = roomService.addPlayer(roomId, player)
      socket.join(roomId)
      console.log(`[join_room] ${name} (userId: ${userId}) vào phòng ${roomId}`)
    }

    // Send state to joiner
    socket.emit('room_state', roomService.getPublicState(room!))

    // Notify others
    socket.to(roomId).emit('player_joined', {
      socketId: socket.id,
      userId,
      name,
      players: room!.players,
    })
  })

  /**
   * Reconnect to room
   */
  socket.on('reconnect_room', ({ roomId, userId, name }) => {
    if (!roomId || !userId) {
      return socket.emit('error', {
        code: 'invalid_params',
        message: 'roomId và userId là bắt buộc.',
      })
    }

    const room = roomRepository.findById(roomId)
    if (!room) {
      return socket.emit('error', {
        code: 'room_not_found',
        message: 'Phòng không còn tồn tại.',
      })
    }

    // Find player by userId
    const existingPlayer = room.players.find((p) => p.userId === userId)

    if (existingPlayer) {
      // Cancel any pending disconnect timer for old socket
      cancelDisconnectTimer(existingPlayer.socketId)

      // Update socket ID
      const updatedPlayers = room.players.map((p) =>
        p.userId === userId ? { ...p, socketId: socket.id } : p
      )

      roomRepository.update(roomId, { players: updatedPlayers })
      socket.join(roomId)

      console.log(`[reconnect_room] ${name} (userId: ${userId}) reconnected`)

      const updatedRoom = roomRepository.findById(roomId)
      socket.emit('room_state', roomService.getPublicState(updatedRoom!))
      socket.to(roomId).emit('player_joined', {
        socketId: socket.id,
        userId,
        name,
        players: updatedRoom!.players,
      })
    } else {
      return socket.emit('error', {
        code: 'player_not_found',
        message: 'Không tìm thấy người chơi trong phòng.',
      })
    }
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
  socket.on('get_room_state', ({ roomId }) => {
    const room = roomRepository.findById(roomId)
    if (!room) {
      return socket.emit('error', {
        code: 'room_not_found',
        message: 'Phòng không tồn tại.',
      })
    }
    socket.emit('room_state', roomService.getPublicState(room))
  })

  /**
   * Add fake players (debug)
   */
  socket.on('add_fake_players', ({ roomId, count = 1 }) => {
    const result = roomService.addFakePlayers(roomId, count)

    if ('error' in result) {
      const messages = {
        room_not_found: 'Phòng không tồn tại.',
        game_already_started: 'Trò chơi đã bắt đầu, không thể thêm bot.',
        room_full: 'Phòng đã đủ 11 người.',
      }
      return socket.emit('error', {
        code: result.error,
        message: messages[result.error as keyof typeof messages],
      })
    }

    console.log(`[add_fake_players] Added ${result.added} fake player(s) to room ${roomId}`)
    io.to(roomId).emit('room_state', roomService.getPublicState(result.room))
  })

  /**
   * Debug role picker: host assigns first-round roles in the waiting room.
   */
  socket.on('set_debug_role_preference', ({ roomId, userId, targetUserId, role }) => {
    if (process.env.DEBUG_ROLE_PICKER !== 'true') {
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

    const selectedRole = role as Role
    const roleDeck = getDebugRoleDeck(room.players.length)
    if (!roleDeck.length || !roleDeck.includes(selectedRole)) {
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
    io.to(roomId).emit('room_state', roomService.getPublicState(updatedRoom!))
  })

  /**
   * Update room settings (host only)
   */
  socket.on('update_room_settings', ({ roomId, userId, settings }) => {
    if (!roomId || !userId || !settings) {
      return socket.emit('error', {
        code: 'invalid_params',
        message: 'roomId, userId và settings là bắt buộc.',
      })
    }

    const room = roomRepository.findById(roomId)
    if (!room) {
      return socket.emit('error', {
        code: 'room_not_found',
        message: 'Phòng không tồn tại.',
      })
    }

    // Only host can update settings
    if (room.host !== userId) {
      return socket.emit('error', {
        code: 'not_host',
        message: 'Chỉ host mới có thể thay đổi cài đặt.',
      })
    }

    // Can only update in waiting phase
    if (room.status !== 'waiting') {
      return socket.emit('error', {
        code: 'game_in_progress',
        message: 'Không thể thay đổi cài đặt khi game đã bắt đầu.',
      })
    }

    // Validate settings
    const { situationGroups, emotionGroups } = settings

    if (!situationGroups || !Array.isArray(situationGroups) || situationGroups.length === 0) {
      return socket.emit('error', {
        code: 'invalid_settings',
        message: 'Phải chọn ít nhất 1 nhóm tình huống.',
      })
    }

    if (!emotionGroups || !Array.isArray(emotionGroups) || emotionGroups.length === 0) {
      return socket.emit('error', {
        code: 'invalid_settings',
        message: 'Phải chọn ít nhất 1 nhóm cảm xúc.',
      })
    }

    const validSituationGroups = ['light', 'medium', 'sensitive']
    const validEmotionGroups = ['basic', 'light', 'strong', 'advanced']

    if (!situationGroups.every((g: string) => validSituationGroups.includes(g))) {
      return socket.emit('error', {
        code: 'invalid_settings',
        message: 'Nhóm tình huống không hợp lệ.',
      })
    }

    if (!emotionGroups.every((g: string) => validEmotionGroups.includes(g))) {
      return socket.emit('error', {
        code: 'invalid_settings',
        message: 'Nhóm cảm xúc không hợp lệ.',
      })
    }

    // Update settings
    const updatedRoom = roomRepository.update(roomId, {
      settings: {
        situationGroups,
        emotionGroups,
      },
    })

    console.log(`[update_room_settings] Room ${roomId} settings updated by ${userId}`)
    io.to(roomId).emit('room_settings_updated', updatedRoom!.settings)
  })

  /**
   * Update player profile (name + avatarIndex + bgIndex)
   */
  socket.on('update_profile', ({ roomId, userId, name, avatarIndex, bgIndex }) => {
    if (!roomId || !userId || !name) {
      return socket.emit('error', { code: 'invalid_params', message: 'roomId, userId và name là bắt buộc.' })
    }

    const room = roomRepository.findById(roomId)
    if (!room) return

    const updatedPlayers = room.players.map(p =>
      p.userId === userId
        ? { ...p, name: name.trim(), avatarIndex: avatarIndex ?? p.avatarIndex, bgIndex: bgIndex ?? p.bgIndex }
        : p
    )

    const updatedRoom = roomRepository.update(roomId, { players: updatedPlayers })
    console.log(`[update_profile] ${userId} updated profile in room ${roomId}`)
    io.to(roomId).emit('room_state', roomService.getPublicState(updatedRoom!))
  })
}
