import { CartoonBadge } from '@/components/cartoon'

export interface RoomListItem {
  id: string
  playerCount: number
  hostName: string
}

interface RoomCardProps {
  room: RoomListItem
  selected: boolean
  onSelect: () => void
}

// Subtle inset gradient: slightly darker tint on edges, lighter center
const baseStyle: React.CSSProperties = {
  background: `
    radial-gradient(ellipse at center, #e3fafc 60%, #b8f0f5 100%)
  `,
}

const selectedStyle: React.CSSProperties = {
  background: `
    radial-gradient(ellipse at center, #fff4e6 60%, #ffd9a0 100%)
  `,
}

export function RoomCard({ room, selected, onSelect }: RoomCardProps) {
  return (
    <button
      onClick={onSelect}
      className="px-5 py-3 rounded-xl text-left transition-all w-full"
      style={selected ? selectedStyle : baseStyle}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-sm" style={{ color: '#ff6993' }}>{room.id}</div>
          <div className="font-body text-xs" style={{ color: '#1A1A1A', opacity: 0.7 }}>Host: {room.hostName}</div>
        </div>
        <CartoonBadge color={room.playerCount >= 5 ? 'green' : 'blue'}>
          {room.playerCount}/10
        </CartoonBadge>
      </div>
    </button>
  )
}
