import { Socket } from 'socket.io-client'
import { TestLogger } from '../../utils/TestLogger'

export interface BotConfig {
  id: string
  name: string
  isFake?: boolean
}

export interface BotState {
  socketId?: string
  role?: string
  isNarrator?: boolean
  isSender?: boolean
  coins?: { red: number; yellow: number; green: number }
  lastActionTime?: number
}

export class BotPlayer {
  public readonly id: string
  public readonly name: string
  public readonly isFake: boolean
  public socket: Socket
  public state: BotState = {}

  private logger: TestLogger
  private eventHandlers: Map<string, Function[]> = new Map()

  constructor(config: BotConfig, socket: Socket, logger: TestLogger) {
    this.id = config.id
    this.name = config.name
    this.isFake = config.isFake || false
    this.socket = socket
    this.logger = logger
  }

  get socketId(): string {
    return this.socket.id ?? ''
  }

  updateState(playerData: any) {
    this.state.role = playerData.role
    this.state.isNarrator = playerData.isNarrator
    this.state.isSender = playerData.isSender
    this.state.coins = playerData.coins
    this.state.socketId = playerData.socketId
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, [])
    this.eventHandlers.get(event)!.push(handler)
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(h => h(...args))
  }

  setupListeners() {
    this.socket.on('connect', () => {
      this.logger.success('BOT', `${this.name} connected (${this.socket.id})`)
      this.emit('connected')
    })

    this.socket.on('disconnect', () => {
      this.logger.warning('BOT', `${this.name} disconnected`)
      this.emit('disconnected')
    })

    this.socket.on('error', (error: any) => {
      this.logger.error('BOT', `${this.name} error: ${error.message || error.error || error}`)
      this.emit('error', error)
    })

    this.socket.on('room_state', (state: any) => {
      const playerData = state.players.find((p: any) => p.userId === this.id)
      if (playerData) this.updateState(playerData)
      this.emit('room_state', state)
    })

    this.socket.on('player_joined', (data: any) => this.emit('player_joined', data))

    this.socket.on('game_started', (state: any) => {
      const playerData = state.players.find((p: any) => p.userId === this.id)
      if (playerData) this.updateState(playerData)
      this.emit('game_started', state)
    })

    this.socket.on('turn_changed', (state: any) => {
      const playerData = state.players.find((p: any) => p.userId === this.id)
      if (playerData) this.updateState(playerData)
      this.emit('turn_changed', state)
    })

    this.socket.on('night_action_completed', (data: any) => this.emit('night_action_completed', data))
    this.socket.on('coin_given', (data: any) => this.emit('coin_given', data))
    this.socket.on('vote_submitted', () => this.emit('vote_submitted'))
    this.socket.on('voting_complete', (data: any) => this.emit('voting_complete', data))
    this.socket.on('response_received', (data: any) => this.emit('response_received', data))
    this.socket.on('ntg_vote_cast', (data: any) => this.emit('ntg_vote_cast', data))
    this.socket.on('reflection_shared', (data: any) => this.emit('reflection_shared', data))

    this.socket.on('game_ended', (data: any) => {
      this.logger.success('BOT', `${this.name} game ended`)
      this.emit('game_ended', data)
    })
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  joinRoom(roomId: string, createIfMissing = false) {
    this.logger.info('BOT', `${this.name} joining room ${roomId}`)
    this.socket.emit('join_room', { name: this.name, roomId, userId: this.id, createIfMissing })
  }

  startGame(roomId: string) {
    this.logger.info('BOT', `${this.name} starting game`)
    this.socket.emit('start_game', { roomId })
  }

  advanceTurn(roomId: string) {
    this.logger.action(this.name, 'advance turn')
    this.socket.emit('next_turn', { roomId })
  }

  nightAction(roomId: string, action: 'heal' | 'silence', targetSocketId: string) {
    this.logger.action(this.name, action, targetSocketId)
    this.socket.emit('night_action', { roomId, action, targetSocketId })
  }

  giveCoin(roomId: string, receiverSocketId: string, coinType: 'red' | 'yellow') {
    this.logger.action(this.name, `give ${coinType}`, receiverSocketId)
    this.socket.emit('give_coin', { roomId, receiverSocketId, coinType })
    this.state.lastActionTime = Date.now()
  }

  submitVote(roomId: string, suspectSocketId: string) {
    this.logger.action(this.name, 'vote', suspectSocketId)
    this.socket.emit('submit_vote', { roomId, suspectSocketId })
  }

  sendResponse(roomId: string, message: string) {
    this.logger.action(this.name, 'send_response', message.slice(0, 30))
    this.socket.emit('send_response', { roomId, message })
  }

  ntgVote(roomId: string, targetSocketId: string) {
    this.logger.action(this.name, 'ntg_vote', targetSocketId)
    this.socket.emit('ntg_vote', { roomId, targetSocketId })
  }

  shareReflection(roomId: string, message: string) {
    this.logger.action(this.name, 'share_reflection', message.slice(0, 30))
    this.socket.emit('share_reflection', { roomId, message })
  }

  disconnect() {
    this.socket.disconnect()
  }

  canPerformAction(cooldownMs = 1000): boolean {
    if (!this.state.lastActionTime) return true
    return Date.now() - this.state.lastActionTime >= cooldownMs
  }
}
