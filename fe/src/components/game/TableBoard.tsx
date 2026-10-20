/**
 * TableBoard — cái bàn trải thảm ở giữa game
 * Cards hiển thị ở phần trên, action buttons ở phần dưới bàn
 */
import type { CardData, SelectedCards } from '@/stores/types'
import { CenterBoard } from './CenterBoard'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { A_DECOR, isBrandTheme } from '@/components/cartoon/controlThemes'

interface TableBoardProps {
  selectedCards: SelectedCards
  phase?: string
  revealSituation?: boolean
  previewSituationCard?: CardData | null
  onCardClick?: (card: CardData, revealed: boolean) => void
  status?: React.ReactNode
  actions?: React.ReactNode
}

export function TableBoard({ selectedCards, phase, revealSituation, previewSituationCard, onCardClick, status, actions }: TableBoardProps) {
  const theme = useControlTheme()
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="game-table-surface relative w-full h-full flex flex-col"
        data-surface-theme={theme}
        style={{
          borderRadius: theme === 'mint-blush' ? '24px' : '5px',
          overflow: 'hidden',
          backgroundImage: isBrandTheme(theme) ? 'none' : theme === 'mint-blush' ? `url(${A_DECOR.table})` : 'url(/pink_carpet.webp)',
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
        <div className="game-table-content relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 gap-3 px-4 py-5">
          {status && (
            <div className="w-full">
              {status}
            </div>
          )}
          <div data-ui-chrome="table-card-area" className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
            <CenterBoard selectedCards={selectedCards} phase={phase} revealSituation={revealSituation} previewSituationCard={previewSituationCard} onCardClick={onCardClick} />
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
