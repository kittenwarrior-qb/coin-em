import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useRef } from 'react'
import { motion, useIsPresent } from 'framer-motion'
import type { CardData } from '@/stores/types'
import type { GameLogEntry } from '@/components/game/types'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { isBrandTheme } from '@/components/cartoon/controlThemes'
import { CartoonCircleButton } from '@/components/cartoon'
import { BookOpen } from 'lucide-react'

interface Props {
  currentRound: number
  logs: readonly { entry: Pick<GameLogEntry, 'timestamp' | 'type'>; item: { title: string; detail: string; card?: CardData } }[]
  pending?: boolean
  onClose: () => void
  onPreview: (card: CardData) => void
}

/** Presentation only: consumes recipient-visible rows, never reconstructs private logs. */
export function HistoryModal({ currentRound, logs, pending, onClose, onPreview }: Props) {
  const branded = isBrandTheme(useControlTheme())
  const dialogRef = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  const locked = pending || !present
  usePopupLifecycle(dialogRef, present, { onClose, persistent: pending })
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[65] flex items-end justify-center bg-black/55 backdrop-blur-sm px-3 pb-4"
      onClick={locked ? undefined : onClose}
    >
      <motion.div
        initial={{ y: 80, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 80, scale: 0.96 }}
        className="flex flex-col w-full max-w-[404px] max-h-[78dvh] overflow-hidden rounded-[28px] border-[3px] border-[var(--c-black)] bg-white shadow-[0_8px_0_rgba(0,0,0,0.22)]"
        onClick={(e) => e.stopPropagation()}
        data-testid="history-log-panel"
        ref={dialogRef} role="dialog" data-ui-panel="a1" aria-label="Nhật ký lượt chơi" tabIndex={-1} aria-busy={pending || undefined}
      >
        <div data-ui-chrome="header" className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-[var(--c-black)] bg-[var(--c-pink)] px-4 py-3">
          <div className="flex items-center gap-2">
            {branded ? <BookOpen size={26} aria-hidden="true" /> : <EmcoinImage src="/emcoin/icons/orbit/book.svg" alt="" className="h-7 w-7 object-contain" draggable={false} />}
            <div>
              <div className="font-display text-sm text-white">Nhật ký lượt chơi</div>
              <div className="font-body text-[11px] text-white/80">Round {currentRound}</div>
            </div>
          </div>
          {branded ? <CartoonCircleButton iconSrc="/emcoin/icons/orbit/close.svg" size="sm" aria-label="Đóng nhật ký" disabled={locked} onClick={locked ? undefined : onClose} /> : <button
            type="button"
            className="font-display text-xl leading-none text-white"
            onClick={locked ? undefined : onClose}
            aria-label="Đóng nhật ký"
            disabled={locked}
          >
            x
          </button>}
        </div>

        <div data-testid="history-log-scroll" className="min-h-0 max-h-[62dvh] overflow-y-auto overscroll-contain scroll-cartoon px-3 py-3">
          {logs.length === 0 ? (
            <div className="rounded-2xl bg-[var(--c-gray-pale)] px-3 py-4 text-center font-body text-xs text-[var(--c-gray)]">
              Chưa có sự kiện nào trong round này.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map(({ entry, item }, index) => {
                return (
                  <div data-ui-chrome="history-entry" key={`${entry.timestamp}-${entry.type}-${index}`} className="rounded-2xl bg-[var(--c-sky-mist)] px-3 py-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-display text-[10px] text-[var(--c-pink)]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[11px] leading-snug text-[var(--c-black)]">{item.title}</div>
                        <div className="font-body text-[11px] leading-snug text-black/60">{item.detail}</div>
                        {item.card && (
                          <button
                            type="button"
                            className="mt-2 h-24 w-16 overflow-hidden rounded-[14px] border-2 border-[var(--c-black)] bg-white shadow-[0_3px_0_rgba(0,0,0,0.18)]"
                            onClick={() => {
                              if (!locked && item.card) onPreview(item.card)
                            }}
                            data-testid={`history-card-${item.card.id}`}
                            disabled={locked}
                          >
                            <EmcoinImage src={item.card.frontImage} alt={item.card.id} className="h-full w-full object-cover" draggable={false} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
