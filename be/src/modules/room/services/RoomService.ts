import { Room, Player } from '../../game/types'
import { roomRepository } from '../repository/RoomRepository'

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
        p.userId === player.userId ? { ...p, socketId: player.socketId } : p
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

    // If only bots remain, delete room
    const hasRealPlayer = updatedPlayers.some((p) => !p.isFake)
    if (!hasRealPlayer) {
      roomRepository.delete(roomId)
      return null
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
      nightActions: room.nightActions,
      debugRolePickerEnabled: room.debugRolePickerEnabled,
    }
  }
}

// Singleton instance
export const roomService = new RoomService()
