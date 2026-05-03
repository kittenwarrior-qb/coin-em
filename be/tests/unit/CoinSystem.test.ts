import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { it } from 'vitest'
import { describe } from 'vitest'
import { beforeEach } from 'vitest'
import { describe } from 'vitest'
import { GameEngine } from '../../src/modules/game/engine/GameEngine'
import { Room, Player, Role } from '../../src/modules/game/types'

describe('Coin System', () => {
  let gameEngine: GameEngine
  let mockRoom: Room

  beforeEach(() => {
    gameEngine = new GameEngine()

    // Create mock players
    const players: Player[] = [
      {
        socketId: 's1',
        userId: 'u1',
        name: 'Player 1',
        role: Role.NARRATOR,
        isNarrator: true,
        isSender: false,
        coins: { red: 3, yellow: 7, green: 0 },
      },
      {
        socketId: 's2',
        userId: 'u2',
        name: 'Player 2',
        role: Role.SENDER,
        isNarrator: false,
        isSender: true,
        coins: { red: 3, yellow: 7, green: 0 },
      },
      {
        socketId: 's3',
        userId: 'u3',
        name: 'Player 3',
        role: Role.SILENCER,
        isNarrator: false,
        isSender: false,
        coins: { red: 3, yellow: 7, green: 0 },
      },
      {
        socketId: 's4',
        userId: 'u4',
        name: 'Player 4',
        role: Role.HEALER,
        isNarrator: false,
        isSender: false,
        coins: { red: 3, yellow: 7, green: 0 },
      },
      {
        socketId: 's5',
        userId: 'u5',
        name: 'Player 5',
        role: Role.CONNECTOR,
        isNarrator: false,
        isSender: false,
        coins: { red: 3, yellow: 7, green: 0 },
      },
    ]

    mockRoom = {
      id: 'room1',
      host: 'u1',
      players,
      status: 'playing',
      phase: 'give-coins',
      turn: 1,
      currentRound: 1,
      totalRounds: 5,
      currentNTG: 'u2',
      currentNarrator: 'u1',
      mutedPlayer: 'u5',
      healedPlayer: null,
      selectedCard: null,
      gameLog: [],
      lastActivity: Date.now(),
      votes: {},
      nightActions: { silenced: true, healed: false, cardSelected: false },
      redCoinsGiven: {},
      yellowCoinsGiven: {},
      roleCompletions: {},
      responses: {},
      bonusesGiven: { healerBonus: false },
    }
  })

  describe('Red Coin Giving', () => {
    it('should reduce giver red coins and receiver gains red', async () => {
      const action = {
        type: 'GIVE_COIN' as const,
        actorId: 'u1',
        targetId: 'u2',
        data: { coinType: 'red', amount: 1 },
      }

      const result = await gameEngine.executeAction(mockRoom, action)

      expect(result.success).toBe(true)
      const giver = result.room!.players.find((p) => p.userId === 'u1')
      const receiver = result.room!.players.find((p) => p.userId === 'u2')

      expect(giver!.coins.red).toBe(2)    // 3 - 1 = 2
      expect(receiver!.coins.green).toBe(1) // receiver gains 1 green
    })

    it('should track red coins given with amounts', async () => {
      // First red coin
      const action1 = {
        type: 'GIVE_COIN' as const,
        actorId: 'u1',
        targetId: 'u2',
        data: { coinType: 'red', amount: 1 },
      }

      const result1 = await gameEngine.executeAction(mockRoom, action1)
      expect(result1.success).toBe(true)
      expect(result1.room!.redCoinsGiven['u1']['u2']).toBe(1)

      // Give another red coin to different person (only 1 coin)
      const action2 = {
        type: 'GIVE_COIN' as const,
        actorId: 'u1',
        targetId: 'u3',
        data: { coinType: 'red', amount: 1 },
      }

      const result2 = await gameEngine.executeAction(result1.room!, action2)
      expect(result2.success).toBe(true)
      expect(result2.room!.redCoinsGiven['u1']['u2']).toBe(1)
      expect(result2.room!.redCoinsGiven['u1']['u3']).toBe(1)
      
      // Giver should have 1 red coin left (3 - 1 - 1 = 1)
      const giver = result2.room!.players.find((p) => p.userId === 'u1')
      expect(giver!.coins.red).toBe(1)
    })
  })

  describe('Yellow Coin Giving', () => {
    it('should reduce giver yellow coins and receiver gains yellow', async () => {
      const action = {
        type: 'GIVE_COIN' as const,
        actorId: 'u1',
        targetId: 'u2',
        data: { coinType: 'yellow' },
      }

      const result = await gameEngine.executeAction(mockRoom, action)

      expect(result.success).toBe(true)
      const giver = result.room!.players.find((p) => p.userId === 'u1')
      const receiver = result.room!.players.find((p) => p.userId === 'u2')

      expect(giver!.coins.yellow).toBe(6)   // 7 - 1 = 6
      expect(receiver!.coins.green).toBe(1)  // receiver gains 1 green
    })

    it('should not allow giving yellow if insufficient coins', async () => {
      // Set giver to 0 yellow coins
      mockRoom.players[0].coins.yellow = 0

      const action = {
        type: 'GIVE_COIN' as const,
        actorId: 'u1',
        targetId: 'u2',
        data: { coinType: 'yellow' },
      }

      const result = await gameEngine.executeAction(mockRoom, action)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient yellow coins')
    })
  })

  describe('Green Coin Rewards', () => {
    it('should not allow giving green coins', async () => {
      const action = {
        type: 'GIVE_COIN' as const,
        actorId: 'u1',
        targetId: 'u2',
        data: { coinType: 'green' },
      }

      const result = await gameEngine.executeAction(mockRoom, action)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot give green coins')
    })
  })

  describe('Response Tracking', () => {
    it('should track player responses', async () => {
      mockRoom.phase = 'group-response'

      const action = {
        type: 'SEND_RESPONSE' as const,
        actorId: 'u5',
        data: { message: 'Great story!' },
      }

      const result = await gameEngine.executeAction(mockRoom, action)

      expect(result.success).toBe(true)
      expect(result.room!.responses['u5']).toBe('Great story!')
      // Note: responded is NOT tracked anymore, narrator decides on UI
    })
  })
})
