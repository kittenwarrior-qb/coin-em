import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { RoomBuilder } from '../builders/RoomBuilder'
import { PlayerBuilder } from '../builders/PlayerBuilder'
import { assertThat } from '../assertions'
import { Role } from '../../src/modules/game/types'

/**
 * Refactored GameEngine tests using Builder and Assert Object patterns
 * Demonstrates improved readability and maintainability
 */
describe('GameEngine (Refactored)', () => {
  let engine: GameEngine

  beforeEach(() => {
    engine = new GameEngine()
  })

  describe('startGame', () => {
    // Parameterized test for valid player counts
    it.each([
      { count: 5, description: 'minimum' },
      { count: 7, description: 'normal' },
      { count: 10, description: 'maximum' },
    ])('should start game with $count players ($description)', ({ count }) => {
      const room = new RoomBuilder()
        .withPlayers(count)
        .build()

      const result = engine.startGame(room)

      assertThat(result)
        .isSuccessful()
        .hasStatus('playing')
        .hasPhase('role-reveal')
        .allPlayersHaveRoles()
        .hasPlayerCount(count)
    })

    // Parameterized test for invalid player counts
    it.each([
      { count: 4, error: 'NOT_ENOUGH_PLAYERS', description: 'too few' },
      { count: 11, error: 'TOO_MANY_PLAYERS', description: 'too many' },
    ])('should reject $count players ($description)', ({ count, error }) => {
      const room = new RoomBuilder()
        .withPlayers(count)
        .build()

      const result = engine.startGame(room)

      assertThat(result)
        .hasFailed()
        .hasError(error)
    })

    it('should reject if game already started', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .build()

      const result = engine.startGame(room)

      assertThat(result)
        .hasFailed()
        .hasError('GAME_ALREADY_STARTED')
    })

    it('should assign host as narrator', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .build()

      const result = engine.startGame(room)
      const hostId = room.host

      assertThat(result)
        .isSuccessful()
        .hasNarrator(hostId)
        .playerHasRole(hostId, Role.NARRATOR)
    })

    it('should assign exactly one narrator and one sender', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .build()

      const result = engine.startGame(room)
      const players = result.room!.players

      const narrators = players.filter(p => p.isNarrator)
      const senders = players.filter(p => p.isSender)

      expect(narrators.length).toBe(1)
      expect(senders.length).toBe(1)
    })
  })

  describe('advanceTurn', () => {
    it('should advance from role-reveal to night', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('role-reveal')
        .build()

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasPhase('night')
    })

    it('should reject if not narrator', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .build()

      const nonNarrator = room.players.find(p => !p.isNarrator)!

      const result = engine.advanceTurn(room, nonNarrator.userId)

      assertThat(result)
        .hasFailed()
        .hasError('NOT_NARRATOR')
    })

    it('should reset night actions when entering night phase', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('role-reveal')
        .withNightActions({ silenced: true, healed: true, cardSelected: true })
        .build()

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasPhase('night')
        .hasNightAction('silenced', false)
        .hasNightAction('healed', false)
        .hasNightAction('cardSelected', false)
    })

    it('should reset votes when entering guess-silencer phase', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('hug-action')
        .withVotes({ 'user1': 'user2', 'user3': 'user4' })
        .build()

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasPhase('guess-silencer')
        .hasVoteCount(0)
    })

    it('should rotate roles when starting new round', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('reward')
        .build()

      const oldNarrator = room.currentNarrator
      const oldSender = room.currentNTG

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasPhase('role-reveal')
        .hasRound(2)

      expect(result.room?.currentNarrator).not.toBe(oldNarrator)
      expect(result.room?.currentNTG).not.toBe(oldSender)
    })

    it('should end game after all rounds', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('reward')
        .inRound(7)
        .build()

      room.totalRounds = 7

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasStatus('ended')
        .hasPhase('ended')
        .hasMessage('GAME_ENDED')
    })
  })

  describe('executeAction - SILENCE', () => {
    // Parameterized test for silence action validation
    it.each([
      { phase: 'silencer-turn', shouldSucceed: true },
      { phase: 'situation-card', shouldSucceed: false },
      { phase: 'night', shouldSucceed: false },
    ])('should handle silence in $phase phase', ({ phase, shouldSucceed }) => {
      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const target = new PlayerBuilder()
        .withUserId('target-1')
        .asConnector()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([silencer, target])
        .asPlaying()
        .inPhase(phase as any)
        .build()

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      if (shouldSucceed) {
        assertThat(result)
          .isSuccessful()
          .hasMutedPlayer(target.userId)
          .hasNightAction('silenced', true)
      } else {
        assertThat(result).hasFailed()
      }
    })

    it('should prevent duplicate silence (idempotency)', () => {
      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const target = new PlayerBuilder()
        .withUserId('target-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([silencer, target])
        .asPlaying()
        .inPhase('silencer-turn')
        .withNightActions({ silenced: true })
        .build()

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      assertThat(result)
        .hasFailed()
        .hasError('ACTION_ALREADY_DONE')
    })

    it('should prevent silencing self', () => {
      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const narrator = new PlayerBuilder()
        .withUserId('narrator-1')
        .asNarrator()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([narrator, silencer])
        .asPlaying()
        .inPhase('silencer-turn')
        .build()

      const result = engine.executeAction(room, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: silencer.userId,
      })

      assertThat(result)
        .hasFailed()
        .hasError('Cannot silence self')
    })
  })

  describe('executeAction - HEAL', () => {
    it('should heal a player during healer-turn phase', () => {
      const healer = new PlayerBuilder()
        .withUserId('healer-1')
        .asHealer()
        .build()

      const target = new PlayerBuilder()
        .withUserId('target-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([healer, target])
        .asPlaying()
        .inPhase('healer-turn')
        .build()

      const result = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      assertThat(result)
        .isSuccessful()
        .hasHealedPlayer(target.userId)
        .hasNightAction('healed', true)
    })

    it('should remove mute if healing muted player', () => {
      const healer = new PlayerBuilder()
        .withUserId('healer-1')
        .asHealer()
        .build()

      const target = new PlayerBuilder()
        .withUserId('target-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([healer, target])
        .asPlaying()
        .inPhase('healer-turn')
        .withMutedPlayer(target.userId)
        .build()

      const result = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      assertThat(result)
        .isSuccessful()
        .hasMutedPlayer(null)
        .hasHealedPlayer(target.userId)
    })

    it('should prevent duplicate heal (idempotency)', () => {
      const healer = new PlayerBuilder()
        .withUserId('healer-1')
        .asHealer()
        .build()

      const target = new PlayerBuilder()
        .withUserId('target-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([healer, target])
        .asPlaying()
        .inPhase('healer-turn')
        .withNightActions({ healed: true })
        .build()

      const result = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      assertThat(result)
        .hasFailed()
        .hasError('ACTION_ALREADY_DONE')
    })
  })

  describe('executeAction - GIVE_COIN', () => {
    // Giver loses the coin type given; receiver always gains GREEN
    it.each([
      { coinType: 'yellow', initialGiver: 7, expectedGiver: 6 },
      { coinType: 'red',    initialGiver: 3, expectedGiver: 2 },
    ])('should give $coinType coin: giver loses, receiver gains green', ({ coinType, initialGiver, expectedGiver }) => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withCoins({ [coinType]: initialGiver, green: 0 } as any)
        .asNarrator()
        .build()

      const receiver = new PlayerBuilder()
        .withUserId('receiver-1')
        .withCoins({ green: 0 } as any)
        .asSender()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([giver, receiver])
        .asPlaying()
        .inPhase('give-coins')
        .build()

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType, amount: 1 },
      })

      assertThat(result)
        .isSuccessful()
        .playerHasCoins(giver.userId, { [coinType]: expectedGiver } as any)
        .playerHasCoins(receiver.userId, { green: 1 }) // receiver always gains green
    })

    it('should reject giving green coins', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .build()

      const receiver = new PlayerBuilder()
        .withUserId('receiver-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([giver, receiver])
        .asPlaying()
        .inPhase('give-coins')
        .build()

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'green' },
      })

      assertThat(result)
        .hasFailed()
        .hasError('Cannot give green coins')
    })

    it('should reject giving coin to self', () => {
      const player = new PlayerBuilder()
        .withUserId('player-1')
        .asNarrator()
        .build()

      const sender = new PlayerBuilder()
        .withUserId('sender-1')
        .asSender()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([player, sender])
        .asPlaying()
        .inPhase('give-coins')
        .build()

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: player.userId,
        targetId: player.userId,
        data: { coinType: 'yellow' },
      })

      assertThat(result)
        .hasFailed()
        .hasError('Cannot give coin to self')
    })

    it('should reject when insufficient coins', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withYellowCoins(0)
        .asNarrator()
        .build()

      const receiver = new PlayerBuilder()
        .withUserId('receiver-1')
        .asSender()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([giver, receiver])
        .asPlaying()
        .inPhase('give-coins')
        .build()

      const result = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver.userId,
        data: { coinType: 'yellow' },
      })

      assertThat(result)
        .hasFailed()
        .hasError('Insufficient yellow coins')
    })
  })

  describe('executeAction - VOTE', () => {
    it('should record vote', () => {
      const voter = new PlayerBuilder()
        .withUserId('voter-1')
        .build()

      const suspect = new PlayerBuilder()
        .withUserId('suspect-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([voter, suspect])
        .asPlaying()
        .inPhase('guess-silencer')
        .build()

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      assertThat(result)
        .isSuccessful()
        .playerVotedFor(voter.userId, suspect.userId)
    })

    it('should auto-advance when all players voted', () => {
      const players = Array.from({ length: 3 }, (_, i) =>
        new PlayerBuilder()
          .withUserId(`player-${i}`)
          .build()
      )

      const room = new RoomBuilder()
        .withCustomPlayers(players)
        .asPlaying()
        .inPhase('guess-silencer')
        .withVotes({
          'player-0': 'player-1',
          'player-1': 'player-2',
        })
        .build()

      // Last player votes
      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: 'player-2',
        targetId: 'player-0',
      })

      assertThat(result)
        .isSuccessful()
        .shouldAutoAdvance()
        .hasVoteCount(3)
    })

    it('should reject duplicate vote', () => {
      const voter = new PlayerBuilder()
        .withUserId('voter-1')
        .build()

      const suspect = new PlayerBuilder()
        .withUserId('suspect-1')
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([voter, suspect])
        .asPlaying()
        .inPhase('guess-silencer')
        .withVotes({ 'voter-1': 'suspect-1' })
        .build()

      const result = engine.executeAction(room, {
        type: 'VOTE',
        actorId: voter.userId,
        targetId: suspect.userId,
      })

      assertThat(result)
        .hasFailed()
        .hasError('ALREADY_VOTED')
    })
  })
})
