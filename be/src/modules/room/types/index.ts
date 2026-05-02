import { Room } from '../../game/types'

export type { Room }

export interface RoomListItem {
  id: string
  playerCount: number
  hostName: string
}
