import { loadRooms, autoSave, cleanupRooms } from './persistence.js'
import { assignRoles } from './roles.js'

/**
 * In-memory room store with persistence
 * Room shape:
 * {
 *   id: string,
 *   host: string (userId),
 *   players: [{ socketId, userId, name, role, isNarrator, isSender, isMuted, coins: {red, yellow, green} }],
 *   status: 'waiting' | 'playing' | 'ended',
 *   phase: 'day' | 'night-healer' | 'night-silencer' | 'night-guide',
 *   currentRound: number,
 *   currentNTG: string | null (userId),
 *   currentNarrator: string | null (userId),
 *   mutedPlayer: string | null (userId),
 *   healedPlayer: string | null (userId),
 *   selectedCard: object | null,
 *   gameLog: [],
 *   lastActivity: number (timestamp)
 * }
 */
const rooms = loadRooms()

// Cleanup old rooms every hour
setInterval(() => {
  cleanupRooms(rooms)
}, 60 * 60 * 1000)

export function getRooms() {
  return rooms
}

export function createRoom(roomId, host) {
  const room = {
    id: roomId,
    host: host.userId, // Use userId instead of socketId
    players: [host],
    status: 'waiting',
    currentRound: 0,
    currentNTG: null,
    lastActivity: Date.now(),
  }
  rooms.set(roomId, room)
  autoSave(rooms)
  return room
}

export function getRoom(roomId) {
  return rooms.get(roomId) ?? null
}

export function addPlayer(roomId, player) {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.players.length >= 11) return null // Maximum 11 players
  // prevent duplicate
  if (!room.players.find(p => p.socketId === player.socketId)) {
    room.players.push(player)
  }
  room.lastActivity = Date.now()
  autoSave(rooms)
  return room
}

export function removePlayer(roomId, socketId) {
  const room = rooms.get(roomId)
  if (!room) return null
  
  const leavingPlayer = room.players.find(p => p.socketId === socketId)
  room.players = room.players.filter(p => p.socketId !== socketId)
  
  // if host left, promote next player
  if (leavingPlayer && room.host === leavingPlayer.userId && room.players.length > 0) {
    room.host = room.players[0].userId
  }
  if (room.players.length === 0) {
    rooms.delete(roomId)
    autoSave(rooms)
    return null
  }
  room.lastActivity = Date.now()
  autoSave(rooms)
  return room
}

export function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.socketId === socketId)) return room
  }
  return null
}

export function startGame(roomId, hostSocketId) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'room_not_found' }
  
  // Find host by socketId to get userId
  const hostPlayer = room.players.find(p => p.socketId === hostSocketId)
  if (!hostPlayer || room.host !== hostPlayer.userId) return { error: 'not_host' }
  
  if (room.status !== 'waiting') return { error: 'already_started' }
  if (room.players.length < 7) return { error: 'not_enough_players' }
  if (room.players.length > 11) return { error: 'too_many_players' }
  
  // Assign roles to players
  try {
    room.players = assignRoles(room.players)
  } catch (error) {
    return { error: 'role_assignment_failed', message: error.message }
  }
  
  // Host is always Narrator (Quản trò)
  const hostIndex = room.players.findIndex(p => p.userId === room.host)
  if (hostIndex !== -1) {
    // Swap host with narrator
    const narratorIndex = room.players.findIndex(p => p.isNarrator)
    if (narratorIndex !== -1 && narratorIndex !== hostIndex) {
      const hostRole = room.players[hostIndex].role
      const narratorRole = room.players[narratorIndex].role
      
      room.players[hostIndex].role = narratorRole
      room.players[hostIndex].isNarrator = true
      room.players[hostIndex].isSender = false
      
      room.players[narratorIndex].role = hostRole
      room.players[narratorIndex].isNarrator = false
      room.players[narratorIndex].isSender = hostRole === 'Người Trao Gửi'
      
      console.log(`[startGame] Swapped roles: ${room.players[hostIndex].name} (host) is now Narrator, ${room.players[narratorIndex].name} is now ${hostRole}`)
    }
  }
  
  // Find Sender (NTG) and Narrator after swap - use userId
  const sender = room.players.find(p => p.isSender)
  const narrator = room.players.find(p => p.isNarrator)
  
  room.status = 'playing'
  room.phase = 'role-reveal' // Start with role reveal phase
  room.turn = 1 // Turn 1: Role reveal
  room.currentRound = 1
  room.totalRounds = room.players.length // Game ends after everyone has been narrator and sender
  room.currentNTG = sender?.userId || null // Use userId
  room.currentNarrator = narrator?.userId || room.host // Use userId
  room.mutedPlayer = null
  room.healedPlayer = null
  room.selectedCard = null
  room.gameLog = []
  room.lastActivity = Date.now()
  autoSave(rooms)
  return { room }
}

export function addFakePlayers(roomId, count = 1) {
  const room = rooms.get(roomId)
  if (!room) return { error: 'room_not_found' }
  if (room.status !== 'waiting') return { error: 'game_already_started' }
  
  const fakeNames = ['Bot Alice', 'Bot Bob', 'Bot Charlie', 'Bot Diana', 'Bot Eve', 'Bot Frank', 'Bot Grace', 'Bot Henry', 'Bot Ivy', 'Bot Jack']
  const currentPlayerCount = room.players.length
  
  // Maximum 11 players
  if (currentPlayerCount >= 11) return { error: 'room_full' }
  
  const maxToAdd = Math.min(count, 11 - currentPlayerCount, fakeNames.length)
  
  // Find which bot names are already used
  const usedNames = new Set(room.players.map(p => p.name))
  const availableNames = fakeNames.filter(name => !usedNames.has(name))
  
  for (let i = 0; i < maxToAdd; i++) {
    if (availableNames.length === 0) break
    
    const fakeId = `fake-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`
    const fakePlayer = {
      socketId: fakeId,
      userId: fakeId, // Fake players use same ID for both
      name: availableNames[i],
      isFake: true,
    }
    room.players.push(fakePlayer)
  }
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  return { room, added: maxToAdd }
}

export function publicRoomState(room) {
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
  }
}
