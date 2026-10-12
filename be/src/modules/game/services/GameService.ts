import { GameEngine } from '../engine/GameEngine'
import { Room, GameAction, GameResult } from '../types'
import { roomView } from './RoomView'

export class GameService {
  private gameEngine: GameEngine

  constructor() {
    this.gameEngine = new GameEngine()
  }

  /**
   * Start a game
   */
  async startGame(room: Room): Promise<GameResult> {
    return this.gameEngine.startGame(room)
  }

  /**
   * Advance turn
   */
  async advanceTurn(room: Room, narratorId: string): Promise<GameResult> {
    return this.gameEngine.advanceTurn(room, narratorId)
  }

  /**
   * Move back one phase
   */
  async previousTurn(room: Room, narratorId: string): Promise<GameResult> {
    return this.gameEngine.previousTurn(room, narratorId)
  }

  async endGame(room: Room, narratorId: string): Promise<GameResult> {
    return this.gameEngine.endGame(room, narratorId)
  }

  /**
   * Execute action
   */
  async executeAction(room: Room, action: GameAction): Promise<GameResult> {
    return this.gameEngine.executeAction(room, action)
  }

  /**
   * Get player-specific view of game state
   */
  getPlayerView(room: Room, playerId: string): any {
    return roomView(room, playerId)
  }

  /**
   * Get public room state (for broadcasting)
   */
  getPublicState(room: Room): any {
    return roomView(room)
  }
}

// Singleton instance
export const gameService = new GameService()
