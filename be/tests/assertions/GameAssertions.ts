import { expect } from 'vitest'
import { GameResult } from '../../src/modules/game/engine/GameEngine'
import { GamePhase, GameStatus, Coins, Role } from '../../src/modules/game/types'

/**
 * Assert Object Pattern for GameResult
 * Provides fluent API for readable assertions
 */
export class GameResultAssertion {
  constructor(private result: GameResult) {}

  isSuccessful(): this {
    expect(this.result.success).toBe(true)
    return this
  }

  hasFailed(): this {
    expect(this.result.success).toBe(false)
    return this
  }

  hasError(error: string): this {
    expect(this.result.success).toBe(false)
    expect(this.result.error).toBe(error)
    return this
  }

  hasMessage(message: string): this {
    expect(this.result.message).toBe(message)
    return this
  }

  hasStatus(status: GameStatus): this {
    expect(this.result.room?.status).toBe(status)
    return this
  }

  hasPhase(phase: GamePhase): this {
    expect(this.result.room?.phase).toBe(phase)
    return this
  }

  hasRound(round: number): this {
    expect(this.result.room?.currentRound).toBe(round)
    return this
  }

  allPlayersHaveRoles(): this {
    expect(this.result.room?.players.every(p => p.role)).toBe(true)
    return this
  }

  hasPlayerCount(count: number): this {
    expect(this.result.room?.players.length).toBe(count)
    return this
  }

  hasMutedPlayer(userId: string | null): this {
    expect(this.result.room?.mutedPlayer).toBe(userId)
    return this
  }

  hasHealedPlayer(userId: string | null): this {
    expect(this.result.room?.healedPlayer).toBe(userId)
    return this
  }

  hasNightAction(action: 'silenced' | 'healed' | 'cardSelected', value: boolean): this {
    expect(this.result.room?.nightActions[action]).toBe(value)
    return this
  }

  hasVoteCount(count: number): this {
    expect(Object.keys(this.result.room?.votes || {}).length).toBe(count)
    return this
  }

  playerVotedFor(voterId: string, suspectId: string): this {
    expect(this.result.room?.votes[voterId]).toBe(suspectId)
    return this
  }

  shouldAutoAdvance(): this {
    expect(this.result.autoAdvance).toBe(true)
    return this
  }

  shouldNotAutoAdvance(): this {
    expect(this.result.autoAdvance).toBeFalsy()
    return this
  }

  playerHasCoins(userId: string, coins: Partial<Coins>): this {
    const player = this.result.room?.players.find(p => p.userId === userId)
    expect(player).toBeDefined()
    
    if (coins.red !== undefined) {
      expect(player?.coins.red).toBe(coins.red)
    }
    if (coins.yellow !== undefined) {
      expect(player?.coins.yellow).toBe(coins.yellow)
    }
    if (coins.green !== undefined) {
      expect(player?.coins.green).toBe(coins.green)
    }
    return this
  }

  playerHasRole(userId: string, role: Role): this {
    const player = this.result.room?.players.find(p => p.userId === userId)
    expect(player?.role).toBe(role)
    return this
  }

  hasNarrator(userId: string): this {
    expect(this.result.room?.currentNarrator).toBe(userId)
    return this
  }

  hasSender(userId: string): this {
    expect(this.result.room?.currentNTG).toBe(userId)
    return this
  }

  redCoinGiven(giverId: string, receiverId: string, amount: number): this {
    expect(this.result.room?.redCoinsGiven[giverId]?.[receiverId]).toBe(amount)
    return this
  }

  yellowCoinGiven(giverId: string, receiverId: string, amount: number): this {
    expect(this.result.room?.yellowCoinsGiven[giverId]?.[receiverId]).toBe(amount)
    return this
  }

  getRoom() {
    return this.result.room!
  }
}

/**
 * Factory function for creating GameResultAssertion
 */
export function assertThat(result: GameResult): GameResultAssertion {
  return new GameResultAssertion(result)
}

/**
 * Assertion for checking coin state
 */
export class CoinAssertion {
  constructor(private coins: Coins) {}

  hasRed(amount: number): this {
    expect(this.coins.red).toBe(amount)
    return this
  }

  hasYellow(amount: number): this {
    expect(this.coins.yellow).toBe(amount)
    return this
  }

  hasGreen(amount: number): this {
    expect(this.coins.green).toBe(amount)
    return this
  }

  hasTotal(amount: number): this {
    const total = this.coins.red + this.coins.yellow + this.coins.green
    expect(total).toBe(amount)
    return this
  }
}

export function assertCoins(coins: Coins): CoinAssertion {
  return new CoinAssertion(coins)
}
