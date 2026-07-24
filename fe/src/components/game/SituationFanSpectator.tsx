import { motion } from 'framer-motion'
import type { CardData } from '@/stores/types'

interface SituationFanSpectatorProps {
  cards: CardData[]
  activePosition: number
}

export function SituationFanSpectator({ cards, activePosition }: SituationFanSpectatorProps) {
  if (!cards.length) return null

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

  const visualCenter = wrapPosition(activePosition)
  const focusedIndex = Math.round(visualCenter) % cards.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      className="absolute inset-x-0 bottom-4 z-30 mx-auto w-full max-w-[430px] overflow-hidden px-3 pointer-events-none"
    >
      {/* Header */}
      <div className="rounded-2xl bg-black/35 px-3 py-2 text-center mb-2 backdrop-blur-[3px]">
        <div className="font-display text-xs text-white/85">👀 Người Trao Gửi đang chọn thẻ...</div>
      </div>

      {/* Fan */}
      <div className="relative h-64 overflow-hidden pb-2">
        <div className="absolute left-1/2 top-5 h-56 w-0">
          {cards.map((card, index) => {
            const diff = shortestDiff(index, visualCenter)
            const absDiff = Math.abs(diff)
            if (absDiff > 4.25) return null
            const x = diff * cardSpacing
            const y = Math.pow(absDiff, 1.45) * 10
            const rotate = Math.max(-10, Math.min(10, diff * 4.1))
            const scale = Math.max(0.9, 1.06 - absDiff * 0.04)
            const opacity = absDiff > 3.55 ? 0.3 : absDiff > 3.15 ? 0.6 : 1
            const isFocused = index === focusedIndex

            return (
              <motion.div
                key={card.id}
                initial={false}
                animate={{
                  opacity,
                  x,
                  y: isFocused ? y - 4 : y,
                  rotate,
                  scale: isFocused ? scale + 0.025 : scale,
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.7 }}
                className={[
                  'absolute top-0 h-44 w-[7.25rem] origin-bottom overflow-hidden rounded-[14px] border bg-white shadow-[0_6px_0_rgba(0,0,0,0.2)]',
                  isFocused ? 'border-[var(--c-yellow)]' : 'border-[var(--c-black)]',
                ].join(' ')}
                style={{
                  zIndex: isFocused ? 100 : Math.round(30 - absDiff * 5),
                  marginLeft: -58,
                  borderWidth: 1,
                }}
              >
                <img src={card.backImage} alt="" className="h-full w-full object-cover" draggable={false} />
                {isFocused && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-[inherit] border-2 border-[var(--c-yellow)]"
                    style={{ background: 'rgba(255,200,0,0.08)' }}
                  />
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Position counter */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/60 px-2 py-0.5 font-body text-[10px] text-black/50">
          {focusedIndex + 1}/{cards.length}
        </div>
      </div>
    </motion.div>
  )
}
