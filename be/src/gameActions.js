/**
 * Game Actions for EmCoin
 * Handle night phase actions, coin transactions, voting
 */

import { getRooms } from './rooms.js'
import { autoSave } from './persistence.js'
import { ROLES } from './roles.js'

/**
 * Healer action: Select a player to unmute
 */
export function healerAction(roomId, healerSocketId, targetSocketId) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  if (room.phase !== 'night-healer') return { error: 'wrong_phase' }
  
  const healer = room.players.find(p => p.socketId === healerSocketId)
  if (!healer || healer.role !== ROLES.HEALER) {
    return { error: 'not_healer' }
  }
  
  const target = room.players.find(p => p.socketId === targetSocketId)
  if (!target) return { error: 'target_not_found' }
  
  room.healedPlayer = target.userId // Use userId
  room.lastActivity = Date.now()
  autoSave(rooms)
  
  return { success: true, room }
}

/**
 * Silencer action: Select a player to mute
 */
export function silencerAction(roomId, silencerSocketId, targetSocketId) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  if (room.phase !== 'night-silencer') return { error: 'wrong_phase' }
  
  const silencer = room.players.find(p => p.socketId === silencerSocketId)
  if (!silencer || silencer.role !== ROLES.SILENCER) {
    return { error: 'not_silencer' }
  }
  
  const target = room.players.find(p => p.socketId === targetSocketId)
  if (!target) return { error: 'target_not_found' }
  
  // Apply mute (unless healed) - use userId
  room.players = room.players.map(p => ({
    ...p,
    isMuted: p.userId === target.userId && p.userId !== room.healedPlayer,
  }))
  
  room.mutedPlayer = target.userId // Use userId
  room.gameLog.push({
    round: room.currentRound,
    action: 'mute',
    actor: silencer.userId,
    target: target.userId,
    timestamp: Date.now(),
  })
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  
  return { success: true, room }
}

/**
 * Guide action: Select a card for the Sender
 */
export function guideAction(roomId, guideSocketId, cardData) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  if (room.phase !== 'night-guide') return { error: 'wrong_phase' }
  
  const guide = room.players.find(p => p.socketId === guideSocketId)
  if (!guide || guide.role !== ROLES.GUIDE) {
    return { error: 'not_guide' }
  }
  
  room.selectedCard = cardData
  room.lastActivity = Date.now()
  autoSave(rooms)
  
  return { success: true, room }
}

/**
 * Advance to next phase
 */
export function nextPhase(roomId) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  
  const phases = ['night-healer', 'night-silencer', 'night-guide', 'day']
  const currentIndex = phases.indexOf(room.phase)
  const nextIndex = (currentIndex + 1) % phases.length
  
  room.phase = phases[nextIndex]
  
  // If returning to day, increment round
  if (room.phase === 'day') {
    room.currentRound++
  }
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  
  return { success: true, room }
}

/**
 * Give coin transaction
 */
export function giveCoin(roomId, giverSocketId, receiverSocketId, coinType) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  
  const giver = room.players.find(p => p.socketId === giverSocketId)
  const receiver = room.players.find(p => p.socketId === receiverSocketId)
  
  if (!giver || !receiver) return { error: 'player_not_found' }
  
  // Red coins are infinite, don't decrement
  if (coinType === 'red') {
    room.gameLog.push({
      round: room.currentRound,
      action: 'give_coin',
      coinType: 'red',
      giver: giver.userId,
      receiver: receiver.userId,
      timestamp: Date.now(),
    })
  } else if (coinType === 'yellow') {
    // Yellow coin: decrement giver's yellow, increment receiver's green
    if (giver.coins.yellow <= 0) return { error: 'insufficient_coins' }
    
    room.players = room.players.map(p => {
      if (p.userId === giver.userId) {
        return { ...p, coins: { ...p.coins, yellow: p.coins.yellow - 1 } }
      }
      if (p.userId === receiver.userId) {
        return { ...p, coins: { ...p.coins, green: p.coins.green + 1 } }
      }
      return p
    })
    
    room.gameLog.push({
      round: room.currentRound,
      action: 'give_coin',
      coinType: 'yellow',
      giver: giver.userId,
      receiver: receiver.userId,
      timestamp: Date.now(),
    })
  }
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  
  return { success: true, room }
}

/**
 * Submit vote for Silencer
 */
export function submitVote(roomId, voterSocketId, suspectSocketId) {
  const rooms = getRooms()
  const room = rooms.get(roomId)
  
  if (!room) return { error: 'room_not_found' }
  
  const voter = room.players.find(p => p.socketId === voterSocketId)
  const suspect = room.players.find(p => p.socketId === suspectSocketId)
  
  if (!voter || !suspect) return { error: 'player_not_found' }
  
  if (!room.votes) room.votes = {}
  room.votes[voter.userId] = suspect.userId // Use userId
  
  room.lastActivity = Date.now()
  autoSave(rooms)
  
  return { success: true, room }
}

/**
 * Calculate final scores
 */
export function calculateScores(room) {
  return room.players.map(p => ({
    userId: p.userId,
    socketId: p.socketId,
    name: p.name,
    role: p.role,
    coins: p.coins,
    score: (p.coins.green * 3) + (p.coins.yellow * 2) + p.coins.red,
  })).sort((a, b) => b.score - a.score)
}
