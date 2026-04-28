// Game types and constants for EmCoin

export type CardType = 'role' | 'situation' | 'emotion' | 'reflection' | 'selfcare'

export type CoinType = 'red' | 'yellow' | 'green'

export interface Coin {
  type: CoinType
  count: number
}

export interface Card {
  id: string
  type: CardType
  title: string
  content: string
  level?: 1 | 2 | 3 // For situation cards
}

export interface PlayerCoins {
  red: number    // Lòng tốt vô hạn
  yellow: number // Trao yêu thương
  green: number  // Được yêu thương
}

export interface GamePlayer {
  socketId: string
  name: string
  coins: PlayerCoins
  role?: string
  isNTG?: boolean
  isMuted?: boolean
}

export interface ChatMessage {
  id: string
  sender: string
  senderName: string
  message: string
  timestamp: number
}

export interface GameState {
  phase: 'role_selection' | 'story_telling' | 'exploration' | 'self_care' | 'voting' | 'closing'
  currentNTG: string | null
  currentRound: number
  selectedCards: Card[]
  messages: ChatMessage[]
}
