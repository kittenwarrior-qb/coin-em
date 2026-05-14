import { describe, it, expect, beforeEach } from 'vitest'
import { ActionValidator } from '../../src/modules/game/engine/ActionValidator'
import { createPlayingRoom, setRoomPhase } from '../helpers/mockData'
import { Role } from '../../src/modules/game/types'

describe('ActionValidator', () => {
  let validator: ActionValidator

  const findNightActionTarget = (room: ReturnType<typeof createPlayingRoom>, actorId: string) =>
    room.players.find(p => p.userId !== actorId && !p.isNarrator && !p.isSender)!
  const findEligibleGuessVoter = (room: ReturnType<typeof createPlayingRoom>) =>
    room.players.find(p => !p.isNarrator && p.originalRole !== Role.SILENCER && p.role !== Role.SILENCER)!

  beforeEach(() => {
    validator = new ActionValidator()
  })

  describe('validate SILENCE', () => {
    it('should validate correct silence action', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = findNightActionTarget(room, silencer.userId)

      const result = validator.validate(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(true)
    })

    it('should reject silence in wrong phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'situation-card')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = room.players.find(p => p.userId !== silencer.userId)!

      const result = validator.validate(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Not silencer turn')
    })

    it('should reject silence from wrong role', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!

      const result = validator.validate(room, {
        type: 'SILENCE',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Not a silencer')
    })

    it('should reject duplicate silence (idempotency)', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      room.nightActions.silenced = true
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = room.players.find(p => p.userId !== silencer.userId)!

      const result = validator.validate(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ACTION_ALREADY_DONE')
    })

    it('should reject self-silence', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      const result = validator.validate(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: silencer.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Cannot silence self')
    })

    it('should reject silencing narrator or sender', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      for (const target of room.players.filter(p => p.isNarrator || p.isSender)) {
        const result = validator.validate(room, {
          type: 'SILENCE',
          actorId: silencer.userId,
          targetId: target.userId,
        })

        expect(result.valid).toBe(false)
        expect(result.error).toBe('CANNOT_TARGET_PUBLIC_ROLE')
      }
    })

    it('should reject missing target', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!

      const result = validator.validate(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('No target specified')
    })
  })

  describe('validate HEAL', () => {
    it('should validate correct heal action', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = findNightActionTarget(room, healer.userId)

      const result = validator.validate(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(true)
    })

    it('should reject duplicate heal (idempotency)', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      room.nightActions.healed = true
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!

      const result = validator.validate(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ACTION_ALREADY_DONE')
    })

    it('should allow healing self', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!

      const result = validator.validate(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: healer.userId,
      })

      expect(result.valid).toBe(true)
    })

    it('should reject healing narrator or sender', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!

      for (const target of room.players.filter(p => p.isNarrator || p.isSender)) {
        const result = validator.validate(room, {
          type: 'HEAL',
          actorId: healer.userId,
          targetId: target.userId,
        })

        expect(result.valid).toBe(false)
        expect(result.error).toBe('CANNOT_TARGET_PUBLIC_ROLE')
      }
    })
  })

  describe('validate GIVE_COIN', () => {
    it('should validate coin giving in give-coins phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]

      const result = validator.validate(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red' },
      })

      expect(result.valid).toBe(true)
    })

    it('should reject coin giving in night phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      const giver = room.players[0]
      const receiver = room.players[1]

      const result = validator.validate(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red' },
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Not give-coins phase')
    })

    it('should reject giving coin to self', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const player = room.players[0]

      const result = validator.validate(room, {
        type: 'GIVE_COIN',
        actorId: player.userId,
        targetId: player.userId,
        data: { coinType: 'red' },
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Cannot give coin to self')
    })

    it('should allow giving red coins to multiple people', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver1 = room.players[1]
      const receiver2 = room.players[2]
      
      // Already gave 1 red to receiver1
      room.redCoinsGiven = {
        [giver.userId]: {
          [receiver1.userId]: 1,
        },
      }

      // Should allow giving to receiver2
      const result = validator.validate(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver2.userId,
        data: { coinType: 'red', amount: 1 },
      })

      expect(result.valid).toBe(true)
    })

    it('should reject when insufficient red coins', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]
      
      // Giver only has 3 red coins
      giver.coins.red = 3

      // Try to give 5 red coins
      const result = validator.validate(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 5 },
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Insufficient red coins')
    })

    it('should allow giving yellow coins multiple times', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver1 = room.players[1]
      const receiver2 = room.players[2]
      
      // Already gave 2 yellow to receiver1
      room.yellowCoinsGiven = {
        [giver.userId]: {
          [receiver1.userId]: 2,
        },
      }

      // Should allow giving to receiver2
      const result = validator.validate(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver2.userId,
        data: { coinType: 'yellow', amount: 1 },
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('validate VOTE', () => {
    it('should validate correct vote', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const voter = findEligibleGuessVoter(room)
      const suspect = room.players[1]

      const result = validator.validate(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.valid).toBe(true)
    })

    it('should reject vote in wrong phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      const voter = findEligibleGuessVoter(room)
      const suspect = room.players[1]

      const result = validator.validate(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('NOT_VOTE_PHASE')
    })

    it('should reject duplicate vote', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const voter = findEligibleGuessVoter(room)
      const suspect = room.players[1]
      room.votes = { [voter.userId]: suspect.userId }

      const result = validator.validate(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('ALREADY_VOTED')
    })

    it('should reject votes from narrator or silencer', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const restrictedVoters = room.players.filter(p => p.isNarrator || p.originalRole === Role.SILENCER)
      const suspect = room.players.find(p => !restrictedVoters.includes(p))!

      for (const voter of restrictedVoters) {
        const result = validator.validate(room, {
          type: 'VOTE',
          actorId: voter.userId,
          targetId: suspect.userId,
        })

        expect(result.valid).toBe(false)
        expect(result.error).toBe('CANNOT_VOTE_AS_PUBLIC_ROLE')
      }
    })
  })

  describe('canAdvanceTurn', () => {
    it('should allow narrator to advance turn', () => {
      const room = createPlayingRoom(7)
      const result = validator.canAdvanceTurn(room, room.currentNarrator!)
      expect(result).toBe(true)
    })

    it('should reject non-narrator from advancing turn', () => {
      const room = createPlayingRoom(7)
      const nonNarrator = room.players.find(p => !p.isNarrator)!
      const result = validator.canAdvanceTurn(room, nonNarrator.userId)
      expect(result).toBe(false)
    })
  })
})
