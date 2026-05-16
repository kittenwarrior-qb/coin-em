import { Room, GameAction, GameResult, Role } from '../types'
import { StateMachine } from './StateMachine'
import { TurnManager } from './TurnManager'
import { RoleManager } from './RoleManager'
import { ActionValidator } from './ActionValidator'
import { CommandFactory } from '../commands/CommandFactory'
import { RewardCalculator } from '../services/RewardCalculator'

export class GameEngine {
  private stateMachine: StateMachine
  private turnManager: TurnManager
  private roleManager: RoleManager
  private actionValidator: ActionValidator
  private commandFactory: CommandFactory
  private rewardCalculator: RewardCalculator

  constructor() {
    this.stateMachine = new StateMachine()
    this.turnManager = new TurnManager()
    this.roleManager = new RoleManager()
    this.actionValidator = new ActionValidator()
    this.commandFactory = new CommandFactory()
    this.rewardCalculator = new RewardCalculator()
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
    const nextPhase = this.turnManager.getNextPhase(room.phase, room)

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

      // Reset per-round state
      updatedRoom.mutedPlayer = null
      updatedRoom.healedPlayer = null
      updatedRoom.selectedCard = null
      updatedRoom.votes = {}
      updatedRoom.ntgVotes = {}
      updatedRoom.nightActions = { silenced: false, healed: false, cardSelected: false }
      updatedRoom.redCoinsGiven = {}
      updatedRoom.yellowCoinsGiven = {}
      updatedRoom.roleCompletions = {}
      updatedRoom.responses = {}
      updatedRoom.bonusesGiven = { healerBonus: false }

      // Reset red to 3 each round; yellow and green ACCUMULATE (never reset)
      updatedRoom.players = updatedRoom.players.map((p) => ({
        ...p,
        coins: {
          red: 3,
          yellow: p.coins.yellow,  // keep
          green: p.coins.green,    // keep — accumulates across all rounds
        },
      }))

      updatedRoom.gameLog = [
        ...updatedRoom.gameLog,
        {
          type: 'ROUND_STARTED',
          actorId: 'system',
          timestamp: Date.now(),
          data: { round: updatedRoom.currentRound },
        },
      ]
    }

    // Calculate rewards when entering reward phase
    if (nextPhase === 'reward') {
      updatedRoom = this.calculateRewards(updatedRoom)
    }

    // Reset night actions when entering night phase
    if (nextPhase === 'night') {
      updatedRoom.nightActions = { silenced: false, healed: false, cardSelected: false }
      updatedRoom.mutedPlayer = null
      updatedRoom.healedPlayer = null
      updatedRoom.selectedCard = null
    }

    // Auto-advance from night to healer-turn
    if (nextPhase === 'healer-turn') {
      // Just transition, healer will act
    }

    // Reset votes when entering guess-silencer phase
    if (nextPhase === 'guess-silencer') {
      updatedRoom.votes = {}
    }

    // Reset coin tracking when entering give-coins phase
    if (nextPhase === 'give-coins') {
      updatedRoom.redCoinsGiven = {}
      updatedRoom.yellowCoinsGiven = {}
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
   * Move back to the previous phase in the same round so the narrator can let players choose again.
   */
  previousTurn(room: Room, narratorId: string): GameResult {
    if (!this.actionValidator.canAdvanceTurn(room, narratorId)) {
      return { success: false, error: 'NOT_NARRATOR' }
    }

    const previousPhase = this.turnManager.getPreviousPhase(room.phase, room)
    if (previousPhase === room.phase) {
      return { success: false, error: 'NO_PREVIOUS_PHASE' }
    }

    let updatedRoom: Room = {
      ...room,
      phase: previousPhase,
      lastActivity: Date.now(),
    }

    switch (previousPhase) {
      case 'night':
        updatedRoom.nightActions = { silenced: false, healed: false, cardSelected: false }
        updatedRoom.mutedPlayer = null
        updatedRoom.healedPlayer = null
        updatedRoom.selectedCard = null
        break
      case 'healer-turn':
        updatedRoom.nightActions = { ...updatedRoom.nightActions, healed: false }
        updatedRoom.healedPlayer = null
        break
      case 'silencer-turn':
        updatedRoom.nightActions = { ...updatedRoom.nightActions, silenced: false }
        updatedRoom.mutedPlayer = null
        break
      case 'situation-card':
      case 'emotion-card':
      case 'reflection-card':
      case 'selfcare-card':
        updatedRoom.selectedCard = null
        updatedRoom.nightActions = { ...updatedRoom.nightActions, cardSelected: false }
        break
      case 'group-response':
        updatedRoom.responses = {}
        break
      case 'guess-silencer':
        updatedRoom.votes = {}
        break
      case 'give-coins':
        updatedRoom.redCoinsGiven = {}
        updatedRoom.yellowCoinsGiven = {}
        break
    }

    updatedRoom.gameLog = [
      ...updatedRoom.gameLog,
      {
        type: 'PHASE_CHANGED',
        actorId: narratorId,
        timestamp: Date.now(),
        data: {
          phase: previousPhase,
          direction: 'previous',
        },
      },
    ]

    return { success: true, room: updatedRoom }
  }

  /**
   * Execute game action using Command Pattern
   */
  executeAction(room: Room, action: GameAction): GameResult {
    // Validate action
    const validation = this.actionValidator.validate(room, action)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Get command and execute
    const command = this.commandFactory.getCommand(action)
    if (!command) {
      return { success: false, error: 'UNKNOWN_ACTION' }
    }

    return command.execute(room, action)
  }



  /**
   * Calculate and apply rewards at end of round (reward phase)
   * Delegated to RewardCalculator service
   */
  private calculateRewards(room: Room): Room {
    return this.rewardCalculator.calculateRewards(room)
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

    if (room.players.length < 5) {
      return { success: false, error: 'NOT_ENOUGH_PLAYERS' }
    }

    if (room.players.length > 10) {
      return { success: false, error: 'TOO_MANY_PLAYERS' }
    }

    // Assign roles
    let playersWithRoles
    try {
      const preferredRoles = room.debugRolePickerEnabled
        ? room.players.reduce<Record<string, Role>>((acc, player) => {
            if (player.userId === room.host) {
              acc[player.userId] = Role.NARRATOR
              return acc
            }
            if (player.debugPreferredRole) acc[player.userId] = player.debugPreferredRole
            return acc
          }, {})
        : {}

      playersWithRoles = this.roleManager.assignRoles(room.players, preferredRoles)
    } catch (error: any) {
      return { success: false, error: 'ROLE_ASSIGNMENT_FAILED', message: error.message }
    }

    // Initialize coins: Yellow = player count, Red = 3, Green = 0
    const playerCount = room.players.length
    playersWithRoles = playersWithRoles.map((p) => ({
      ...p,
      coins: {
        red: 3,
        yellow: playerCount,
        green: 0,
      },
      collectedGreenCoins: 0,
    }))

    // Ensure host is narrator
    const hostIndex = playersWithRoles.findIndex((p) => p.userId === room.host)
    if (hostIndex !== -1) {
      const narratorIndex = playersWithRoles.findIndex((p) => p.isNarrator)
      if (narratorIndex !== -1 && narratorIndex !== hostIndex) {
        // Swap roles
        const hostRole = playersWithRoles[hostIndex].role
        const narratorRole = playersWithRoles[narratorIndex].role

        playersWithRoles[hostIndex].role = narratorRole
        playersWithRoles[hostIndex].originalRole = narratorRole  // update originalRole too
        playersWithRoles[hostIndex].isNarrator = true
        playersWithRoles[hostIndex].isSender = false

        playersWithRoles[narratorIndex].role = hostRole
        playersWithRoles[narratorIndex].originalRole = hostRole  // update originalRole too
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
      redCoinsGiven: {},
      yellowCoinsGiven: {},
      roleCompletions: {},
      responses: {},
      bonusesGiven: { healerBonus: false },
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
        // Hide role unless it's the player themselves, public role, or narrator viewing the round
        role:
          p.userId === playerId ||
          p.isNarrator ||
          p.isSender ||
          isNarrator
            ? p.role
            : undefined,
      })),
    }
  }
}
