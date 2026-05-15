import type { CardData, GamePhase } from '@/stores/types'

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
  coins: { red: number; yellow: number; green: number }
}

export interface RoomState {
  id: string
  host: string
  players: Array<{
    socketId: string
    userId?: string
    name: string
    role?: string
    isFake?: boolean
    isNarrator?: boolean
    isSender?: boolean
    isMuted?: boolean
    isHealed?: boolean
    isDisconnected?: boolean
    disconnectedAt?: number | null
    avatarIndex?: number
    bgIndex?: number
    coins?: { red: number; yellow: number; green: number }
  }>
  status: string
  phase?: GamePhase
  turn?: number
  currentRound?: number
  totalRounds?: number
  currentNTG?: string | null
  currentNarrator?: string | null
  mutedPlayer?: string | null
  selectedCard?: CardData | null
  gameLog?: GameLogEntry[]
  nightActions?: {
    silenced: boolean
    healed: boolean
    cardSelected: boolean
  }
  settings?: {
    situationGroups: ('light' | 'medium' | 'sensitive')[]
    emotionGroups: ('basic' | 'light' | 'strong' | 'advanced')[]
  }
  resumeExpiresAt?: number | null
  debugRolePickerEnabled?: boolean
}

export interface GameLogEntry {
  type: string
  actorId: string
  targetId?: string
  data?: {
    phase?: GamePhase
    round?: number
    card?: CardData
    message?: string
    bonus?: number
    amount?: number
    coinType?: CoinType | string
    silencerFound?: boolean
  }
  timestamp: number
}

export const COIN_META: Record<CoinType, { label: string; emoji: string; gradient: string }> = {
  red:    { label: 'Lòng tốt',        emoji: '❤️', gradient: 'linear-gradient(135deg,#FF6B6B,#FF4444)' },
  yellow: { label: 'Trao yêu thương', emoji: '💛', gradient: 'linear-gradient(135deg,#FFD93D,#F5CC00)' },
  green:  { label: 'Được yêu thương', emoji: '💚', gradient: 'linear-gradient(135deg,#6BCB77,#53B025)' },
}

export const PASTEL_BG: Record<string, string> = {
  p0: '#FFF0F5', p1: '#F0F5FF', p2: '#F0FFF4',
  p3: '#FFFBF0', p4: '#F5F0FF', p5: '#F0FFFF',
  p6: '#FFF5F0', p7: '#F0FFF8', p8: '#FAFFF0',
}
