import { Room, Player } from '../../game/types'
import { roomRepository } from '../repository/RoomRepository'

const ROOM_DISCONNECT_TTL_MS = 2 * 60 * 60 * 1000

export class RoomService {
  /**
   * Create new room
   */
  createRoom(roomId: string, host: Player): Room {
    const room: Room = {
      id: roomId,
      host: host.userId,
      players: [host],
      status: 'waiting',
      phase: 'role-reveal',
      turn: 1,
      currentRound: 0,
      totalRounds: 0,
      currentNTG: null,
      currentNarrator: null,
      mutedPlayer: null,
      healedPlayer: null,
      selectedCard: null,
      votes: {},
      ntgVotes: {},
      nightActions: { silenced: false, healed: false, cardSelected: false },
      redCoinsGiven: {},
      yellowCoinsGiven: {},
      roleCompletions: {},
      responses: {},
      bonusesGiven: { healerBonus: false },
      gameLog: [],
      lastActivity: Date.now(),
      // Default settings: all groups enabled
      settings: {
        situationGroups: ['light', 'medium', 'sensitive'],
        emotionGroups: ['basic', 'light', 'strong', 'advanced'],
      },
      debugRolePickerEnabled: process.env.DEBUG_ROLE_PICKER === 'true',
    }

    roomRepository.save(room)
    return room
  }

  /**
   * Add player to room
   */
  addPlayer(roomId: string, player: Player): Room | null {
    const room = roomRepository.findById(roomId)
    if (!room) return null
    if (room.players.length >= 11) return null

    // Check if player already exists
    const existingPlayer = room.players.find((p) => p.userId === player.userId)
    if (existingPlayer) {
      // Update socket ID
      const updatedPlayers = room.players.map((p) =>
        p.userId === player.userId
          ? {
              ...p,
              socketId: player.socketId,
              deviceId: player.deviceId ?? p.deviceId,
              name: player.name || p.name,
              isDisconnected: false,
              disconnectedAt: null,
              lastSeenAt: Date.now(),
            }
          : p
      )
      return roomRepository.update(roomId, { players: updatedPlayers })
    }

    // Add new player
    const updatedPlayers = [...room.players, player]
    return roomRepository.update(roomId, { players: updatedPlayers })
  }

  /**
   * Remove player from room
   */
  removePlayer(roomId: string, socketId: string): Room | null {
    const room = roomRepository.findById(roomId)
    if (!room) return null

    const leavingPlayer = room.players.find((p) => p.socketId === socketId)
    const updatedPlayers = room.players.filter((p) => p.socketId !== socketId)

    // If no players left, delete room
    if (updatedPlayers.length === 0) {
      roomRepository.delete(roomId)
      return null
    }

    // If only bots remain AND game is not playing, delete room
    // Keep room if game is playing to allow reconnection
    const hasRealPlayer = updatedPlayers.some((p) => !p.isFake)
    if (!hasRealPlayer && room.status !== 'playing') {
      console.log(`[removePlayer] Deleting room ${roomId} - only bots remain in ${room.status} room`)
      roomRepository.delete(roomId)
      return null
    }

    // If only bots remain but game is playing, keep room for potential reconnection
    if (!hasRealPlayer && room.status === 'playing') {
      console.log(`[removePlayer] Keeping room ${roomId} - only bots remain but game is playing`)
    }

    // If host left, promote next real player (or first player if none)
    let newHost = room.host
    if (leavingPlayer && room.host === leavingPlayer.userId) {
      const nextReal = updatedPlayers.find((p) => !p.isFake)
      newHost = (nextReal ?? updatedPlayers[0]).userId
    }

    return roomRepository.update(roomId, {
      players: updatedPlayers,
      host: newHost,
    })
  }

  /**
   * Add fake players for testing
   */
  addFakePlayers(roomId: string, count: number = 1): { room: Room; added: number } | { error: string } {
    const room = roomRepository.findById(roomId)
    if (!room) return { error: 'room_not_found' }
    if (room.status !== 'waiting') return { error: 'game_already_started' }

    const fakeNames = [
      'Bot Alice',
      'Bot Bob',
      'Bot Charlie',
      'Bot Diana',
      'Bot Eve',
      'Bot Frank',
      'Bot Grace',
      'Bot Henry',
      'Bot Ivy',
      'Bot Jack',
    ]

    const currentPlayerCount = room.players.length
    if (currentPlayerCount >= 11) return { error: 'room_full' }

    const maxToAdd = Math.min(count, 11 - currentPlayerCount, fakeNames.length)

    // Find which bot names are already used
    const usedNames = new Set(room.players.map((p) => p.name))
    const availableNames = fakeNames.filter((name) => !usedNames.has(name))

    const newPlayers = [...room.players]

    for (let i = 0; i < maxToAdd && i < availableNames.length; i++) {
      const fakeId = `fake-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`
      const fakePlayer: Player = {
        socketId: fakeId,
        userId: fakeId,
        name: availableNames[i],
        isFake: true,
        coins: { red: 0, yellow: 0, green: 0 },
      }
      newPlayers.push(fakePlayer)
    }

    const updatedRoom = roomRepository.update(roomId, { players: newPlayers })
    return { room: updatedRoom!, added: maxToAdd }
  }

  /**
   * Get available rooms
   */
  getAvailableRooms(): Array<{ id: string; playerCount: number; hostName: string }> {
    const allRooms = roomRepository.findAll()
    return allRooms
      .filter((room) => room.status === 'waiting' && room.players.length < 8)
      .map((room) => ({
        id: room.id,
        playerCount: room.players.length,
        hostName: room.players[0]?.name || 'Unknown',
      }))
  }

  /**
   * Get public room state
   */
  getPublicState(room: Room): any {
    return {
      id: room.id,
      host: room.host,
      players: room.players,
      status: room.status,
      phase: room.phase,
      turn: room.turn,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      currentNTG: room.currentNTG,
      currentNarrator: room.currentNarrator,
      mutedPlayer: room.mutedPlayer,
      selectedCard: room.selectedCard,
      settings: room.settings,
      resumeExpiresAt: this.getResumeExpiresAt(room),
      gameLog: room.gameLog,
      nightActions: room.nightActions,
      debugRolePickerEnabled: room.debugRolePickerEnabled,
    }
  }

  markPlayerDisconnected(roomId: string, socketId: string): Room | null {
    const room = roomRepository.findById(roomId)
    if (!room) return null

    const disconnectedAt = Date.now()
    const updatedPlayers = room.players.map(p =>
      p.socketId === socketId
        ? { ...p, isDisconnected: true, disconnectedAt, lastSeenAt: disconnectedAt }
        : p
    )

    return roomRepository.update(roomId, { players: updatedPlayers })
  }

  reconnectPlayer(roomId: string, socketId: string, userId?: string, deviceId?: string, name?: string): Room | null {
    const room = roomRepository.findById(roomId)
    if (!room) return null

    let matched = false
    const updatedPlayers = room.players.map(p => {
      const sameUser = !!userId && p.userId === userId
      const sameDevice = !!deviceId && p.deviceId === deviceId
      if (!sameUser && !sameDevice) return p

      matched = true
      return {
        ...p,
        socketId,
        deviceId: deviceId ?? p.deviceId,
        name: name || p.name,
        isDisconnected: false,
        disconnectedAt: null,
        lastSeenAt: Date.now(),
      }
    })

    if (!matched) return null
    return roomRepository.update(roomId, { players: updatedPlayers })
  }

  cleanupDisconnectedRooms(now = Date.now()): string[] {
    const deleted: string[] = []

    for (const room of roomRepository.findAll()) {
      if (room.status === 'ended') continue

      const realPlayers = room.players.filter(p => !p.isFake)
      if (realPlayers.length === 0) {
        roomRepository.delete(room.id)
        deleted.push(room.id)
        continue
      }

      const allDisconnected = realPlayers.every(p => p.isDisconnected && p.disconnectedAt)
      if (!allDisconnected) continue

      const latestDisconnect = Math.max(...realPlayers.map(p => p.disconnectedAt ?? 0))
      if (latestDisconnect > 0 && now - latestDisconnect >= ROOM_DISCONNECT_TTL_MS) {
        roomRepository.delete(room.id)
        deleted.push(room.id)
      }
    }

    return deleted
  }

  private getResumeExpiresAt(room: Room): number | null {
    const realPlayers = room.players.filter(p => !p.isFake)
    if (realPlayers.length === 0) return Date.now() + ROOM_DISCONNECT_TTL_MS

    const allDisconnected = realPlayers.every(p => p.isDisconnected && p.disconnectedAt)
    if (!allDisconnected) return null

    return Math.max(...realPlayers.map(p => p.disconnectedAt ?? 0)) + ROOM_DISCONNECT_TTL_MS
  }
}

// Singleton instance
export const roomService = new RoomService()
