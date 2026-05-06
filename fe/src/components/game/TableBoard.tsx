/**
 * TableBoard — cái bàn trải thảm ở giữa game
 * Cards hiển thị ở phần trên, action buttons ở phần dưới bàn
 */
import type { SelectedCards } from '@/stores/types'
import { CenterBoard } from './CenterBoard'

interface TableBoardProps {
  selectedCards: SelectedCards
  actions?: React.ReactNode
}

export function TableBoard({ selectedCards, actions }: TableBoardProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative w-full h-full flex flex-col"
        style={{
          borderRadius: '5px',
          overflow: 'hidden',
          border: '2px solid rgba(255,182,193,0.6)',
        }}
      >
        {/* Carpet texture */}
        <img
          src="/pink_carpet.jpg"
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Glossy highlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '6%', left: '8%',
            width: '45%', height: '22%',
            background: 'rgba(255,255,255,0.22)',
            borderRadius: '50%',
            transform: 'rotate(-8deg)',
            filter: 'blur(4px)',
          }}
        />

        {/* Cards — top portion */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 overflow-y-auto">
          <CenterBoard selectedCards={selectedCards} />
        </div>

        {/* Action buttons — bottom of table */}
        {actions && (
          <div className="relative z-10 flex flex-col gap-2 px-3 pb-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
