import { GameEngine } from '../engine/GameEngine'
import { Room, GameAction, GameResult } from '../types'

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
   * Execute action
   */
  async executeAction(room: Room, action: GameAction): Promise<GameResult> {
    return this.gameEngine.executeAction(room, action)
  }

  /**
   * Get player-specific view of game state
   */
  getPlayerView(room: Room, playerId: string): any {
    return this.gameEngine.getPlayerView(room, playerId)
  }

  /**
   * Get public room state (for broadcasting)
   */
  getPublicState(room: Room): any {
    return {
      id: room.id,
      host: room.host,
      players: room.players.map(p => ({
        ...p,
        // Display role: current round role (narrator/sender override), else originalRole
        role: p.isNarrator
          ? p.role  // 'Người Quản trò'
          : p.isSender
            ? p.role  // 'Người Trao Gửi'
            : p.originalRole ?? p.role,  // everyone else shows their fixed original role
      })),
      status: room.status,
      phase: room.phase,
      turn: room.turn,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      currentNTG: room.currentNTG,
      currentNarrator: room.currentNarrator,
      mutedPlayer: room.mutedPlayer,
      selectedCard: room.selectedCard,
      votes: room.votes,
    }
  }
}

// Singleton instance
export const gameService = new GameService()
