// Store Types
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

export type GameStep =
  | 'role-reveal'     // Step 1: Chia vai trò
  | 'night'           // Step 2: Night mode
  | 'day-draw'        // Step 3a: NTG bốc thẻ Tình huống
  | 'day-emotion'     // Step 3b: NTG chọn Cảm xúc
  | 'day-story'       // Step 3c: NTG kể chuyện
  | 'reflection'      // Step 4: Chọn reflection cards
  | 'selfcare'        // Step 5: Bí kíp
  | 'guess-role'      // Step 6: Đoán vai trò
  | 'reward'          // Step 7: Tặng coin

export type CardCategory = 'situation' | 'emotion' | 'reflection' | 'selfcare'
export type EmotionSubType = 'basic' | 'light' | 'strong' | 'advanced'
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
