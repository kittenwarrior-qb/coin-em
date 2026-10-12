import { Room, Player } from '../../game/types'
import { operationDiagnostic } from '../../../telemetry/operationalDiagnostics'
import { roomRepository } from '../repository/RoomRepository'
import { MAX_PLAYERS } from '../../game/engine/RoleDeck'
import { roomView } from '../../game/services/RoomView'
import { cleanupRooms } from '../../../persistence'
import { newRoomCatalogVersion } from '../../../catalog/runtimeCatalog'

export class RoomService {
  /**
   * Create new room
   */
  createRoom(roomId: string, host: Player, persist = true): Room {
    const room: Room = {
      id: roomId,
      catalogVersion: newRoomCatalogVersion(),
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
      debugRolePickerEnabled: process.env.NODE_ENV !== 'production' && process.env.DEBUG_ROLE_PICKER === 'true',
    }

    if (persist) roomRepository.save(room)
    return room
  }

  /**
   * Add player to room
   */
  addPlayer(roomId: string, player: Player): Room | null {
    const room = roomRepository.findById(roomId)
    if (!room) return null

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

    // Reconnecting a seated player is allowed even when the room is full.
    if (room.players.length >= MAX_PLAYERS || room.status !== 'waiting') return null
    // Add new player
    const updatedPlayers = [...room.players, player]
    return roomRepository.update(roomId, { players: updatedPlayers })
  }

  /**
   * Remove player from room
   */
  async removePlayer(roomId: string, socketId: string): Promise<Room | null> {
    const room = roomRepository.findById(roomId)
    if (!room) return null

    const leavingPlayer = room.players.find((p) => p.socketId === socketId)
    const updatedPlayers = room.players.filter((p) => p.socketId !== socketId)

    // If no players left, delete room
    if (updatedPlayers.length === 0) {
      if (!await roomRepository.deleteAndWait(roomId)) throw new Error('ROOM_DELETE_CONFLICT')
      return null
    }

    // If only bots remain AND game is not playing, delete room
    // Keep room if game is playing to allow reconnection
    const hasRealPlayer = updatedPlayers.some((p) => !p.isFake)
    if (!hasRealPlayer && room.status !== 'playing') {
      operationDiagnostic('room_delete', 'ok')
      if (!await roomRepository.deleteAndWait(roomId)) throw new Error('ROOM_DELETE_CONFLICT')
      return null
    }

    // If only bots remain but game is playing, keep room for potential reconnection
    if (!hasRealPlayer && room.status === 'playing') {
      operationDiagnostic('room_cleanup', 'ok')
    }

    // If host left, promote next real player (or first player if none)
    let newHost = room.host
    if (leavingPlayer && room.host === leavingPlayer.userId) {
      const nextReal = updatedPlayers.find((p) => !p.isFake)
      newHost = (nextReal ?? updatedPlayers[0]).userId
    }

    const updated = { ...room,
      players: updatedPlayers,
      host: newHost,
      lastActivity: Date.now(),
    }
    await roomRepository.saveAndWait(updated)
    return updated
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
    if (currentPlayerCount >= MAX_PLAYERS) return { error: 'room_full' }

    const maxToAdd = Math.min(count, MAX_PLAYERS - currentPlayerCount, fakeNames.length)

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
      .filter((room) => room.status === 'waiting' && room.players.length < MAX_PLAYERS)
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
    return roomView(room)
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

  cleanupDisconnectedRooms(now = Date.now()): Promise<string[]> {
    return cleanupRooms(roomRepository, now)
  }
}

// Singleton instance
export const roomService = new RoomService()
