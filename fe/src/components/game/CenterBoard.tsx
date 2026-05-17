import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CartoonBadge } from '@/components/cartoon'
import type { CardData, SelectedCards } from '@/stores/types'

interface CenterBoardProps {
  selectedCards: SelectedCards
  phase?: string
  revealSituation?: boolean
  onCardClick?: (card: CardData, revealed: boolean) => void
}

function CardSlot({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0, y: -30 }}
      animate={{ scale: 1, y: 0 }}
      className="flex flex-col items-center gap-1"
    >
      <CartoonBadge color={color as never}>{label}</CartoonBadge>
      {children}
    </motion.div>
  )
}

function CardImg({
  card,
  alt,
  size = 'md',
  faceDown = false,
  revealed = true,
  onClick,
}: {
  card: CardData
  alt: string
  size?: 'sm' | 'md'
  faceDown?: boolean
  revealed?: boolean
  onClick?: () => void
}) {
  const cls = size === 'sm' ? 'w-14' : 'w-20'
  const isFaceDown = faceDown && !revealed
  const [displayRevealed, setDisplayRevealed] = useState(revealed)
  const [flipNonce, setFlipNonce] = useState(0)

  useEffect(() => {
    if (!faceDown) {
      setDisplayRevealed(true)
      return
    }

    setFlipNonce((nonce) => nonce + 1)
    const timer = window.setTimeout(() => setDisplayRevealed(revealed), 180)
    return () => window.clearTimeout(timer)
  }, [faceDown, revealed])

  const imageSrc = faceDown && !displayRevealed ? card.backImage : card.frontImage

  return (
    <motion.button
      type="button"
      className={`${cls} relative aspect-[2/3]`}
      style={{ perspective: 700 }}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.985 } : undefined}
    >
      <motion.div
        key={`${card.id}-${flipNonce}`}
        className="card-cartoon card-cartoon-sm relative h-full w-full overflow-hidden"
        style={{ borderWidth: 1, borderRadius: 14, transformStyle: 'preserve-3d' }}
        initial={false}
        animate={faceDown ? { rotateY: [0, 90, 0] } : { rotateY: 0 }}
        transition={{ duration: 0.36, ease: 'easeInOut' }}
      >
        <div
          className="h-full w-full overflow-hidden rounded-[inherit]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <img src={isFaceDown ? card.backImage : imageSrc} alt={alt} className="h-full w-full object-cover" draggable={false} />
        </div>
      </motion.div>
    </motion.button>
  )
}

export function CenterBoard({ selectedCards, phase, revealSituation = true, onCardClick }: CenterBoardProps) {
  const hasAny = selectedCards.situation || selectedCards.emotion ||
    selectedCards.reflections.length > 0 || selectedCards.selfcare
  const hasChosenCards = selectedCards.situation || selectedCards.emotion
  const sectionCount = [hasChosenCards, selectedCards.reflections.length > 0, Boolean(selectedCards.selfcare)]
    .filter(Boolean).length
  const stackReflectionUnderChosen = phase === 'reflection-card' && hasChosenCards && selectedCards.reflections.length > 0

  if (!hasAny) return null

  return (
    <div className={[
      'relative h-full w-full place-items-center content-center gap-2 overflow-hidden p-2',
      stackReflectionUnderChosen
        ? 'flex flex-col items-center justify-center'
        : `grid ${sectionCount > 1 ? 'grid-cols-2' : 'grid-cols-1'}`,
    ].join(' ')}>
      {hasChosenCards && (
        <CardSlot label="Thẻ được chọn" color="pink">
          <div className="flex items-center justify-center gap-2">
            {selectedCards.situation && (
              <CardImg
                card={selectedCards.situation}
                alt="situation"
                faceDown
                revealed={revealSituation}
                onClick={() => onCardClick?.(selectedCards.situation!, revealSituation)}
              />
            )}
            {selectedCards.emotion && (
              <CardImg card={selectedCards.emotion} alt="emotion" onClick={() => onCardClick?.(selectedCards.emotion!, true)} />
            )}
          </div>
        </CardSlot>
      )}
      {selectedCards.reflections.length > 0 && (
        <CardSlot label="Phản tư" color="blue">
          <div className={`flex justify-center gap-1 ${stackReflectionUnderChosen ? 'flex-row flex-nowrap' : 'max-w-[9rem] flex-wrap'}`}>
            {selectedCards.reflections.map((card, i) => (
              <motion.div key={card.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                <CardImg card={card} alt="reflection" size="sm" onClick={() => onCardClick?.(card, true)} />
              </motion.div>
            ))}
          </div>
        </CardSlot>
      )}
      {selectedCards.selfcare && (
        <CardSlot label="Bí kíp ôm" color="green">
          <CardImg card={selectedCards.selfcare} alt="selfcare" onClick={() => onCardClick?.(selectedCards.selfcare!, true)} />
        </CardSlot>
      )}
    </div>
  )
}
