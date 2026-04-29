import { getRooms } from './rooms.js'
import { autoSave } from './persistence.js'

/**
 * Game phases:
 * - role-reveal: Turn 1 - Players see their roles
 * - night: Turn 2 - Night phase (Silencer and Healer act)
 * - day: Turn 3 - Day phase (Sender draws cards, shares, coin giving)
 * 
 * After Turn 3, game goes back to Turn 1 with new round
 */

export function nextTurn(roomId, narratorSocketId) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  
  // Find narrator by socketId to get userId
  const narratorPlayer = room.players.find(p => p.socketId === narratorSocketId)
  if (!narratorPlayer || room.currentNarrator !== narratorPlayer.userId) return { error: 'not_narrator' }
  
  const currentTurn = room.turn || 1
  
  if (currentTurn === 1) {
    // Turn 1 -> Turn 2: Role reveal -> Night
    room.turn = 2
    room.phase = 'night'
    room.mutedPlayer = null
    room.healedPlayer = null
  } else if (currentTurn === 2) {
    // Turn 2 -> Turn 3: Night -> Day
    room.turn = 3
    room.phase = 'day'
  } else if (currentTurn === 3) {
    // Turn 3 -> Turn 1: Day -> New Round
    room.currentRound += 1
    
    // Check if game should end
    if (room.currentRound > room.totalRounds) {
      room.status = 'ended'
      room.phase = 'ended'
      autoSave(rooms)
      return { room, gameEnded: true }
    }
    
    // Rotate roles for new round
    rotateRoles(room)
    
    room.turn = 1
    room.phase = 'role-reveal'
    room.mutedPlayer = null
    room.healedPlayer = null
    room.selectedCard = null
  }
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  return { room }
}

function rotateRoles(room) {
  // Rotate narrator and sender to next players
  // Simple rotation: move roles to next player in list
  
  const currentNarratorIndex = room.players.findIndex(p => p.isNarrator)
  const currentSenderIndex = room.players.findIndex(p => p.isSender)
  
  if (currentNarratorIndex === -1 || currentSenderIndex === -1) return
  
  // Clear current roles
  room.players[currentNarratorIndex].isNarrator = false
  room.players[currentSenderIndex].isSender = false
  
  // Assign to next players (circular)
  const nextNarratorIndex = (currentNarratorIndex + 1) % room.players.length
  const nextSenderIndex = (currentSenderIndex + 1) % room.players.length
  
  room.players[nextNarratorIndex].role = 'Người Quản trò'
  room.players[nextNarratorIndex].isNarrator = true
  
  room.players[nextSenderIndex].role = 'Người Trao Gửi'
  room.players[nextSenderIndex].isSender = true
  
  // Update room state - use userId
  room.currentNarrator = room.players[nextNarratorIndex].userId
  room.currentNTG = room.players[nextSenderIndex].userId
}

export function nightAction(roomId, action, actorSocketId, targetSocketId) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  if (room.phase !== 'night') return { error: 'not_night_phase' }
  
  const actor = room.players.find(p => p.socketId === actorSocketId)
  if (!actor) return { error: 'player_not_found' }
  
  const target = room.players.find(p => p.socketId === targetSocketId)
  if (!target) return { error: 'target_not_found' }
  
  if (action === 'silence') {
    if (actor.role !== 'Người Im Lặng') return { error: 'not_silencer' }
    room.mutedPlayer = target.userId // Use userId
  } else if (action === 'heal') {
    if (actor.role !== 'Người Chữa Lành') return { error: 'not_healer' }
    room.healedPlayer = target.userId // Use userId
    // If healed player was muted, remove mute
    if (room.mutedPlayer === target.userId) {
      room.mutedPlayer = null
    }
  }
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  return { room }
}
