import { motion } from 'framer-motion'
import { CartoonBadge } from '@/components/cartoon'
import type { SelectedCards } from '@/stores/types'

interface CenterBoardProps {
  selectedCards: SelectedCards
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

function CardImg({ src, alt, size = 'md' }: { src: string; alt: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-14 h-20' : 'w-20 h-28'
  return (
    <div className={`${cls} card-cartoon card-cartoon-sm overflow-hidden`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} />
    </div>
  )
}

export function CenterBoard({ selectedCards }: CenterBoardProps) {
  const hasAny = selectedCards.situation || selectedCards.emotion ||
    selectedCards.reflections.length > 0 || selectedCards.selfcare

  if (!hasAny) return null

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 p-2 overflow-y-auto">
      {selectedCards.situation && (
        <CardSlot label="Tình huống" color="white">
          <CardImg src={selectedCards.situation.frontImage} alt="situation" />
        </CardSlot>
      )}
      {selectedCards.emotion && (
        <CardSlot label="Cảm xúc NTG" color="pink">
          <CardImg src={selectedCards.emotion.frontImage} alt="emotion" />
        </CardSlot>
      )}
      {selectedCards.reflections.length > 0 && (
        <CardSlot label="Phản tư" color="blue">
          <div className="flex gap-1">
            {selectedCards.reflections.map((card, i) => (
              <motion.div key={card.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                <CardImg src={card.frontImage} alt="reflection" size="sm" />
              </motion.div>
            ))}
          </div>
        </CardSlot>
      )}
      {selectedCards.selfcare && (
        <CardSlot label="Bí kíp ôm" color="green">
          <CardImg src={selectedCards.selfcare.frontImage} alt="selfcare" />
        </CardSlot>
      )}
    </div>
  )
}
