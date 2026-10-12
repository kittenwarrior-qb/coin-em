import { useLayoutEffect, useRef } from 'react'
import { motion, useIsPresent } from 'framer-motion'
import { FlipCard } from '@/components/game/FlipCard'
import type { GamePhase, SelectedCards } from '@/stores/types'
import { BoardPreviewModal } from './BoardPreviewModal'
import { previewNavigation, type CardPreviewEntry } from '../selectors/previewNavigation'

export function SelectedCardPreview({ preview, selected, phase, scope, pending, onChange, onClose }: {
  preview: CardPreviewEntry
  selected: SelectedCards
  phase: GamePhase
  scope: string
  pending: boolean
  onChange: (entry: CardPreviewEntry) => void
  onClose: () => void
}) {
  const navigation = previewNavigation(preview, selected, phase)
  const { entries, index, canNavigate, previous, next } = navigation
  const present = useIsPresent()
  const identity = JSON.stringify([scope, preview.card.id, preview.revealed])
  const committed = useRef<{ identity: string; locked: boolean } | null>(null)
  useLayoutEffect(() => {
    committed.current = { identity, locked: pending || !present }
    return () => { committed.current = null }
  }, [identity, pending, present])
  const canInteract = () => committed.current?.identity === identity && !committed.current.locked
  return (
    <BoardPreviewModal label="Xem thẻ đã chọn" pending={pending} onClose={onClose}>
      {locked => <>
        <motion.div
          drag={canNavigate && !locked ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (locked || !canInteract()) return
            if (info.offset.x > 60 && previous) onChange(previous)
            else if (info.offset.x < -60 && next) onChange(next)
          }}
          onClick={event => event.stopPropagation()}
          className="flex items-center gap-4"
        >
          {canNavigate && (
            <button data-ui-chrome="circle" type="button" aria-label="Thẻ trước" disabled={locked || !previous}
              className={['h-9 w-9 rounded-full bg-white/20 font-display text-white flex items-center justify-center', !previous ? 'opacity-20 pointer-events-none' : ''].join(' ')}
              onClick={event => { event.stopPropagation(); if (!locked && canInteract() && previous) onChange(previous) }}>‹</button>
          )}
          <FlipCard key={preview.card.id} frontImage={preview.card.frontImage} backImage={preview.card.backImage}
            altText={preview.card.id} size="large" initialFlipped={!preview.revealed}
            allowFlip={preview.revealed && !locked}
            onClose={locked ? undefined : () => { if (canInteract()) onClose() }} />
          {canNavigate && (
            <button data-ui-chrome="circle" type="button" aria-label="Thẻ sau" disabled={locked || !next}
              className={['h-9 w-9 rounded-full bg-white/20 font-display text-white flex items-center justify-center', !next ? 'opacity-20 pointer-events-none' : ''].join(' ')}
              onClick={event => { event.stopPropagation(); if (!locked && canInteract() && next) onChange(next) }}>›</button>
          )}
        </motion.div>
        {canNavigate && (
          <div aria-hidden="true" className="absolute top-6 flex gap-1.5">
            {entries.map((entry, position) => (
              <div key={entry.card.id} className={['h-1.5 rounded-full transition-all', position === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40'].join(' ')} />
            ))}
          </div>
        )}
      </>}
    </BoardPreviewModal>
  )
}
