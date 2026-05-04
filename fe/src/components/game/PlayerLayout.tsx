/**
 * PlayerLayout — bố trí player xung quanh bàn theo ảnh minh họa:
 *   - NTG (Quản trò / currentNTG) → top center
 *   - Người trao gửi (isSender)   → bottom center
 *   - Còn lại                     → chia đều 2 bên (left/right), tối đa 4 mỗi bên
 */
import type { Player } from '@/components/game/types'

interface LayoutSlot {
  player: Player | null
  position: 'top' | 'left' | 'right' | 'bottom'
  index: number // for avatar color
}

interface PlayerLayoutProps {
  players: Player[]
  renderPlayer: (slot: LayoutSlot) => React.ReactNode
  renderCenter: () => React.ReactNode
}

function splitSides(arr: Player[]): { left: Player[]; right: Player[] } {
  const left: Player[] = []
  const right: Player[] = []
  arr.forEach((p, i) => {
    if (i % 2 === 0) left.push(p)
    else right.push(p)
  })
  return { left, right }
}

export function PlayerLayout({ players, renderPlayer, renderCenter }: PlayerLayoutProps) {
  const ntg    = players.find(p => p.isNarrator) ?? players[0] ?? null
  const sender = players.find(p => p.isSender) ?? null
  const rest   = players.filter(p => p.id !== ntg?.id && p.id !== sender?.id)
  const { left, right } = splitSides(rest)

  const playerIndex = (p: Player) => players.findIndex(x => x.id === p.id)

  return (
    <div className="flex flex-col w-full h-full">

      {/* Top — NTG */}
      <div className="flex justify-center pb-1">
        {ntg ? renderPlayer({ player: ntg, position: 'top', index: playerIndex(ntg) }) : <div className="w-14 h-14" />}
      </div>

      {/* Middle row: left | center | right */}
      <div className="flex flex-1 items-stretch gap-1 min-h-0">

        {/* Left column */}
        <div className="flex flex-col justify-around items-center w-14 flex-shrink-0">
          {left.map(p => renderPlayer({ player: p, position: 'left', index: playerIndex(p) }))}
        </div>

        {/* Center board */}
        <div className="flex-1 min-w-0">
          {renderCenter()}
        </div>

        {/* Right column */}
        <div className="flex flex-col justify-around items-center w-14 flex-shrink-0">
          {right.map(p => renderPlayer({ player: p, position: 'right', index: playerIndex(p) }))}
        </div>
      </div>

      {/* Bottom — Sender */}
      <div className="flex justify-center pt-1">
        {sender ? renderPlayer({ player: sender, position: 'bottom', index: playerIndex(sender) }) : <div className="w-14 h-14" />}
      </div>
    </div>
  )
}
