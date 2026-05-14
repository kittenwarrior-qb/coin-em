import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { RoomBuilder } from '../builders/RoomBuilder'
import { PlayerBuilder } from '../builders/PlayerBuilder'
import { assertThat, assertCoins } from '../assertions'
import { Role } from '../../src/modules/game/types'

/**
 * Comprehensive tests for Coin Reward System
 * Based on role_rule.md specifications
 */
describe('Coin Reward System', () => {
  let engine: GameEngine

  beforeEach(() => {
    engine = new GameEngine()
  })

  describe('Initial Coin Distribution', () => {
    it('should give correct initial coins when game starts', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .build()

      const result = engine.startGame(room)

      assertThat(result).isSuccessful()

      result.room!.players.forEach(player => {
        expect(player.coins.red).toBe(3)
        expect(player.coins.yellow).toBeGreaterThanOrEqual(5)
        expect(player.coins.yellow).toBeLessThanOrEqual(10)
        expect(player.coins.green).toBe(0)
      })
    })

    it.each([
      { playerCount: 5 },
      { playerCount: 7 },
      { playerCount: 10 },
    ])('should give random 5-10 yellow coins for $playerCount players', ({ playerCount }) => {
      const room = new RoomBuilder()
        .withPlayers(playerCount)
        .build()

      const result = engine.startGame(room)

      assertThat(result).isSuccessful()

      result.room!.players.forEach(player => {
        expect(player.coins.yellow).toBeGreaterThanOrEqual(5)
        expect(player.coins.yellow).toBeLessThanOrEqual(10)
      })
    })
  })

  describe('Red Coin Giving', () => {
    it('should reduce giver red coins and give receiver red', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withRedCoins(3)
        .asNarrator()
        .build()

      const receiver = new PlayerBuilder()
        .withUserId('receiver-1')
        .withRedCoins(3)
        .withGreenCoins(0)
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
        data: { coinType: 'red', amount: 1 },
      })

      assertThat(result)
        .isSuccessful()
        .playerHasCoins(giver.userId, { red: 2 })      // 3 - 1
        .playerHasCoins(receiver.userId, { green: 1 })  // receiver gains 1 green
    })

    it('should allow giving red coins to multiple people', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withRedCoins(3)
        .asNarrator()
        .build()

      const receiver1 = new PlayerBuilder()
        .withUserId('receiver-1')
        .withRedCoins(3)
        .withGreenCoins(0)
        .asSender()
        .build()

      const receiver2 = new PlayerBuilder()
        .withUserId('receiver-2')
        .withRedCoins(3)
        .withGreenCoins(0)
        .asConnector()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([giver, receiver1, receiver2])
        .asPlaying()
        .inPhase('give-coins')
        .build()

      // Give to first person
      const result1 = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver1.userId,
        data: { coinType: 'red', amount: 1 },
      })

      assertThat(result1).isSuccessful()

      // Give to second person
      const result2 = engine.executeAction(result1.room!, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver2.userId,
        data: { coinType: 'red', amount: 1 },
      })

      assertThat(result2)
        .isSuccessful()
        .redCoinGiven(giver.userId, receiver1.userId, 1)
        .redCoinGiven(giver.userId, receiver2.userId, 1)
        .playerHasCoins(receiver1.userId, { green: 1 }) // receiver gains 1 green
        .playerHasCoins(receiver2.userId, { green: 1 }) // receiver gains 1 green
    })

    it('should track red coins given', () => {
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
        data: { coinType: 'red', amount: 1 },
      })

      assertThat(result)
        .isSuccessful()
        .redCoinGiven(giver.userId, receiver.userId, 1)
    })
  })

  describe('Yellow Coin Giving', () => {
    it('should reduce giver yellow coins and give receiver yellow', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withYellowCoins(7)
        .asNarrator()
        .build()

      const receiver = new PlayerBuilder()
        .withUserId('receiver-1')
        .withYellowCoins(7)
        .withGreenCoins(0)
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
        data: { coinType: 'yellow', amount: 1 },
      })

      assertThat(result)
        .isSuccessful()
        .playerHasCoins(giver.userId, { yellow: 6 })    // 7 - 1
        .playerHasCoins(receiver.userId, { green: 1 })  // receiver gains 1 green
    })

    it('should allow giving yellow coins to multiple people', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withYellowCoins(10)
        .asNarrator()
        .build()

      const receiver1 = new PlayerBuilder()
        .withUserId('receiver-1')
        .withGreenCoins(0)
        .asSender()
        .build()

      const receiver2 = new PlayerBuilder()
        .withUserId('receiver-2')
        .withGreenCoins(0)
        .asConnector()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([giver, receiver1, receiver2])
        .asPlaying()
        .inPhase('give-coins')
        .build()

      // Give 2 yellow to receiver1
      const result1 = engine.executeAction(room, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver1.userId,
        data: { coinType: 'yellow', amount: 2 },
      })

      assertThat(result1).isSuccessful()

      // Give 3 yellow to receiver2
      const result2 = engine.executeAction(result1.room!, {
        type: 'GIVE_COIN',
        actorId: giver.userId,
        targetId: receiver2.userId,
        data: { coinType: 'yellow', amount: 3 },
      })

      assertThat(result2)
        .isSuccessful()
        .playerHasCoins(giver.userId, { yellow: 5 }) // 10 - 2 - 3 = 5
        .playerHasCoins(receiver1.userId, { green: 2 }) // receiver gains 2 green
        .playerHasCoins(receiver2.userId, { green: 3 }) // receiver gains 3 green
        .yellowCoinGiven(giver.userId, receiver1.userId, 2)
        .yellowCoinGiven(giver.userId, receiver2.userId, 3)
    })

    it('should reject when insufficient yellow coins', () => {
      const giver = new PlayerBuilder()
        .withUserId('giver-1')
        .withYellowCoins(2)
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
        data: { coinType: 'yellow', amount: 5 },
      })

      assertThat(result)
        .hasFailed()
        .hasError('Insufficient yellow coins')
    })
  })

  describe('Green Coin Rewards (NTG Only)', () => {
    it('should give playerCount green coins when silencer found', () => {
      const playerCount = 7
      const ntg = new PlayerBuilder()
        .withUserId('ntg-1')
        .asSender()
        .withGreenCoins(0)
        .build()

      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const otherPlayers = Array.from({ length: 5 }, (_, i) =>
        new PlayerBuilder()
          .withUserId(`player-${i}`)
          .build()
      )

      const room = new RoomBuilder()
        .withCustomPlayers([ntg, silencer, ...otherPlayers])
        .asPlaying()
        .inPhase('reveal-silencer')
        .build()

      // Majority votes for silencer (4 out of 7)
      room.votes = {
        'ntg-1': silencer.userId,
        'player-0': silencer.userId,
        'player-1': silencer.userId,
        'player-2': silencer.userId,
        'player-3': 'player-0',
        'player-4': 'player-0',
        'silencer-1': 'player-0',
      }

      // TODO: Implement green coin reward logic in GameEngine
      // Expected: NTG gets +7 green coins
      // assertThat(result).playerHasCoins(ntg.userId, { green: 7 })
    })

    it('should give (playerCount - 3) green coins when silencer NOT found', () => {
      const playerCount = 7
      const ntg = new PlayerBuilder()
        .withUserId('ntg-1')
        .asSender()
        .withGreenCoins(0)
        .build()

      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const otherPlayers = Array.from({ length: 5 }, (_, i) =>
        new PlayerBuilder()
          .withUserId(`player-${i}`)
          .build()
      )

      const room = new RoomBuilder()
        .withCustomPlayers([ntg, silencer, ...otherPlayers])
        .asPlaying()
        .inPhase('reveal-silencer')
        .build()

      // Majority votes for wrong person (4 out of 7)
      room.votes = {
        'ntg-1': 'player-0',
        'player-0': 'player-1',
        'player-1': 'player-0',
        'player-2': 'player-0',
        'player-3': 'player-0',
        'player-4': 'player-1',
        'silencer-1': 'player-1',
      }

      // TODO: Implement green coin reward logic in GameEngine
      // Expected: NTG gets +4 green coins (7 - 3 = 4)
      // assertThat(result).playerHasCoins(ntg.userId, { green: 4 })
    })
  })

  describe('Healer Bonus (+5 Yellow)', () => {
    it('should give +5 yellow when healer saves silenced player', () => {
      const healer = new PlayerBuilder()
        .withUserId('healer-1')
        .asHealer()
        .withYellowCoins(7)
        .build()
      const narrator = new PlayerBuilder()
        .withUserId('narrator-1')
        .asNarrator()
        .build()
      const sender = new PlayerBuilder()
        .withUserId('sender-1')
        .asSender()
        .build()

      const target = new PlayerBuilder()
        .withUserId('target-1')
        .asConnector()
        .build()

      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([narrator, sender, healer, target, silencer])
        .asPlaying()
        .inPhase('healer-turn')
        .build()

      // Healer heals target
      const healResult = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: target.userId,
      })

      assertThat(healResult).isSuccessful()

      // Move to silencer turn
      const roomSilencerTurn = { ...healResult.room!, phase: 'silencer-turn' as const }

      // Silencer silences same target
      const silenceResult = engine.executeAction(roomSilencerTurn, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: target.userId,
      })

      assertThat(silenceResult).isSuccessful()

      // TODO: Implement healer bonus logic
      // Expected: Healer gets +5 yellow (7 + 5 = 12)
      // Expected: Target is NOT muted (healer saved them)
      // assertThat(silenceResult)
      //   .playerHasCoins(healer.userId, { yellow: 12 })
      //   .hasMutedPlayer(null)
    })

    it('should NOT give bonus when healing different player', () => {
      const healer = new PlayerBuilder()
        .withUserId('healer-1')
        .asHealer()
        .withYellowCoins(7)
        .build()
      const narrator = new PlayerBuilder()
        .withUserId('narrator-1')
        .asNarrator()
        .build()
      const sender = new PlayerBuilder()
        .withUserId('sender-1')
        .asSender()
        .build()

      const healTarget = new PlayerBuilder()
        .withUserId('heal-target')
        .asConnector()
        .build()

      const silenceTarget = new PlayerBuilder()
        .withUserId('silence-target')
        .asOpener()
        .build()

      const silencer = new PlayerBuilder()
        .withUserId('silencer-1')
        .asSilencer()
        .build()

      const room = new RoomBuilder()
        .withCustomPlayers([narrator, sender, healer, healTarget, silenceTarget, silencer])
        .asPlaying()
        .inPhase('healer-turn')
        .build()

      // Healer heals one player
      const healResult = engine.executeAction(room, {
        type: 'HEAL',
        actorId: healer.userId,
        targetId: healTarget.userId,
      })

      assertThat(healResult).isSuccessful()

      // Silencer silences different player
      const roomSilencerTurn = { ...healResult.room!, phase: 'silencer-turn' as const }

      const silenceResult = engine.executeAction(roomSilencerTurn, {
        type: 'SILENCE',
        actorId: silencer.userId,
        targetId: silenceTarget.userId,
      })

      assertThat(silenceResult)
        .isSuccessful()
        .hasMutedPlayer(silenceTarget.userId)

      // TODO: Verify no bonus given
      // assertThat(silenceResult).playerHasCoins(healer.userId, { yellow: 7 })
    })
  })

  describe('Role Completion Rewards', () => {
    describe('Connector/Opener Rewards', () => {
      it.each([
        { role: Role.CONNECTOR, description: 'Connector' },
        { role: Role.OPENER, description: 'Opener' },
      ])('$description should get +5 yellow if responded AND received red from NTG', ({ role }) => {
        const player = new PlayerBuilder()
          .withUserId('player-1')
          .withRole(role)
          .withYellowCoins(7)
          .build()

        const narrator = new PlayerBuilder()
          .withUserId('narrator-1')
          .asNarrator()
          .build()

        const room = new RoomBuilder()
          .withCustomPlayers([narrator, player])
          .asPlaying()
          .inPhase('reward')
          .build()

        // Mark as responded and received red from NTG
        room.roleCompletions = {
          'player-1': {
            responded: true,
            receivedRedFromNTG: true,
          },
        }

        // TODO: Implement role completion reward logic
        // Expected: Player gets +5 yellow (7 + 5 = 12)
      })

      it.each([
        { role: Role.CONNECTOR, description: 'Connector' },
        { role: Role.OPENER, description: 'Opener' },
      ])('$description should get +2 yellow if only responded (no red from NTG)', ({ role }) => {
        const player = new PlayerBuilder()
          .withUserId('player-1')
          .withRole(role)
          .withYellowCoins(7)
          .build()

        const narrator = new PlayerBuilder()
          .withUserId('narrator-1')
          .asNarrator()
          .build()

        const room = new RoomBuilder()
          .withCustomPlayers([narrator, player])
          .asPlaying()
          .inPhase('reward')
          .build()

        room.roleCompletions = {
          'player-1': {
            responded: true,
            receivedRedFromNTG: false,
          },
        }

        // TODO: Implement role completion reward logic
        // Expected: Player gets +2 yellow (7 + 2 = 9)
      })
    })

    describe('Guide Rewards', () => {
      it('should get +5 yellow if completed role AND responded AND received red', () => {
        const guide = new PlayerBuilder()
          .withUserId('guide-1')
          .asGuide()
          .withYellowCoins(7)
          .build()

        const narrator = new PlayerBuilder()
          .withUserId('narrator-1')
          .asNarrator()
          .build()

        const room = new RoomBuilder()
          .withCustomPlayers([narrator, guide])
          .asPlaying()
          .inPhase('reward')
          .build()

        room.roleCompletions = {
          'guide-1': {
            completedRole: true,
            responded: true,
            receivedRedFromNTG: true,
          },
        }

        // TODO: Implement guide reward logic
        // Expected: Guide gets +5 yellow (7 + 5 = 12)
      })
    })

    describe('Narrator Rewards', () => {
      it('should get +5 yellow if completed role AND received red from anyone', () => {
        const narrator = new PlayerBuilder()
          .withUserId('narrator-1')
          .asNarrator()
          .withYellowCoins(7)
          .build()

        const sender = new PlayerBuilder()
          .withUserId('sender-1')
          .asSender()
          .build()

        const room = new RoomBuilder()
          .withCustomPlayers([narrator, sender])
          .asPlaying()
          .inPhase('reward')
          .build()

        room.roleCompletions = {
          'narrator-1': {
            completedRole: true,
            receivedRedFromAnyone: true,
          },
        }

        // TODO: Implement narrator reward logic
        // Expected: Narrator gets +5 yellow (7 + 5 = 12)
      })
    })

    describe('Silencer Rewards', () => {
      it('should get +7 yellow if NOT detected', () => {
        const silencer = new PlayerBuilder()
          .withUserId('silencer-1')
          .asSilencer()
          .withYellowCoins(7)
          .build()

        const narrator = new PlayerBuilder()
          .withUserId('narrator-1')
          .asNarrator()
          .build()

        const room = new RoomBuilder()
          .withCustomPlayers([narrator, silencer])
          .asPlaying()
          .inPhase('reveal-silencer')
          .build()

        // Majority voted for wrong person
        room.votes = {
          'player-1': 'player-2',
          'player-2': 'player-3',
          'player-3': 'player-2',
        }

        // TODO: Implement silencer reward logic
        // Expected: Silencer gets +7 yellow (7 + 7 = 14)
      })

      it('should lose -2 yellow if detected', () => {
        const silencer = new PlayerBuilder()
          .withUserId('silencer-1')
          .asSilencer()
          .withYellowCoins(7)
          .build()

        const narrator = new PlayerBuilder()
          .withUserId('narrator-1')
          .asNarrator()
          .build()

        const room = new RoomBuilder()
          .withCustomPlayers([narrator, silencer])
          .asPlaying()
          .inPhase('reveal-silencer')
          .build()

        // Majority voted for silencer
        room.votes = {
          'player-1': silencer.userId,
          'player-2': silencer.userId,
          'player-3': silencer.userId,
        }

        // TODO: Implement silencer penalty logic
        // Expected: Silencer loses -2 yellow (7 - 2 = 5)
      })
    })
  })

  describe('Coin Reset Between Rounds', () => {
    it('should reset red coins to 3, keep yellow and green for all players', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('reward')
        .build()

      room.players[0].coins = { red: 1, yellow: 5, green: 3 }
      room.players[1].coins = { red: 0, yellow: 8, green: 4 }
      room.players[2].coins = { red: 2, yellow: 6, green: 5 }

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasPhase('role-reveal')
        .hasRound(2)

      // Red resets to 3; yellow and green accumulate (never reset)
      const p0 = result.room!.players.find(p => p.userId === room.players[0].userId)!
      const p1 = result.room!.players.find(p => p.userId === room.players[1].userId)!
      const p2 = result.room!.players.find(p => p.userId === room.players[2].userId)!

      expect(p0.coins.red).toBe(3)
      expect(p0.coins.yellow).toBe(5)
      expect(p0.coins.green).toBe(3)  // kept

      expect(p1.coins.red).toBe(3)
      expect(p1.coins.yellow).toBe(8)
      expect(p1.coins.green).toBe(4)  // kept — green never resets

      expect(p2.coins.red).toBe(3)
      expect(p2.coins.yellow).toBe(6)
      expect(p2.coins.green).toBe(5)  // kept
    })

    it('should clear redCoinsGiven tracking at start of new round', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('reward')
        .withRedCoinsGiven({
          'user-1': { 'user-2': 1 },
          'user-3': { 'user-4': 1 },
        })
        .build()

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasRound(2)

      expect(result.room?.redCoinsGiven).toEqual({})
    })

    it('should clear yellowCoinsGiven tracking at start of new round', () => {
      const room = new RoomBuilder()
        .withPlayers(7)
        .asPlaying()
        .inPhase('reward')
        .withYellowCoinsGiven({
          'user-1': { 'user-2': 2 },
          'user-3': { 'user-4': 3 },
        })
        .build()

      const result = engine.advanceTurn(room, room.currentNarrator!)

      assertThat(result)
        .isSuccessful()
        .hasRound(2)

      expect(result.room?.yellowCoinsGiven).toEqual({})
    })
  })
})
