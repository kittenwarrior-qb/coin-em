import { Room, Player, Role, GamePhase, GameStatus, NightActions } from '../../src/modules/game/types'
import { createMockPlayers } from '../helpers/mockData'

/**
 * Builder Pattern for creating test Room objects
 * Provides fluent API for flexible room configuration
 */
export class RoomBuilder {
  private playerCount: number = 7
  private phase: GamePhase = 'role-reveal'
  private status: GameStatus = 'waiting'
  private currentRound: number = 1
  private nightActions: NightActions = { silenced: false, healed: false, cardSelected: false }
  private mutedPlayer: string | null = null
  private healedPlayer: string | null = null
  private votes: Record<string, string> = {}
  private redCoinsGiven: Record<string, Record<string, number>> = {}
  private yellowCoinsGiven: Record<string, Record<string, number>> = {}
  private customPlayers?: Player[]

  withPlayers(count: number): this {
    this.playerCount = count
    return this
  }

  withCustomPlayers(players: Player[]): this {
    this.customPlayers = players
    this.playerCount = players.length
    return this
  }

  inPhase(phase: GamePhase): this {
    this.phase = phase
    return this
  }

  withStatus(status: GameStatus): this {
    this.status = status
    return this
  }

  inRound(round: number): this {
    this.currentRound = round
    return this
  }

  withNightActions(actions: Partial<NightActions>): this {
    this.nightActions = { ...this.nightActions, ...actions }
    return this
  }

  withMutedPlayer(userId: string): this {
    this.mutedPlayer = userId
    return this
  }

  withHealedPlayer(userId: string): this {
    this.healedPlayer = userId
    return this
  }

  withVotes(votes: Record<string, string>): this {
    this.votes = votes
    return this
  }

  withRedCoinsGiven(redCoins: Record<string, Record<string, number>>): this {
    this.redCoinsGiven = redCoins
    return this
  }

  withYellowCoinsGiven(yellowCoins: Record<string, Record<string, number>>): this {
    this.yellowCoinsGiven = yellowCoins
    return this
  }

  asPlaying(): this {
    this.status = 'playing'
    return this
  }

  asEnded(): this {
    this.status = 'ended'
    this.phase = 'ended'
    return this
  }

  build(): Room {
    const players = this.customPlayers || createMockPlayers(this.playerCount)
    
    // Validate minimum players when playing
    if (this.status === 'playing' && players.length < 2) {
      throw new Error('Playing room requires at least 2 players (narrator + sender)')
    }
    
    const host = players[0]

    // Assign roles if playing
    if (this.status === 'playing') {
      const roles: Role[] = [
        Role.NARRATOR,
        Role.SENDER,
        Role.SILENCER,
        Role.HEALER,
        Role.CONNECTOR,
        Role.OPENER,
        Role.GUIDE,
      ]

      players.forEach((p, i) => {
        // Only assign role if not already set
        if (!p.role) {
          p.role = roles[i % roles.length]
          p.originalRole = roles[i % roles.length]
        } else {
          // If role already set, ensure originalRole is also set
          if (!p.originalRole) {
            p.originalRole = p.role
          }
        }
        
        p.isNarrator = i === 0
        p.isSender = i === 1
        
        // Only set default coins if not already customized
        if (p.coins.red === 0 && p.coins.yellow === 0 && p.coins.green === 0) {
          p.coins = { red: 3, yellow: this.playerCount, green: 0 }
        }
        
        if (p.collectedGreenCoins === undefined) {
          p.collectedGreenCoins = 0
        }
      })
    }

    return {
      id: `room-${Math.random().toString(36).substr(2, 9)}`,
      host: host.userId,
      players,
      status: this.status,
      phase: this.phase,
      turn: 1,
      currentRound: this.currentRound,
      totalRounds: this.playerCount,
      currentNTG: this.status === 'playing' && players.length > 1 ? players[1].userId : null,
      currentNarrator: this.status === 'playing' && players.length > 0 ? players[0].userId : null,
      mutedPlayer: this.mutedPlayer,
      healedPlayer: this.healedPlayer,
      selectedCard: null,
      gameLog: [],
      lastActivity: Date.now(),
      votes: this.votes,
      nightActions: this.nightActions,
      redCoinsGiven: this.redCoinsGiven,
      yellowCoinsGiven: this.yellowCoinsGiven,
      roleCompletions: {},
      responses: {},
      bonusesGiven: { healerBonus: false },
    }
  }
}
