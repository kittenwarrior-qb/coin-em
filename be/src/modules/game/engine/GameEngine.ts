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

    updatedRoom = this.undoRollbackCoinEffects(updatedRoom, room.phase, previousPhase)

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
        updatedRoom.ntgVotes = {}
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

  private undoRollbackCoinEffects(room: Room, currentPhase: string, previousPhase: string): Room {
    const actionTypes = new Set<string>()
    const addPhaseTypes = (phase: string) => {
      if (phase === 'group-response') actionTypes.add('NTG_VOTE')
      if (phase === 'reflection-sharing') actionTypes.add('SHARE_REFLECTION')
      if (phase === 'give-coins') actionTypes.add('GIVE_COIN')
      if (phase === 'reward') actionTypes.add('REWARDS_CALCULATED')
    }

    addPhaseTypes(currentPhase)
    addPhaseTypes(previousPhase)
    if (actionTypes.size === 0) return room

    const roundStartIndex = room.gameLog.reduce(
      (latest, entry, index) => entry.type === 'ROUND_STARTED' && entry.data?.round === room.currentRound ? index : latest,
      -1,
    )
    const firstRoundLog = roundStartIndex >= 0 ? roundStartIndex : 0
    const logsToUndo = room.gameLog
      .slice(firstRoundLog)
      .filter((entry) => actionTypes.has(entry.type))

    if (logsToUndo.length === 0) return room

    let players = room.players
    let redCoinsGiven = { ...room.redCoinsGiven }
    let yellowCoinsGiven = { ...room.yellowCoinsGiven }
    let ntgVotes: Record<string, string[]> = { ...room.ntgVotes }

    const adjustCoins = (userId: string | undefined, delta: Partial<Record<'red' | 'yellow' | 'green', number>>) => {
      if (!userId) return
      players = players.map((player) => {
        if (player.userId !== userId) return player
        return {
          ...player,
          coins: {
            red: Math.max(0, player.coins.red + (delta.red ?? 0)),
            yellow: Math.max(0, player.coins.yellow + (delta.yellow ?? 0)),
            green: Math.max(0, player.coins.green + (delta.green ?? 0)),
          },
        }
      })
    }

    const subtractTrackedCoin = (
      tracker: Record<string, Record<string, number>>,
      actorId: string,
      targetId: string | undefined,
      amount: number,
    ) => {
      if (!targetId || !tracker[actorId]?.[targetId]) return tracker
      const next = { ...tracker, [actorId]: { ...tracker[actorId] } }
      next[actorId][targetId] = Math.max(0, next[actorId][targetId] - amount)
      if (next[actorId][targetId] === 0) delete next[actorId][targetId]
      if (Object.keys(next[actorId]).length === 0) delete next[actorId]
      return next
    }

    for (const entry of [...logsToUndo].reverse()) {
      if (entry.type === 'NTG_VOTE') {
        const bonus = entry.data?.bonus ?? 5
        adjustCoins(entry.targetId, { yellow: -bonus })
        const existing = ntgVotes[entry.actorId] ?? []
        ntgVotes = {
          ...ntgVotes,
          [entry.actorId]: existing.filter((id) => id !== entry.targetId),
        }
        if (ntgVotes[entry.actorId].length === 0) delete ntgVotes[entry.actorId]
      }

      if (entry.type === 'SHARE_REFLECTION') {
        adjustCoins(entry.actorId, { yellow: -(entry.data?.bonus ?? 5) })
      }

      if (entry.type === 'GIVE_COIN') {
        const coinType = entry.data?.coinType as 'red' | 'yellow' | undefined
        const amount = entry.data?.amount ?? 1
        const greenAmount = entry.data?.receiverGainsGreen ?? amount
        if (coinType === 'red' || coinType === 'yellow') {
          adjustCoins(entry.actorId, { [coinType]: amount })
          adjustCoins(entry.targetId, { green: -greenAmount })
          if (coinType === 'red') redCoinsGiven = subtractTrackedCoin(redCoinsGiven, entry.actorId, entry.targetId, amount)
          if (coinType === 'yellow') yellowCoinsGiven = subtractTrackedCoin(yellowCoinsGiven, entry.actorId, entry.targetId, amount)
        }
      }

      if (entry.type === 'REWARDS_CALCULATED') {
        const silencer = players.find((player) => player.originalRole === Role.SILENCER)
        const ntg = players.find((player) => player.isSender)
        const mutedUserId = entry.data?.mutedPlayerId ?? room.mutedPlayer
        const silencerFound = Boolean(entry.data?.silencerFound)
        const ntgGreenBonus = entry.data?.ntgGreenBonus ?? (silencerFound ? room.players.length : Math.max(0, room.players.length - 3))
        const ntgVotedIds = new Set<string>(Object.values(ntgVotes ?? {}).flat())

        for (const player of players) {
          const isMuted = player.userId === mutedUserId
          const wasNtgVoted = ntgVotedIds.has(player.userId)
          let yellowBonus = 0

          if ((player.originalRole === Role.CONNECTOR || player.originalRole === Role.OPENER) && !isMuted && room.responses?.[player.userId] && !wasNtgVoted) {
            yellowBonus += 2
          }
          if (player.originalRole === Role.GUIDE && !isMuted && room.nightActions?.cardSelected && room.responses?.[player.userId] && !wasNtgVoted) {
            yellowBonus += 2
          }
          if (player.userId === silencer?.userId) {
            yellowBonus += silencerFound ? 2 : 7
          }

          if (yellowBonus > 0) adjustCoins(player.userId, { yellow: -yellowBonus })
        }

        adjustCoins(ntg?.userId, { green: -ntgGreenBonus })
      }
    }

    return {
      ...room,
      players,
      ntgVotes,
      redCoinsGiven,
      yellowCoinsGiven,
      gameLog: room.gameLog.filter((entry, index) => index < firstRoundLog || !actionTypes.has(entry.type)),
    }
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
