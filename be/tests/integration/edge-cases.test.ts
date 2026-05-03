import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { createPlayingRoom, setRoomPhase } from '../helpers/mockData'
import { Role } from '../../src/modules/game/types'

describe('Edge Cases & Race Conditions', () => {
  let engine: GameEngine

  beforeEach(() => {
    engine = new GameEngine()
  })

  describe('Duplicate Actions (Spam Prevention)', () => {
    it('should prevent duplicate silence actions', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = room.players.find(p => p.userId !== silencer.userId)!

      // First action succeeds
      const result1 = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })
      expect(result1.success).toBe(true)

      // Second action fails (idempotency)
      const result2 = engine.executeAction(result1.room!, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('ACTION_ALREADY_DONE')
    })

    it('should prevent duplicate heal actions', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!

      const result1 = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })
      expect(result1.success).toBe(true)

      const result2 = engine.executeAction(result1.room!, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('ACTION_ALREADY_DONE')
    })

    it('should prevent duplicate votes', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const voter = room.players[0]
      const suspect1 = room.players[1]
      const suspect2 = room.players[2]

      const result1 = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect1.userId,
      })
      expect(result1.success).toBe(true)

      // Try to vote again for different person
      const result2 = engine.executeAction(result1.room!, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect2.userId,
      })
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('ALREADY_VOTED')
    })

    it('should allow giving multiple coins (no limit per recipient)', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]

      // First coin succeeds
      const result1 = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 1 },
      })
      expect(result1.success).toBe(true)

      // Second coin also succeeds (can give multiple)
      const result2 = engine.executeAction(result1.room!, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 1 },
      })
      expect(result2.success).toBe(true)
    })
  })

  describe('Invalid Actions', () => {
    it('should reject action from wrong role', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const connector = room.players.find(p => p.role === Role.CONNECTOR)!
      const target = room.players.find(p => p.userId !== connector.userId)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: connector.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not a silencer')
    })

    it('should reject action in wrong phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'situation-card')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = room.players.find(p => p.userId !== silencer.userId)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not silencer turn')
    })

    it('should reject action with invalid target', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: 'non-existent-user',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Target not found')
    })

    it('should reject self-targeting for silence', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: silencer.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot silence self')
    })

    it('should reject self-targeting for coins', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const player = room.players[0]

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: player.userId,
        targetId: player.userId,
        data: { coinType: 'red' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot give coin to self')
    })
  })

  describe('Concurrent Actions', () => {
    it('should handle silence and heal on same player', () => {
      // Need to do actions in sequence: healer first, then silencer
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => 
        p.userId !== silencer.userId && p.userId !== healer.userId
      )!

      // Healer acts first (in healer-turn phase)
      const result1 = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })
      expect(result1.success).toBe(true)
      expect(result1.room?.healedPlayer).toBe(target.userId)

      // Move to silencer-turn phase
      const roomSilencerTurn = setRoomPhase(result1.room!, 'silencer-turn')
      
      // Silence same player
      const result2 = engine.executeAction(roomSilencerTurn, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })
      expect(result2.success).toBe(true)
      // Player should be muted (healer acted before silence)
      expect(result2.room?.mutedPlayer).toBe(target.userId)
    })

    it('should handle multiple players giving coins simultaneously', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver1 = room.players[0]
      const giver2 = room.players[1]
      const receiver = room.players[2]

      // Both give coins to same receiver
      const result1 = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver1.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 1 },
      })
      expect(result1.success).toBe(true)

      const result2 = engine.executeAction(result1.room!, {
        type: 'GIVE_COIN',
        actorId: giver2.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 1 },
      })
      expect(result2.success).toBe(true)

      // Receiver gains 2 green coins (all received coins convert to green)
      const updatedReceiver = result2.room?.players.find(p => p.userId === receiver.userId)
      expect(updatedReceiver?.coins.green).toBe(receiver.coins.green + 2) // Received 2 green coins
    })
  })

  describe('Game State Transitions', () => {
    it('should handle rapid phase transitions', () => {
      const room = createPlayingRoom(7)
      let currentRoom = room

      // Advance through multiple phases rapidly (15 phases total in new flow)
      for (let i = 0; i < 5; i++) {
        const result = engine.advanceTurn(currentRoom, currentRoom.currentNarrator!)
        expect(result.success).toBe(true)
        currentRoom = result.room!
      }

      // After 5 advances from role-reveal: 
      // 1->night, 2->healer-turn, 3->silencer-turn, 4->situation-card, 5->emotion-card
      expect(currentRoom.phase).toBe('emotion-card')
    })

    it('should properly reset state when starting new round', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      room.mutedPlayer = 'user-1'
      room.healedPlayer = 'user-2'
      room.votes = { 'user-1': 'user-2' }
      room.nightActions = { silenced: true, healed: true, cardSelected: true }
      room.redCoinsGiven = { 'user-1': { 'user-2': 1 } }
      room.yellowCoinsGiven = { 'user-1': { 'user-2': 2 } }

      const result = engine.advanceTurn(room, room.currentNarrator!)

      expect(result.room?.phase).toBe('role-reveal')
      expect(result.room?.currentRound).toBe(2)
      expect(result.room?.mutedPlayer).toBeNull()
      expect(result.room?.healedPlayer).toBeNull()
      expect(result.room?.votes).toEqual({})
      expect(result.room?.nightActions).toEqual({
        silenced: false,
        healed: false,
        cardSelected: false,
      })
      expect(result.room?.redCoinsGiven).toEqual({})
      expect(result.room?.yellowCoinsGiven).toEqual({})
    })

    it('should end game at correct round', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      room.currentRound = 7
      room.totalRounds = 7

      const result = engine.advanceTurn(room, room.currentNarrator!)

      expect(result.success).toBe(true)
      expect(result.room?.status).toBe('ended')
      expect(result.room?.phase).toBe('ended')
      expect(result.message).toBe('GAME_ENDED')
    })
  })

  describe('Role Rotation', () => {
    it('should rotate roles correctly across multiple rounds', () => {
      const room = createPlayingRoom(7)
      const initialNarrator = room.currentNarrator
      const initialSender = room.currentNTG

      // Complete one full round (16 phases: role-reveal + 15 phases to reward)
      let currentRoom = room
      for (let i = 0; i < 16; i++) {
        const result = engine.advanceTurn(currentRoom, currentRoom.currentNarrator!)
        currentRoom = result.room!
      }

      // Should be in new round with rotated roles
      expect(currentRoom.currentRound).toBe(2)
      expect(currentRoom.currentNarrator).not.toBe(initialNarrator)
      expect(currentRoom.currentNTG).not.toBe(initialSender)
    })

    it('should maintain role rotation consistency', () => {
      const room = createPlayingRoom(7)
      const narratorSequence: string[] = [room.currentNarrator!]

      let currentRoom = room
      for (let round = 0; round < 3; round++) {
        // 16 phases per round
        for (let phase = 0; phase < 16; phase++) {
          const result = engine.advanceTurn(currentRoom, currentRoom.currentNarrator!)
          currentRoom = result.room!
          
          if (currentRoom.phase === 'role-reveal' && round < 2) {
            narratorSequence.push(currentRoom.currentNarrator!)
          }
        }
      }

      // Each narrator should be unique
      const uniqueNarrators = new Set(narratorSequence)
      expect(uniqueNarrators.size).toBe(narratorSequence.length)
    })
  })

  describe('Vote Auto-Advance', () => {
    it('should auto-advance when all players vote', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      let currentRoom = room

      // All players vote
      for (let i = 0; i < room.players.length; i++) {
        const voter = room.players[i]
        const suspect = room.players[(i + 1) % room.players.length]

        const result = engine.executeAction(currentRoom, {
          type: 'VOTE',
          actorId: voter.userId,
          targetId: suspect.userId,
        })

        expect(result.success).toBe(true)
        currentRoom = result.room!

        // Last vote should trigger auto-advance
        if (i === room.players.length - 1) {
          expect(result.autoAdvance).toBe(true)
        }
      }

      expect(Object.keys(currentRoom.votes).length).toBe(room.players.length)
    })

    it('should not auto-advance with partial votes', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const voter = room.players[0]
      const suspect = room.players[1]

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.success).toBe(true)
      expect(result.autoAdvance).toBeFalsy() // Can be false or undefined
    })
  })

  describe('Player View Privacy', () => {
    it('should hide other players roles except narrator and sender', () => {
      const room = createPlayingRoom(7)
      const regularPlayer = room.players.find(p => !p.isNarrator && !p.isSender)!

      const view = engine.getPlayerView(room, regularPlayer.userId)

      view.players.forEach((p: any) => {
        if (p.userId === regularPlayer.userId) {
          // Should see own role
          expect(p.role).toBeDefined()
        } else if (p.isNarrator || p.isSender) {
          // Should see public roles
          expect(p.role).toBeDefined()
        } else {
          // Should not see other roles
          expect(p.role).toBeUndefined()
        }
      })
    })

    it('should show all roles to narrator during night phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const narrator = room.players.find(p => p.isNarrator)!

      const view = engine.getPlayerView(room, narrator.userId)

      view.players.forEach((p: any) => {
        expect(p.role).toBeDefined()
      })
    })
  })
})
