// ─── Phase types — mirror backend TurnManager exactly ─────────────────────────
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

// GameStep = alias for GamePhase (used in store/UI)
export type GameStep = GamePhase

export type GameStatus = 'waiting' | 'playing' | 'ended'

export type CardCategory = 'situation' | 'emotion' | 'reflection' | 'selfcare' | 'role'
export type EmotionSubType = 'basic' | 'light' | 'strong' | 'advanced'
export type SituationSubType = 'light' | 'medium' | 'sensitive'
export type CoinType = 'red' | 'yellow' | 'green'

export interface Player {
  id: string
  name: string
  role: string
  isMe: boolean
  isNarrator?: boolean
  isSender?: boolean
  isMuted?: boolean
  isHealed?: boolean
  isDisconnected?: boolean
  disconnectedAt?: number | null
  avatarIndex?: number
  bgIndex?: number
  coins: {
    red: number
    yellow: number
    green: number
  }
}

export interface CardData {
  id: string
  frontImage: string
  backImage: string
  category: CardCategory
  subType?: EmotionSubType
}

export interface SelectedCards {
  situation?: CardData
  emotion?: CardData
  reflections: CardData[]
  selfcare?: CardData
}

export interface RoomState {
  id: string
  host: string
  players: Player[]
  status: GameStatus
  phase?: GamePhase
  turn?: number
  currentRound?: number
  totalRounds?: number
  currentNTG?: string | null
  currentNarrator?: string | null
  mutedPlayer?: string | null
}

// ─── Phase grouping helpers ────────────────────────────────────────────────────

/** Night sub-phases where silencer/healer act */
export const NIGHT_PHASES: GamePhase[] = ['night', 'healer-turn', 'silencer-turn']

/** Day phases where NTG (sender) acts */
export const SENDER_PHASES: GamePhase[] = [
  'situation-card',
  'emotion-card',
  'story-telling',
  'group-response',
  'reflection-card',
  'reflection-sharing',
  'selfcare-card',
  'hug-action',
]

/** Phase display labels in Vietnamese - Kid-friendly version (no emoji) */
export const PHASE_LABELS: Record<GamePhase, string> = {
  'role-reveal':       'Nhận vai trò',
  'night':             'Trời tối rồi',
  'healer-turn':       'Lượt của Người Chữa Lành',
  'silencer-turn':     'Lượt của Người Im Lặng',
  'situation-card':    'Lượt của Người trao gửi Chọn thẻ Tình huống',
  'emotion-card':      'Lượt của Người trao gửi Chọn thẻ Cảm xúc',
  'story-telling':     'Lượt của Người trao gửi Kể chuyện',
  'group-response':    'Mọi người phản hồi',
  'reflection-card':   'Lượt của Người trao gửi Chọn thẻ Phản tư',
  'reflection-sharing':'Lượt của Người trao gửi Chia sẻ suy nghĩ',
  'selfcare-card':     'Lượt của Người trao gửi Chọn Bí kíp ôm',
  'hug-action':        'Hành động ôm',
  'guess-silencer':    'Đoán ai là Người Im Lặng',
  'reveal-silencer':   'Công bố Vai trò của người chơi',
  'give-coins':        'Tặng coin cho nhau',
  'reward':            'Kết thúc lượt',
  'ended':             'Kết thúc trò chơi',
}
