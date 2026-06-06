import { describe, it, expect, beforeEach } from 'vitest'
import { TurnManager } from '../../src/modules/game/engine/TurnManager'
import { Role } from '../../src/modules/game/types'
import { createPlayingRoom, setRoomPhase } from '../helpers/mockData'

describe('TurnManager', () => {
  let turnManager: TurnManager

  beforeEach(() => {
    turnManager = new TurnManager()
  })

  describe('getNextPhase', () => {
    it('should return correct next phase in sequence', () => {
      expect(turnManager.getNextPhase('role-reveal')).toBe('night')
      expect(turnManager.getNextPhase('night')).toBe('healer-turn')
      expect(turnManager.getNextPhase('healer-turn')).toBe('silencer-turn')
      expect(turnManager.getNextPhase('silencer-turn')).toBe('situation-card')
      expect(turnManager.getNextPhase('situation-card')).toBe('emotion-card')
      expect(turnManager.getNextPhase('emotion-card')).toBe('story-telling')
      expect(turnManager.getNextPhase('story-telling')).toBe('group-response')
      expect(turnManager.getNextPhase('group-response')).toBe('reflection-card')
      expect(turnManager.getNextPhase('reflection-card')).toBe('reflection-sharing')
      expect(turnManager.getNextPhase('reflection-sharing')).toBe('selfcare-card')
      expect(turnManager.getNextPhase('selfcare-card')).toBe('hug-action')
      expect(turnManager.getNextPhase('hug-action')).toBe('guess-silencer')
      expect(turnManager.getNextPhase('guess-silencer')).toBe('reveal-silencer')
      expect(turnManager.getNextPhase('reveal-silencer')).toBe('give-coins')
      expect(turnManager.getNextPhase('give-coins')).toBe('reward')
    })

    it('should loop back to role-reveal after reward', () => {
      expect(turnManager.getNextPhase('reward')).toBe('role-reveal')
    })

    it('should handle invalid phase gracefully', () => {
      expect(turnManager.getNextPhase('ended')).toBe('role-reveal')
    })
  })

  describe('shouldStartNewRound', () => {
    it('should return true when at reward phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      expect(turnManager.shouldStartNewRound(room)).toBe(true)
    })

    it('should return false for other phases', () => {
      const phases = ['role-reveal', 'night', 'healer-turn', 'situation-card', 'guess-silencer']
      
      phases.forEach(phase => {
        const room = setRoomPhase(createPlayingRoom(7), phase as any)
        expect(turnManager.shouldStartNewRound(room)).toBe(false)
      })
    })
  })

  describe('shouldRotateRoles', () => {
    it('should return true when at reward phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      expect(turnManager.shouldRotateRoles(room)).toBe(true)
    })

    it('should return false for other phases', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      expect(turnManager.shouldRotateRoles(room)).toBe(false)
    })
  })

  describe('getNextRound', () => {
    it('should increment round when at reward phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      room.currentRound = 3

      expect(turnManager.getNextRound(room)).toBe(4)
    })

    it('should not increment round for other phases', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      room.currentRound = 3

      expect(turnManager.getNextRound(room)).toBe(3)
    })
  })

  describe('shouldEndGame', () => {
    it('should return true when next round exceeds total rounds', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      room.currentRound = 7
      room.totalRounds = 7

      expect(turnManager.shouldEndGame(room)).toBe(true)
    })

    it('should return false when more rounds remain', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      room.currentRound = 3
      room.totalRounds = 7

      expect(turnManager.shouldEndGame(room)).toBe(false)
    })

    it('should return false during non-reward phases', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      room.currentRound = 7
      room.totalRounds = 7

      expect(turnManager.shouldEndGame(room)).toBe(false)
    })
  })

  describe('healer-turn skip when no healer in room', () => {
    it('should skip healer-turn when room has no healer (5-6 players)', () => {
      const room = createPlayingRoom(5)
      // Override all players to not have healer role (5-player game has no healer)
      room.players = room.players.map((p) => ({
        ...p,
        role: p.originalRole === Role.HEALER ? Role.OPENER : (p.role ?? Role.OPENER),
        originalRole: p.originalRole === Role.HEALER ? Role.OPENER : p.originalRole,
      }))
      expect(room.players.some((p) => p.originalRole === Role.HEALER)).toBe(false)

      const nextFromNight = turnManager.getNextPhase('night', room)
      expect(nextFromNight).toBe('silencer-turn')
    })

    it('should include healer-turn when room has a healer (7+ players)', () => {
      const room = createPlayingRoom(7)
      expect(room.players.some((p) => p.originalRole === Role.HEALER)).toBe(true)

      const nextFromNight = turnManager.getNextPhase('night', room)
      expect(nextFromNight).toBe('healer-turn')
    })

    it('getPreviousPhase should also skip healer-turn when no healer', () => {
      const room = createPlayingRoom(5)
      room.players = room.players.map((p) => ({
        ...p,
        role: p.originalRole === Role.HEALER ? Role.OPENER : (p.role ?? Role.OPENER),
        originalRole: p.originalRole === Role.HEALER ? Role.OPENER : p.originalRole,
      }))

      const prevFromSilencer = turnManager.getPreviousPhase('silencer-turn', room)
      expect(prevFromSilencer).toBe('night')
    })
  })

  describe('complete game flow', () => {
    it('should handle full round progression', () => {
      const room = createPlayingRoom(7)
      room.totalRounds = 2

      // Round 1
      expect(room.currentRound).toBe(1)
      expect(turnManager.shouldEndGame(room)).toBe(false)

      // Progress through all phases (15 phases total)
      let phase = room.phase
      for (let i = 0; i < 15; i++) {
        phase = turnManager.getNextPhase(phase)
      }
      expect(phase).toBe('reward')

      // At end of Round 1 (reward phase, currentRound=1)
      const endRound1Room = { ...room, phase, currentRound: 1 }
      expect(turnManager.shouldEndGame(endRound1Room)).toBe(false) // Still have round 2

      // Round 2 starts
      const round2Room = { ...room, phase: 'role-reveal' as GamePhase, currentRound: 2 }
      expect(turnManager.shouldEndGame(round2Room)).toBe(false)

      // Progress through all phases again
      phase = round2Room.phase
      for (let i = 0; i < 15; i++) {
        phase = turnManager.getNextPhase(phase)
      }
      expect(phase).toBe('reward')

      // At end of Round 2 (reward phase, currentRound=2, totalRounds=2)
      const finalRoom = { ...room, phase, currentRound: 2, totalRounds: 2 }
      expect(turnManager.shouldEndGame(finalRoom)).toBe(true) // Game should end
    })
  })
})
