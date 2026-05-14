import { motion } from 'framer-motion'
import { CartoonBadge } from '@/components/cartoon'
import type { CardData, SelectedCards } from '@/stores/types'

interface CenterBoardProps {
  selectedCards: SelectedCards
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

  return (
    <motion.button
      type="button"
      className={`${cls} relative aspect-[2/3]`}
      style={{ perspective: 700 }}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.985 } : undefined}
    >
      <motion.div
        className="card-cartoon card-cartoon-sm relative h-full w-full overflow-hidden"
        style={{ transformStyle: 'preserve-3d', borderWidth: 1, borderRadius: 14 }}
        initial={{ rotateY: isFaceDown ? 180 : 0 }}
        animate={{ rotateY: isFaceDown ? 180 : 0 }}
        transition={{ duration: 0.75, ease: 'easeInOut' }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <img src={card.frontImage} alt={alt} className="h-full w-full object-cover" draggable={false} />
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-[inherit]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <img src={card.backImage} alt={alt} className="h-full w-full object-cover" draggable={false} />
        </div>
      </motion.div>
    </motion.button>
  )
}

export function CenterBoard({ selectedCards, revealSituation = true, onCardClick }: CenterBoardProps) {
  const hasAny = selectedCards.situation || selectedCards.emotion ||
    selectedCards.reflections.length > 0 || selectedCards.selfcare

  if (!hasAny) return null

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 p-2 overflow-y-auto">
      {selectedCards.situation && (
        <CardSlot label="Tinh huong" color="white">
          <CardImg
            card={selectedCards.situation}
            alt="situation"
            faceDown
            revealed={revealSituation}
            onClick={() => onCardClick?.(selectedCards.situation!, revealSituation)}
          />
        </CardSlot>
      )}
      {selectedCards.emotion && (
        <CardSlot label="Cam xuc NTG" color="pink">
          <CardImg card={selectedCards.emotion} alt="emotion" onClick={() => onCardClick?.(selectedCards.emotion!, true)} />
        </CardSlot>
      )}
      {selectedCards.reflections.length > 0 && (
        <CardSlot label="Phan tu" color="blue">
          <div className="flex gap-1">
            {selectedCards.reflections.map((card, i) => (
              <motion.div key={card.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                <CardImg card={card} alt="reflection" size="sm" onClick={() => onCardClick?.(card, true)} />
              </motion.div>
            ))}
          </div>
        </CardSlot>
      )}
      {selectedCards.selfcare && (
        <CardSlot label="Bi kip om" color="green">
          <CardImg card={selectedCards.selfcare} alt="selfcare" onClick={() => onCardClick?.(selectedCards.selfcare!, true)} />
        </CardSlot>
      )}
    </div>
  )
}
