import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CartoonButton } from '@/components/cartoon'
import type { CardData } from '@/stores/types'

interface RandomSituationFanProps {
  cards: CardData[]
  selectedCard: CardData | null
  onPick: (card: CardData) => void
  onConfirm: () => void
}

export function RandomSituationFan({ cards, selectedCard, onPick, onConfirm }: RandomSituationFanProps) {
  const [activePosition, setActivePosition] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const cardSpacing = 58

  const wrapPosition = (position: number) => {
    if (!cards.length) return 0
    return ((position % cards.length) + cards.length) % cards.length
  }

  const shortestDiff = (index: number, center: number) => {
    if (!cards.length) return 0
    const raw = index - center
    return ((raw + cards.length / 2) % cards.length + cards.length) % cards.length - cards.length / 2
  }

  const pickCard = (card: CardData, index: number) => {
    setActivePosition(index)
    setDragOffset(0)
    onPick(card)
  }

  const visualCenter = wrapPosition(activePosition - dragOffset / cardSpacing)
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      className="absolute inset-x-0 bottom-4 z-30 mx-auto w-full max-w-[430px] overflow-hidden px-3"
      data-testid="random-situation-fan"
    >
      <div className="rounded-2xl bg-white/75 px-3 py-2 text-center mb-2">
        <div className="font-display text-xs text-[var(--c-gray)]">Chọn một thẻ tình huống</div>
        <div className="font-body text-[11px] text-black/55">Kéo qua lại để xem bộ thẻ úp</div>
      </div>
      <div className="flex h-52 items-center justify-center">
        <AnimatePresence mode="wait">
          {selectedCard && (
            <motion.div
              key={selectedCard.id}
              initial={{ opacity: 0, y: 28, scale: 0.86 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.9 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-44 w-[7.35rem] overflow-hidden rounded-[14px] border border-[var(--c-black)] bg-white shadow-[0_7px_0_rgba(0,0,0,0.2)]" style={{ borderWidth: 1 }}>
                <img src={selectedCard.backImage} alt="" className="h-full w-full object-cover" draggable={false} />
              </div>
              <CartoonButton color="green" size="sm" onClick={onConfirm} data-testid="btn-confirm-situation-card">
                Chọn
              </CartoonButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.div
        className="relative h-64 overflow-hidden pb-2"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDrag={(_, info) => setDragOffset(info.offset.x)}
        onDragEnd={(_, info) => {
          const momentum = clamp(info.velocity.x * 0.08, -cardSpacing * 1.15, cardSpacing * 1.15)
          setActivePosition((current) => wrapPosition(current - (info.offset.x + momentum) / cardSpacing))
          setDragOffset(0)
        }}
        onWheel={(event) => {
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
          if (Math.abs(delta) < 2) return
          setActivePosition((current) => wrapPosition(current + delta / 180))
        }}
      >
        <div className="absolute left-1/2 top-5 h-56 w-0">
          {cards.map((card, index) => {
            const diff = shortestDiff(index, visualCenter)
            const absDiff = Math.abs(diff)
            const selected = selectedCard?.id === card.id
            if (absDiff > 4.25 && !selected) return null
            const x = diff * cardSpacing
            const y = Math.pow(absDiff, 1.45) * 10
            const rotate = Math.max(-10, Math.min(10, diff * 4.1))
            const scale = Math.max(0.9, 1.06 - absDiff * 0.04)
            const opacity = absDiff > 3.55 ? 0.35 : absDiff > 3.15 ? 0.65 : 1
            return (
              <motion.button
                key={card.id}
                type="button"
                initial={false}
                animate={{ opacity, x, y: selected ? y - 2 : y, rotate, scale: selected ? scale + 0.025 : scale }}
                transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.6 }}
                whileTap={{ scale: selected ? scale + 0.015 : scale * 0.985 }}
                onClick={() => pickCard(card, index)}
                className={[
                  'absolute top-0 h-44 w-[7.25rem] origin-bottom overflow-hidden rounded-[14px] border bg-white shadow-[0_6px_0_rgba(0,0,0,0.2)]',
                  selected ? 'border-[var(--c-yellow)]' : 'border-[var(--c-black)]',
                ].join(' ')}
                style={{ zIndex: selected ? 100 : Math.round(30 - absDiff * 5), marginLeft: -58, borderWidth: 1 }}
                data-testid={`random-situation-card-${index + 1}`}
              >
                <img src={card.backImage} alt="" className="h-full w-full object-cover" draggable={false} />
              </motion.button>
            )
          })}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/70 px-2 py-0.5 font-body text-[10px] text-black/50">
          {cards.length ? `${(Math.round(wrapPosition(activePosition)) % cards.length) + 1}/${cards.length}` : '0/0'}
        </div>
      </motion.div>
    </motion.div>
  )
}
