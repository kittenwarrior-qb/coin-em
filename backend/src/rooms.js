import { loadRooms, autoSave, cleanupRooms } from './persistence.js'

/**
 * In-memory room store with persistence
 * Room shape:
 * {
 *   id: string,
 *   host: string (socketId),
 *   players: [{ socketId, name }],
 *   status: 'waiting' | 'playing' | 'ended',
 *   currentRound: number,
 *   currentNTG: string | null,
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
    host: host.socketId,
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
  room.players = room.players.filter(p => p.socketId !== socketId)
  // if host left, promote next player
  if (room.host === socketId && room.players.length > 0) {
    room.host = room.players[0].socketId
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
  if (room.host !== hostSocketId) return { error: 'not_host' }
  if (room.status !== 'waiting') return { error: 'already_started' }
  if (room.players.length < 2) return { error: 'not_enough_players' }
  room.status = 'playing'
  room.currentRound = 1
  room.lastActivity = Date.now()
  autoSave(rooms)
  return { room }
}

export function publicRoomState(room) {
  return {
    id: room.id,
    host: room.host,
    players: room.players,
    status: room.status,
    currentRound: room.currentRound,
    currentNTG: room.currentNTG,
  }
}
