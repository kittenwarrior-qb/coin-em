import { CartoonBadge } from '@/components/cartoon'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'

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
  const themed = useControlTheme() !== 'legacy'
  return (
    <button
      onClick={onSelect}
      className="px-5 py-3 rounded-xl text-left transition-all w-full"
      aria-pressed={selected}
      data-ui-surface={themed ? 'room' : undefined}
      style={themed ? {
        background: selected ? 'linear-gradient(175deg,var(--brand-blush-soft),var(--brand-blush))' : 'linear-gradient(175deg,#F0F9FF,var(--brand-mint-soft))',
        border: `2px solid ${selected ? '#CB87A0' : '#9BC7E3'}`,
        boxShadow: 'inset 0 2px 0 #FFFFFFA0, 0 3px 0 #245F8F18',
      } : selected ? selectedStyle : baseStyle}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-sm" style={{ color: themed ? 'var(--brand-ink)' : '#ff6993' }}>{room.id}</div>
          <div className="font-body text-xs" style={{ color: themed ? 'var(--brand-ink)' : '#1A1A1A', opacity: 0.7 }}>Host: {room.hostName}</div>
        </div>
        <CartoonBadge color={room.playerCount >= 5 ? 'green' : 'blue'}>
          {room.playerCount}/10
        </CartoonBadge>
      </div>
    </button>
  )
}
