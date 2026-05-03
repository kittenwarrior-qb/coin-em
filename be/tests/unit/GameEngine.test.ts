import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { createMockRoom, createPlayingRoom, setRoomPhase } from '../helpers/mockData'
import { Room, Role } from '../../src/modules/game/types'

describe('GameEngine', () => {
  let engine: GameEngine

  beforeEach(() => {
    engine = new GameEngine()
  })

  describe('startGame', () => {
    it('should start game with 7 players', () => {
      const room = createMockRoom(7)
      const result = engine.startGame(room)

      expect(result.success).toBe(true)
      expect(result.room?.status).toBe('playing')
      expect(result.room?.phase).toBe('role-reveal')
      expect(result.room?.players.every(p => p.role)).toBe(true)
    })

    it('should start game with 5 players (minimum)', () => {
      const room = createMockRoom(5)
      const result = engine.startGame(room)

      expect(result.success).toBe(true)
      expect(result.room?.status).toBe('playing')
    })

    it('should start game with 10 players (maximum)', () => {
      const room = createMockRoom(10)
      const result = engine.startGame(room)

      expect(result.success).toBe(true)
      expect(result.room?.status).toBe('playing')
    })

    it('should fail with less than 5 players', () => {
      const room = createMockRoom(4)
      const result = engine.startGame(room)

      expect(result.success).toBe(false)
      expect(result.error).toBe('NOT_ENOUGH_PLAYERS')
    })

    it('should fail with more than 10 players', () => {
      const room = createMockRoom(11)
      const result = engine.startGame(room)

      expect(result.success).toBe(false)
      expect(result.error).toBe('TOO_MANY_PLAYERS')
    })

    it('should fail if game already started', () => {
      const room = createPlayingRoom(7)
      const result = engine.startGame(room)

      expect(result.success).toBe(false)
      expect(result.error).toBe('GAME_ALREADY_STARTED')
    })

    it('should assign host as narrator', () => {
      const room = createMockRoom(7)
      const result = engine.startGame(room)

      const narrator = result.room?.players.find(p => p.isNarrator)
      expect(narrator?.userId).toBe(room.host)
    })

    it('should assign exactly one narrator and one sender', () => {
      const room = createMockRoom(7)
      const result = engine.startGame(room)

      const narrators = result.room?.players.filter(p => p.isNarrator)
      const senders = result.room?.players.filter(p => p.isSender)

      expect(narrators?.length).toBe(1)
      expect(senders?.length).toBe(1)
    })
  })

  describe('advanceTurn', () => {
    it('should advance from role-reveal to night', () => {
      const room = createPlayingRoom(7)
      const result = engine.advanceTurn(room, room.currentNarrator!)

      expect(result.success).toBe(true)
      expect(result.room?.phase).toBe('night')
    })

    it('should fail if not narrator', () => {
      const room = createPlayingRoom(7)
      const nonNarrator = room.players.find(p => !p.isNarrator)!
      const result = engine.advanceTurn(room, nonNarrator.userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('NOT_NARRATOR')
    })

    it('should reset night actions when entering night phase', () => {
      const room = createPlayingRoom(7)
      room.nightActions = { silenced: true, healed: true, cardSelected: true }
      
      const result = engine.advanceTurn(room, room.currentNarrator!)

      expect(result.room?.nightActions).toEqual({
        silenced: false,
        healed: false,
        cardSelected: false,
      })
    })

    it('should reset votes when entering guess-silencer phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'hug-action')
      room.votes = { 'user1': 'user2', 'user3': 'user4' }

      const result = engine.advanceTurn(room, room.currentNarrator!)

      expect(result.room?.phase).toBe('guess-silencer')
      expect(result.room?.votes).toEqual({})
    })

    it('should rotate roles when starting new round', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'reward')
      const oldNarrator = room.currentNarrator
      const oldSender = room.currentNTG

      const result = engine.advanceTurn(room, room.currentNarrator!)

      expect(result.room?.phase).toBe('role-reveal')
      expect(result.room?.currentRound).toBe(2)
      expect(result.room?.currentNarrator).not.toBe(oldNarrator)
      expect(result.room?.currentNTG).not.toBe(oldSender)
    })

    it('should end game after all rounds', () => {
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

  describe('executeAction - SILENCE', () => {
    it('should silence a player during silencer-turn phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = room.players.find(p => p.userId !== silencer.userId)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(true)
      expect(result.room?.mutedPlayer).toBe(target.userId)
      expect(result.room?.nightActions.silenced).toBe(true)
    })

    it('should fail if not silencer-turn phase', () => {
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

    it('should fail if not silencer role', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not a silencer')
    })

    it('should fail if already silenced (idempotency)', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'silencer-turn')
      room.nightActions.silenced = true
      const silencer = room.players.find(p => p.role === Role.SILENCER)!
      const target = room.players.find(p => p.userId !== silencer.userId)!

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ACTION_ALREADY_DONE')
    })

    it('should fail if trying to silence self', () => {
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
  })

  describe('executeAction - HEAL', () => {
    it('should heal a player during healer-turn phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!

      const result = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(true)
      expect(result.room?.healedPlayer).toBe(target.userId)
      expect(result.room?.nightActions.healed).toBe(true)
    })

    it('should remove mute if healing muted player', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!
      room.mutedPlayer = target.userId

      const result = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(true)
      expect(result.room?.mutedPlayer).toBeNull()
      expect(result.room?.healedPlayer).toBe(target.userId)
    })

    it('should fail if already healed (idempotency)', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'healer-turn')
      room.nightActions.healed = true
      const healer = room.players.find(p => p.role === Role.HEALER)!
      const target = room.players.find(p => p.userId !== healer.userId)!

      const result = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ACTION_ALREADY_DONE')
    })
  })

  describe('executeAction - GIVE_COIN', () => {
    it('should give yellow coin: giver loses yellow, receiver gains green', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]
      
      const initialYellow = giver.coins.yellow
      const receiverInitialGreen = receiver.coins.green

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'yellow' },
      })

      expect(result.success).toBe(true)
      const updatedGiver = result.room?.players.find(p => p.userId === giver.userId)
      const updatedReceiver = result.room?.players.find(p => p.userId === receiver.userId)
      
      expect(updatedGiver?.coins.yellow).toBe(initialYellow - 1)
      expect(updatedReceiver?.coins.green).toBe(receiverInitialGreen + 1) // receiver gains green
    })

    it('should give red coin: giver loses red, receiver gains green', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]
      
      expect(giver.coins.red).toBe(3)
      const receiverInitialGreen = receiver.coins.green

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 1 },
      })

      expect(result.success).toBe(true)
      const updatedGiver = result.room?.players.find(p => p.userId === giver.userId)
      const updatedReceiver = result.room?.players.find(p => p.userId === receiver.userId)
      
      expect(updatedGiver?.coins.red).toBe(2)
      expect(updatedReceiver?.coins.green).toBe(receiverInitialGreen + 1) // receiver gains green
    })

    it('should fail if trying to give green coin directly', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'green' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot give green coins')
    })

    it('should fail if giver has no yellow coins left', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]
      
      // Giver has no yellow coins
      giver.coins.yellow = 0

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'yellow' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient yellow coins')
    })

    it('should track red coins given', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver = room.players[1]

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'red', amount: 1 },
      })

      expect(result.success).toBe(true)
      expect(result.room?.redCoinsGiven[giver.userId][receiver.userId]).toBe(1)
    })

    it('should allow giving red coins to multiple people', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const giver = room.players[0]
      const receiver1 = room.players[1]
      const receiver2 = room.players[2]

      // Give to first person
      const result1 = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver1.userId,
        data: { coinType: 'red', amount: 1 },
      })

      expect(result1.success).toBe(true)

      // Give to second person
      const result2 = engine.executeAction(result1.room!, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver2.userId,
        data: { coinType: 'red', amount: 1 },
      })

      expect(result2.success).toBe(true)
      expect(result2.room?.redCoinsGiven[giver.userId][receiver1.userId]).toBe(1)
      expect(result2.room?.redCoinsGiven[giver.userId][receiver2.userId]).toBe(1)
    })

    it('should fail if trying to give coin to self', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'give-coins')
      const player = room.players[0]

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: player.userId,
        targetId: player.userId,
        data: { coinType: 'yellow' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot give coin to self')
    })

    it('should fail if not give-coins phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      const giver = room.players[0]
      const receiver = room.players[1]

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'yellow' },
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not give-coins phase')
    })
  })

  describe('executeAction - VOTE', () => {
    it('should record vote', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const voter = room.players[0]
      const suspect = room.players[1]

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.success).toBe(true)
      expect(result.room?.votes[voter.userId]).toBe(suspect.userId)
    })

    it('should auto-advance when all players voted', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      // Pre-fill votes for all but one
      room.votes = {}
      room.players.slice(0, -1).forEach((p, i) => {
        room.votes[p.userId] = room.players[(i + 1) % room.players.length].userId
      })

      const lastVoter = room.players[room.players.length - 1]
      const suspect = room.players[0]

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: lastVoter.userId,
        targetId: suspect.userId,
      })

      expect(result.success).toBe(true)
      expect(result.autoAdvance).toBe(true)
    })

    it('should fail if already voted', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'guess-silencer')
      const voter = room.players[0]
      const suspect = room.players[1]
      room.votes = { [voter.userId]: suspect.userId }

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ALREADY_VOTED')
    })

    it('should fail if not vote phase', () => {
      const room = setRoomPhase(createPlayingRoom(7), 'night')
      const voter = room.players[0]
      const suspect = room.players[1]

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('NOT_VOTE_PHASE')
    })
  })
})
