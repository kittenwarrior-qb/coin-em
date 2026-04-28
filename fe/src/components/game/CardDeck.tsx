import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardType } from '@/types/game'

interface CardDeckProps {
  cards: Card[]
  type: CardType
  onCardSelect?: (card: Card) => void
}

const cardColors: Record<CardType, string> = {
  role: 'bg-purple-200 border-purple-500',
  situation: 'bg-blue-200 border-blue-500',
  emotion: 'bg-pink-200 border-pink-500',
  reflection: 'bg-yellow-200 border-yellow-500',
  selfcare: 'bg-green-200 border-green-500',
}

const cardLabels: Record<CardType, string> = {
  role: 'Vai trò',
  situation: 'Tình huống',
  emotion: 'Cảm xúc',
  reflection: 'Phản tư',
  selfcare: 'Bí kíp tự ôm',
}

export function CardDeck({ cards, type, onCardSelect }: CardDeckProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const colorClass = cardColors[type]
  const label = cardLabels[type]

  const handleExpand = () => {
    setIsExpanded(true)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
  }

  const handleCardClick = (card: Card, index: number) => {
    setSelectedIndex(index)
    if (onCardSelect) {
      onCardSelect(card)
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={handleExpand}
            className={`relative w-16 h-24 rounded-xl border-2 border-black ${colorClass} 
                       shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer`}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
              <div className="text-lg mb-1">🎴</div>
              <div className="text-[10px] font-bold text-center leading-tight">{label}</div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleCollapse}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border-4 border-black p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black">{label}</h3>
                <button
                  onClick={handleCollapse}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center
                           hover:bg-gray-100 active:scale-95 transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {cards.map((card, index) => (
                    <motion.button
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleCardClick(card, index)}
                      className={`p-4 rounded-xl border-3 border-black ${colorClass}
                                 hover:scale-105 transition-transform text-left
                                 ${selectedIndex === index ? 'ring-4 ring-blue-500' : ''}`}
                    >
                      <div className="font-bold text-sm mb-2">{card.title}</div>
                      <div className="text-xs text-gray-700">{card.content}</div>
                      {card.level && (
                        <div className="mt-2 text-xs font-bold">
                          Cấp độ: {card.level}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
