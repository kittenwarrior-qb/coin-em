import type { CardData } from "@/stores/types"
import type { RoomState } from "@/components/game/types"

export interface GameBoardProps {
  roomId: string
  roomState: RoomState
  mySocketId: string
  myUserId: string
  isConnected?: boolean
  leavePending?: boolean
  onLeave: () => Promise<boolean> | void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => Promise<boolean> | void
  nextTurn: (roomId: string) => Promise<boolean> | void
  prevTurn: (roomId: string) => Promise<boolean> | void
  nightAction: (roomId: string, action: string, targetSocketId?: string, cardData?: object) => Promise<boolean> | void
  emitSelectCard: (roomId: string, card: object, type?: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD') => Promise<boolean> | void
  sendResponse: (roomId: string, message: string) => Promise<boolean> | void
  ntgVote: (roomId: string, targetSocketId: string | string[]) => Promise<boolean> | void
  confirmRoleRewards: (roomId: string, targetSocketIds: string[]) => Promise<boolean> | void
  shareReflection: (roomId: string, message: string) => Promise<boolean> | void
  emitCardPreview: (roomId: string, card: CardData | null) => void
  emitSituationFanState: (roomId: string, activePosition: number, cards?: CardData[]) => void
  situationPreviewCard: CardData | null
  situationFanState: { cards: CardData[]; activePosition: number } | null
  submitVote: (roomId: string, suspectSocketId: string) => Promise<boolean> | void
  giveCoin: (roomId: string, receiverSocketId: string, coinType: string, amount?: number) => Promise<boolean>
}
