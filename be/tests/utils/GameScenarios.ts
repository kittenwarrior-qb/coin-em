/**
 * GameScenarios - Reusable game test scenarios
 * Provides common game flows that can be used across different tests
 */

import { Room, GamePhase, Player } from '../../src/modules/game/types'
import { TestLogger } from './TestLogger'

export interface ScenarioConfig {
  playerCount: number
  rounds?: number
  logger?: TestLogger
}

export interface ScenarioResult {
  success: boolean
  room?: Room
  error?: string
  duration: number
  phases: GamePhase[]
}

export class GameScenarios {
  private logger: TestLogger

  constructor(logger?: TestLogger) {
    this.logger = logger || new TestLogger()
  }

  /**
   * Scenario: Complete single round
   * Runs through all 16 phases of one round
   */
  async completeSingleRound(room: Room): Promise<ScenarioResult> {
    const startTime = Date.now()
    const phases: GamePhase[] = []

    try {
      this.logger.info('SCENARIO', 'Starting single round scenario')

      // Expected phase order
      const expectedPhases: GamePhase[] = [
        'role-reveal',
        'night',
        'healer-turn',
        'silencer-turn',
        'situation-card',
        'emotion-card',
        'story-telling',
        'group-response',
        'reflection-card',
        'reflection-sharing',
        'selfcare-card',
        'hug-action',
        'guess-silencer',
        'reveal-silencer',
        'give-coins',
        'reward',
      ]

      for (const phase of expectedPhases) {
        phases.push(phase)
        this.logger.phase(phase, room.currentRound, room.totalRounds)
        
        // Simulate phase completion
        await this.simulatePhase(room, phase)
      }

      this.logger.success('SCENARIO', 'Single round completed')

      return {
        success: true,
        room,
        duration: Date.now() - startTime,
        phases,
      }
    } catch (error: any) {
      this.logger.error('SCENARIO', 'Single round failed', error.message)
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        phases,
      }
    }
  }

  /**
   * Scenario: Complete full game
   * Runs through all rounds until game ends
   */
  async completeFullGame(room: Room): Promise<ScenarioResult> {
    const startTime = Date.now()
    const phases: GamePhase[] = []

    try {
      this.logger.info('SCENARIO', `Starting full game scenario (${room.totalRounds} rounds)`)

      while (room.status === 'playing' && room.currentRound <= room.totalRounds) {
        this.logger.info('SCENARIO', `Round ${room.currentRound}/${room.totalRounds}`)
        
        const roundResult = await this.completeSingleRound(room)
        if (!roundResult.success) {
          throw new Error(roundResult.error)
        }

        phases.push(...roundResult.phases)
        room = roundResult.room!
      }

      this.logger.success('SCENARIO', 'Full game completed')

      return {
        success: true,
        room,
        duration: Date.now() - startTime,
        phases,
      }
    } catch (error: any) {
      this.logger.error('SCENARIO', 'Full game failed', error.message)
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        phases,
      }
    }
  }

  /**
   * Scenario: Night phase actions
   * Simulates healer and silencer actions
   */
  async nightPhaseActions(room: Room): Promise<ScenarioResult> {
    const startTime = Date.now()
    const phases: GamePhase[] = []

    try {
      this.logger.info('SCENARIO', 'Starting night phase actions')

      // Healer turn
      phases.push('healer-turn')
      await this.simulatePhase(room, 'healer-turn')

      // Silencer turn
      phases.push('silencer-turn')
      await this.simulatePhase(room, 'silencer-turn')

      this.logger.success('SCENARIO', 'Night phase actions completed')

      return {
        success: true,
        room,
        duration: Date.now() - startTime,
        phases,
      }
    } catch (error: any) {
      this.logger.error('SCENARIO', 'Night phase actions failed', error.message)
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        phases,
      }
    }
  }

  /**
   * Scenario: Voting phase
   * Simulates all players voting
   */
  async votingPhase(room: Room): Promise<ScenarioResult> {
    const startTime = Date.now()
    const phases: GamePhase[] = ['guess-silencer']

    try {
      this.logger.info('SCENARIO', 'Starting voting phase')

      await this.simulatePhase(room, 'guess-silencer')

      this.logger.success('SCENARIO', 'Voting phase completed')

      return {
        success: true,
        room,
        duration: Date.now() - startTime,
        phases,
      }
    } catch (error: any) {
      this.logger.error('SCENARIO', 'Voting phase failed', error.message)
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        phases,
      }
    }
  }

  /**
   * Scenario: Coin giving phase
   * Simulates players giving coins
   */
  async coinGivingPhase(room: Room): Promise<ScenarioResult> {
    const startTime = Date.now()
    const phases: GamePhase[] = ['give-coins']

    try {
      this.logger.info('SCENARIO', 'Starting coin giving phase')

      await this.simulatePhase(room, 'give-coins')

      this.logger.success('SCENARIO', 'Coin giving phase completed')

      return {
        success: true,
        room,
        duration: Date.now() - startTime,
        phases,
      }
    } catch (error: any) {
      this.logger.error('SCENARIO', 'Coin giving phase failed', error.message)
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        phases,
      }
    }
  }

  /**
   * Helper: Simulate phase completion
   * Override this in tests to provide actual implementation
   */
  protected async simulatePhase(room: Room, phase: GamePhase): Promise<void> {
    // Default: just wait a bit
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
