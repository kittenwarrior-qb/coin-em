import { Room, GameAction, GameResult, GameLogEntry } from '../types'
import { StateMachine } from './StateMachine'
import { TurnManager } from './TurnManager'
import { RoleManager } from './RoleManager'
import { ActionValidator } from './ActionValidator'

export class GameEngine {
  private stateMachine: StateMachine
  private turnManager: TurnManager
  private roleManager: RoleManager
  private actionValidator: ActionValidator

  constructor() {
    this.stateMachine = new StateMachine()
    this.turnManager = new TurnManager()
    this.roleManager = new RoleManager()
    this.actionValidator = new ActionValidator()
  }

  /**
   * Advance to next turn
   */
  advanceTurn(room: Room, narratorId: string): GameResult {
    // Validate narrator
    if (!this.actionValidator.canAdvanceTurn(room, narratorId)) {
      return { success: false, error: 'NOT_NARRATOR' }
    }

    // Check if game should end
    if (this.turnManager.shouldEndGame(room)) {
      return this.endGame(room)
    }

    // Get next phase
    const nextPhase = this.turnManager.getNextPhase(room.phase)

    let updatedRoom: Room = {
      ...room,
      phase: nextPhase,
      lastActivity: Date.now(),
    }

    // Start new round if transitioning from reward to role-reveal
    if (room.phase === 'reward' && nextPhase === 'role-reveal') {
      updatedRoom.currentRound = this.turnManager.getNextRound(room)

      // Rotate roles
      updatedRoom = this.roleManager.rotateRoles(updatedRoom)

      // Reset night actions, votes, and coins given for new round
      updatedRoom.mutedPlayer = null
      updatedRoom.healedPlayer = null
      updatedRoom.selectedCard = null
      updatedRoom.votes = {}
      updatedRoom.nightActions = { silenced: false, healed: false, cardSelected: false }
      updatedRoom.coinsGiven = {}

      // Log role rotation
      updatedRoom.gameLog = [
        ...updatedRoom.gameLog,
        {
          type: 'ROLE_ROTATION',
          actorId: 'system',
          timestamp: Date.now(),
          data: {
            round: updatedRoom.currentRound,
            narrator: updatedRoom.currentNarrator,
            sender: updatedRoom.currentNTG,
          },
        },
      ]
    }

    // Reset night actions when entering night phase
    if (nextPhase === 'night') {
      updatedRoom.nightActions = { silenced: false, healed: false, cardSelected: false }
      updatedRoom.mutedPlayer = null
      updatedRoom.healedPlayer = null
      updatedRoom.selectedCard = null
    }

    // Reset votes when entering guess-role phase
    if (nextPhase === 'guess-role') {
      updatedRoom.votes = {}
    }

    // Reset coins given when entering day-draw phase
    if (nextPhase === 'day-draw') {
      updatedRoom.coinsGiven = {}
    }

    // Log phase change
    updatedRoom.gameLog = [
      ...updatedRoom.gameLog,
      {
        type: 'PHASE_CHANGED',
        actorId: narratorId,
        timestamp: Date.now(),
        data: {
          phase: nextPhase,
        },
      },
    ]

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute game action
   */
  executeAction(room: Room, action: GameAction): GameResult {
    // Validate action
    const validation = this.actionValidator.validate(room, action)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Execute based on action type
    switch (action.type) {
      case 'SILENCE':
        return this.executeSilence(room, action)
      case 'HEAL':
        return this.executeHeal(room, action)
      case 'SELECT_CARD':
        return this.executeSelectCard(room, action)
      case 'SELECT_SELFCARE_CARD':
        return this.executeSelectSelfcareCard(room, action)
      case 'GIVE_COIN':
        return this.executeGiveCoin(room, action)
      case 'VOTE':
        return this.executeVote(room, action)
      default:
        return { success: false, error: 'UNKNOWN_ACTION' }
    }
  }

  /**
   * Execute silence action
   */
  private executeSilence(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      mutedPlayer: action.targetId!,
      nightActions: {
        ...room.nightActions,
        silenced: true,
      },
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SILENCE',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute heal action
   */
  private executeHeal(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      healedPlayer: action.targetId!,
      // Remove mute if healed player was muted
      mutedPlayer: room.mutedPlayer === action.targetId ? null : room.mutedPlayer,
      nightActions: {
        ...room.nightActions,
        healed: true,
      },
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'HEAL',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute select card action (NTG draws situation card)
   */
  private executeSelectCard(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      selectedCard: action.data?.card,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SELECT_CARD',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: action.data,
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute select selfcare card action (Guide selects during night)
   */
  private executeSelectSelfcareCard(room: Room, action: GameAction): GameResult {
    const updatedRoom: Room = {
      ...room,
      selectedCard: action.data?.card,
      nightActions: {
        ...room.nightActions,
        cardSelected: true,
      },
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'SELECT_SELFCARE_CARD',
          actorId: action.actorId,
          timestamp: Date.now(),
          data: action.data,
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute give coin action
   */
  private executeGiveCoin(room: Room, action: GameAction): GameResult {
    const { targetId, data } = action
    const { coinType } = data || {}

    // Update coins given tracking
    const coinsGiven = { ...room.coinsGiven }
    if (!coinsGiven[action.actorId]) {
      coinsGiven[action.actorId] = {}
    }
    if (!coinsGiven[action.actorId][targetId!]) {
      coinsGiven[action.actorId][targetId!] = { red: 0, yellow: 0, green: 0 }
    }
    coinsGiven[action.actorId][targetId!][coinType as keyof typeof coinsGiven[string][string]]++

    // Update players
    const updatedPlayers = room.players.map((p) => {
      if (p.userId === targetId) {
        return {
          ...p,
          coins: {
            ...p.coins,
            [coinType]: p.coins[coinType as keyof typeof p.coins] + 1,
          },
        }
      }
      return p
    })

    const updatedRoom: Room = {
      ...room,
      players: updatedPlayers,
      coinsGiven,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'GIVE_COIN',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
          data: { coinType },
        },
      ],
    }

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute vote action
   */
  private executeVote(room: Room, action: GameAction): GameResult {
    const newVotes = { ...room.votes, [action.actorId]: action.targetId! }
    const allVoted = room.players.length === Object.keys(newVotes).length

    const updatedRoom: Room = {
      ...room,
      votes: newVotes,
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'VOTE',
          actorId: action.actorId,
          targetId: action.targetId,
          timestamp: Date.now(),
        },
      ],
    }

    return { success: true, room: updatedRoom, autoAdvance: allVoted }
  }

  /**
   * End game
   */
  private endGame(room: Room): GameResult {
    const updatedRoom: Room = {
      ...room,
      status: 'ended',
      phase: 'ended',
      lastActivity: Date.now(),
      gameLog: [
        ...room.gameLog,
        {
          type: 'GAME_ENDED',
          actorId: 'system',
          timestamp: Date.now(),
        },
      ],
    }

    return { success: true, room: updatedRoom, message: 'GAME_ENDED' }
  }

  /**
   * Start game
   */
  startGame(room: Room): GameResult {
    if (room.status !== 'waiting') {
      return { success: false, error: 'GAME_ALREADY_STARTED' }
    }

    if (room.players.length < 7) {
      return { success: false, error: 'NOT_ENOUGH_PLAYERS' }
    }

    if (room.players.length > 11) {
      return { success: false, error: 'TOO_MANY_PLAYERS' }
    }

    // Assign roles
    let playersWithRoles
    try {
      playersWithRoles = this.roleManager.assignRoles(room.players)
    } catch (error: any) {
      return { success: false, error: 'ROLE_ASSIGNMENT_FAILED', message: error.message }
    }

    // Ensure host is narrator
    const hostIndex = playersWithRoles.findIndex((p) => p.userId === room.host)
    if (hostIndex !== -1) {
      const narratorIndex = playersWithRoles.findIndex((p) => p.isNarrator)
      if (narratorIndex !== -1 && narratorIndex !== hostIndex) {
        // Swap roles
        const hostRole = playersWithRoles[hostIndex].role
        const narratorRole = playersWithRoles[narratorIndex].role

        playersWithRoles[hostIndex].role = narratorRole
        playersWithRoles[hostIndex].isNarrator = true
        playersWithRoles[hostIndex].isSender = false

        playersWithRoles[narratorIndex].role = hostRole
        playersWithRoles[narratorIndex].isNarrator = false
        playersWithRoles[narratorIndex].isSender = hostRole === 'Người Trao Gửi'
      }
    }

    // Find narrator and sender
    const narrator = playersWithRoles.find((p) => p.isNarrator)
    const sender = playersWithRoles.find((p) => p.isSender)

    const updatedRoom: Room = {
      ...room,
      players: playersWithRoles,
      status: 'playing',
      phase: 'role-reveal',
      turn: 1,
      currentRound: 1,
      totalRounds: room.players.length,
      currentNarrator: narrator?.userId || room.host,
      currentNTG: sender?.userId || null,
      mutedPlayer: null,
      healedPlayer: null,
      selectedCard: null,
      votes: {},
      nightActions: { silenced: false, healed: false, cardSelected: false },
      coinsGiven: {},
      gameLog: [
        {
          type: 'GAME_STARTED',
          actorId: room.host,
          timestamp: Date.now(),
        },
      ],
      lastActivity: Date.now(),
    }

    return { success: true, room: updatedRoom }
  }

  /**
   * Get game state for specific player (hide sensitive info)
   */
  getPlayerView(room: Room, playerId: string): any {
    const player = room.players.find((p) => p.userId === playerId)
    const isNarrator = player?.isNarrator

    return {
      ...room,
      players: room.players.map((p) => ({
        ...p,
        // Hide role unless it's the player themselves, public role, or narrator viewing during night
        role:
          p.userId === playerId ||
          p.isNarrator ||
          p.isSender ||
          (isNarrator && room.phase === 'night')
            ? p.role
            : undefined,
      })),
    }
  }
}
