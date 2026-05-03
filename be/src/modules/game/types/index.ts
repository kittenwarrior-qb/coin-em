// Game Types
export type GamePhase =
  | 'role-reveal'
  | 'night'
  | 'healer-turn'
  | 'silencer-turn'
  | 'situation-card'
  | 'emotion-card'
  | 'story-telling'
  | 'group-response'
  | 'reflection-card'
  | 'reflection-sharing'
  | 'selfcare-card'
  | 'hug-action'
  | 'guess-silencer'
  | 'reveal-silencer'
  | 'give-coins'
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
  originalRole?: Role // Role gốc ban đầu (không thay đổi khi rotate)
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
  collectedGreenCoins?: number // Total green coins collected as Sender across all rounds
}

export interface RoomSettings {
  situationGroups: ('light' | 'medium' | 'sensitive')[] // At least 1 required
  emotionGroups: ('basic' | 'light' | 'strong' | 'advanced')[] // At least 1 required
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
  // Room settings (card groups)
  settings: RoomSettings
  // Phase 1 additions
  votes: Record<string, string> // voterId → targetId (silencer guess)
  ntgVotes: Record<string, string[]> // NTG votes: ntgId → [targetId, ...] (best responders, multiple allowed)
  nightActions: {
    silenced: boolean
    healed: boolean
    cardSelected: boolean
  }
  // Coin giving tracking (flexible amounts)
  redCoinsGiven: Record<string, Record<string, number>> // giverId → { recipientId: amount }
  yellowCoinsGiven: Record<string, Record<string, number>> // giverId → { recipientId: amount }
  
  // Role completion tracking (simplified - only track red coin reception)
  roleCompletions: Record<
    string,
    {
      receivedRedFromGame: boolean // From game system (NTG giving without revealing identity)
      receivedRedFromSilenced: boolean
      receivedRedFromAnyone: boolean
    }
  >
  
  // Response tracking
  responses: Record<string, string> // playerId → response message
  
  // Bonus tracking
  bonusesGiven: {
    healerBonus: boolean
  }
}

export interface GameLogEntry {
  type: string
  actorId: string
  targetId?: string
  data?: any
  timestamp: number
}

export interface GameAction {
  type:
    | 'SILENCE'
    | 'HEAL'
    | 'SELECT_CARD'
    | 'SELECT_SELFCARE_CARD'
    | 'GIVE_COIN'
    | 'VOTE'
    | 'SEND_RESPONSE'
    | 'NTG_VOTE'
    | 'SHARE_REFLECTION'
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
