import { GameEngine } from '../engine/GameEngine'
import { Room, GameAction, GameResult, Role } from '../types'

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
    // Determine who draws selfcare card this round
    const guideInRound = room.players.find(
      (p) => p.originalRole === Role.GUIDE && !p.isFake
    )
    const selfcareActor = guideInRound
      ? guideInRound.userId   // Guide draws
      : room.currentNTG       // No Guide → NTG draws

    return {
      id: room.id,
      host: room.host,
      players: room.players.map(p => {
        const baseRole = p.originalRole ?? p.role
        const displayRole = p.isNarrator
          ? Role.NARRATOR
          : p.isSender
            ? Role.SENDER
            : baseRole === Role.NARRATOR || baseRole === Role.SENDER
              ? undefined
              : baseRole

        return {
          ...p,
          // Public roles are current-round flags only; do not show stale narrator/sender roles after rotation.
          role: displayRole,
        }
      }),
      status: room.status,
      phase: room.phase,
      turn: room.turn,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      currentNTG: room.currentNTG,
      currentNarrator: room.currentNarrator,
      mutedPlayer: room.mutedPlayer,
      selectedCard: room.selectedCard,
      settings: room.settings,
      resumeExpiresAt: null,
      gameLog: room.gameLog,
      nightActions: room.nightActions,
      votes: room.votes,
      selfcareActor, // userId of who draws selfcare card (Guide or NTG fallback)
      debugRolePickerEnabled: room.debugRolePickerEnabled,
    }
  }
}

// Singleton instance
export const gameService = new GameService()
