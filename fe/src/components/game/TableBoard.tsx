/**
 * TableBoard — cái bàn trải thảm ở giữa game
 * Cards hiển thị ở phần trên, action buttons ở phần dưới bàn
 */
import type { CardData, SelectedCards } from '@/stores/types'
import { CenterBoard } from './CenterBoard'

interface TableBoardProps {
  selectedCards: SelectedCards
  phase?: string
  revealSituation?: boolean
  onCardClick?: (card: CardData, revealed: boolean) => void
  status?: React.ReactNode
  actions?: React.ReactNode
}

export function TableBoard({ selectedCards, phase, revealSituation, onCardClick, status, actions }: TableBoardProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative w-full h-full flex flex-col"
        style={{
          borderRadius: '5px',
          overflow: 'hidden',
          backgroundImage: 'url(/pink_carpet.jpg)',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >

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

        {/* Cards + Actions — centered */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 gap-3 px-3 py-3">
          {status && (
            <div className="w-full">
              {status}
            </div>
          )}
          <div className="flex items-center justify-center overflow-y-auto">
            <CenterBoard selectedCards={selectedCards} phase={phase} revealSituation={revealSituation} onCardClick={onCardClick} />
          </div>
          {actions && (
            <div className="flex flex-col gap-2 w-full">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
