import { io as ioClient } from 'socket.io-client'
import { BotPlayer, BotConfig } from './BotPlayer'
import { TestLogger } from '../../utils/TestLogger'
import { GamePhase } from '../../../src/modules/game/types'

export interface OrchestratorConfig {
  serverUrl: string
  roomId: string
  botCount: number
  logger?: TestLogger
  situationGroups?: string[]
  emotionGroups?: string[]
}

export type PhaseHandler = (bots: BotPlayer[], roomState: any) => Promise<void>

export class BotOrchestrator {
  private config: OrchestratorConfig
  private logger: TestLogger
  private bots: BotPlayer[] = []
  private phaseHandlers: Map<GamePhase, PhaseHandler> = new Map()

  private currentPhase: GamePhase = 'role-reveal'
  private currentRound = 1
  private totalRounds = 0
  private gameStarted = false

  // Mutex: only one phase handler runs at a time
  private handlerRunning = false
  private pendingPhase: { phase: GamePhase; state: any } | null = null

  constructor(config: OrchestratorConfig) {
    this.config = config
    this.logger = config.logger || new TestLogger()
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async initializeBots(): Promise<void> {
    this.logger.info('ORCHESTRATOR', `Initializing ${this.config.botCount} bots`)

    for (let i = 0; i < this.config.botCount; i++) {
      const socket = ioClient(this.config.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
      })
      const bot = new BotPlayer({ id: `bot-${i + 1}`, name: `Bot ${i + 1}` }, socket, this.logger)
      bot.setupListeners()
      this.setupBotHandlers(bot, i === 0)
      this.bots.push(bot)

      // Small stagger so sockets don't all connect simultaneously
      if (i < this.config.botCount - 1) {
        await new Promise(r => setTimeout(r, 80))
      }
    }

    this.logger.success('ORCHESTRATOR', `All ${this.config.botCount} bots initialized`)
  }

  async start(): Promise<void> {
    this.logger.info('ORCHESTRATOR', 'Starting bot orchestration')
    for (let i = 0; i < this.bots.length; i++) {
      this.bots[i].joinRoom(this.config.roomId, i === 0)
      await new Promise(r => setTimeout(r, 80))
    }
    this.logger.success('ORCHESTRATOR', 'All bots joined room')
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  private setupBotHandlers(bot: BotPlayer, isHost: boolean) {
    let hasStartedGame = false

    bot.on('room_state', (state: any) => {
      if (isHost && !hasStartedGame && state.players.length === this.config.botCount && state.status === 'waiting') {
        hasStartedGame = true
        this.logger.info('ORCHESTRATOR', `All ${state.players.length} players joined`)

        const situationGroups = this.config.situationGroups ?? ['light', 'medium', 'sensitive']
        const emotionGroups = this.config.emotionGroups ?? ['basic', 'light', 'strong', 'advanced']

        this.logger.info('ORCHESTRATOR', `Applying settings — situation: [${situationGroups.join(', ')}] | emotion: [${emotionGroups.join(', ')}]`)
        bot.updateRoomSettings(this.config.roomId, { situationGroups, emotionGroups })
        // startGame is called after room_settings_updated is confirmed (see handler below)
      }
    })

    bot.on('room_settings_updated', (_settings: any) => {
      if (isHost && hasStartedGame) {
        this.logger.info('ORCHESTRATOR', `Settings confirmed — starting game`)
        bot.startGame(this.config.roomId)
      }
    })

    bot.on('player_joined', () => {
      if (isHost && !hasStartedGame) {
        bot.socket.emit('get_room_state', { roomId: this.config.roomId })
      }
    })

    // Only the host bot drives phase scheduling — all others just update their own state
    if (isHost) {
      bot.on('game_started', (state: any) => {
        if (this.gameStarted) return
        this.gameStarted = true
        this.currentPhase = state.phase
        this.currentRound = state.currentRound
        this.totalRounds = state.totalRounds
        this.logger.success('ORCHESTRATOR', `Game started — Phase: ${state.phase}, Round: ${state.currentRound}/${state.totalRounds}`)
        this.updateAllBots(state)
        this.schedulePhase(state.phase, state)
      })

      bot.on('turn_changed', (state: any) => {
        if (state.phase === this.currentPhase && state.currentRound === this.currentRound) return
        this.logger.phase(state.phase, state.currentRound, state.totalRounds)
        this.currentPhase = state.phase
        this.currentRound = state.currentRound
        this.totalRounds = state.totalRounds
        this.updateAllBots(state)
        this.schedulePhase(state.phase, state)
      })
    } else {
      // Non-host bots: update their own state on turn_changed but don't schedule phases
      bot.on('game_started', (state: any) => {
        const playerData = state.players.find((p: any) => p.userId === bot.id)
        if (playerData) bot.updateState(playerData)
      })

      bot.on('turn_changed', (state: any) => {
        const playerData = state.players.find((p: any) => p.userId === bot.id)
        if (playerData) bot.updateState(playerData)
      })
    }

    bot.on('game_ended', (data: any) => {
      if (!isHost || !this.gameStarted) return
      this.gameStarted = false
      this.logger.success('ORCHESTRATOR', '🎉 GAME ENDED')
      if (data.coinSummary) {
        this.logger.info('ORCHESTRATOR', 'COIN SUMMARY:')
        data.coinSummary.forEach((p: any) => {
          this.logger.info('ORCHESTRATOR', `  ${p.name}: ❤️${p.coins.red} 💛${p.coins.yellow} 💚${p.coins.green}`)
        })
      }
      this.cleanup()
    })
  }

  // ── Phase scheduling — mutex prevents concurrent handlers ─────────────────

  private schedulePhase(phase: GamePhase, state: any) {
    if (this.handlerRunning) {
      // Queue the latest phase; previous pending is discarded (server is source of truth)
      this.pendingPhase = { phase, state }
      return
    }
    // Update currentPhase immediately so duplicate turn_changed events are deduped
    this.currentPhase = phase
    this.runPhase(phase, state)
  }

  private async runPhase(phase: GamePhase, state: any) {
    this.handlerRunning = true
    this.pendingPhase = null

    const handler = this.phaseHandlers.get(phase)
    try {
      if (handler) {
        await handler(this.bots, state)
      } else {
        // Default: narrator advances immediately
        this.getNarrator()?.advanceTurn(this.config.roomId)
      }
    } catch (err: any) {
      this.logger.error('ORCHESTRATOR', `Phase handler error [${phase}]: ${err.message}`)
    }

    this.handlerRunning = false

    // If a new phase arrived while we were running, handle it now
    if (this.pendingPhase) {
      const next: { phase: GamePhase; state: any } = this.pendingPhase
      this.pendingPhase = null
      this.runPhase(next.phase, next.state)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private updateAllBots(state: any) {
    state.players.forEach((p: any) => {
      const bot = this.bots.find(b => b.id === p.userId)
      if (bot) bot.updateState(p)
    })
  }

  registerPhaseHandler(phase: GamePhase, handler: PhaseHandler) {
    this.phaseHandlers.set(phase, handler)
  }

  /** Returns true if the room is still in the expected phase (handler not stale) */
  isCurrentPhase(phase: GamePhase): boolean {
    return this.currentPhase === phase
  }

  cleanup() {
    setTimeout(() => {
      this.bots.forEach(b => b.disconnect())
      process.exit(0)
    }, 500)
  }

  getBots(): BotPlayer[] { return this.bots }
  getNarrator(): BotPlayer | undefined { return this.bots.find(b => b.state.isNarrator) }
  getSender(): BotPlayer | undefined { return this.bots.find(b => b.state.isSender) }

  getRandomBot(exclude?: BotPlayer[]): BotPlayer {
    const ids = exclude?.map(b => b.id) ?? []
    const pool = this.bots.filter(b => !ids.includes(b.id))
    return pool[Math.floor(Math.random() * pool.length)]
  }
}
