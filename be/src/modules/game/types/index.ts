// Game Types
export type GamePhase =
  | 'role-reveal'
  | 'night'
  | 'day-draw'
  | 'day-emotion'
  | 'day-story'
  | 'reflection'
  | 'selfcare'
  | 'guess-role'
  | 'reward'
  | 'ended'
export type GameStatus = 'waiting' | 'playing' | 'ended'

export enum Role {
  NARRATOR = 'Người Quản trò',
  SENDER = 'Người Trao Gửi',
  SILENCER = 'Người Im Lặng',
  CONNECTOR = 'Người Kết Nối',
  OPENER = 'Người Gợi Mở',
  GUIDE = 'Người Dẫn Lối',
  HEALER = 'Người Chữa Lành',
}

export interface Player {
  socketId: string
  userId: string
  name: string
  role?: Role
  isNarrator?: boolean
  isSender?: boolean
  isMuted?: boolean
  isHealed?: boolean
  isFake?: boolean
  coins: {
    red: number
    yellow: number
    green: number
  }
}

export interface Room {
  id: string
  host: string // userId
  players: Player[]
  status: GameStatus
  phase: GamePhase
  turn: number
  currentRound: number
  totalRounds: number
  currentNTG: string | null // userId
  currentNarrator: string | null // userId
  mutedPlayer: string | null // userId
  healedPlayer: string | null // userId
  selectedCard: any | null
  gameLog: GameLogEntry[]
  lastActivity: number
  // Phase 1 additions
  votes: Record<string, string> // voterId → targetId
  nightActions: {
    silenced: boolean
    healed: boolean
    cardSelected: boolean
  }
  coinsGiven: Record<string, Record<string, { red: number; yellow: number; green: number }>>
  // coinsGiven[giverId][receiverId] = { red: 1, yellow: 0, green: 0 }
}

export interface GameLogEntry {
  type: string
  actorId: string
  targetId?: string
  data?: any
  timestamp: number
}

export interface GameAction {
  type: 'SILENCE' | 'HEAL' | 'SELECT_CARD' | 'SELECT_SELFCARE_CARD' | 'GIVE_COIN' | 'VOTE'
  actorId: string
  targetId?: string
  data?: any
}

export interface GameResult {
  success: boolean
  room?: Room
  error?: string
  message?: string
  autoAdvance?: boolean // For voting auto-advance
}
