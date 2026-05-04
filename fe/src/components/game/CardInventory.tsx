import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CartoonButton, CartoonCircleButton } from '@/components/cartoon'
import { FlipCard } from './FlipCard'
import type { CardData, CardCategory, EmotionSubType } from '@/stores/types'

// ─── Card data builder (module-level singleton) ───────────────────────────────
import { CARD_IMAGES } from '@/constants/cardImages'

function buildCards() {
  const make = (key: string, url: string, cat: CardCategory, back: string) =>
    ({ id: `${cat}-${key}`, frontImage: url, backImage: back, category: cat } as CardData)

  const situation  = Object.entries(CARD_IMAGES.situation).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'situation', CARD_IMAGES.situation.back))
  const reflection = Object.entries(CARD_IMAGES.reflection).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'reflection', CARD_IMAGES.reflection.back))
  const selfcare   = Object.entries(CARD_IMAGES.selfcare).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'selfcare', CARD_IMAGES.selfcare.back))

  const emotionBasic    = Object.entries(CARD_IMAGES.emotionBasic).map(([k, imgs]) => ({ id: `emotion-basic-${k}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'basic' as EmotionSubType }))
  const emotionLight    = CARD_IMAGES.emotionLight.map((imgs, i) => ({ id: `emotion-light-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'light' as EmotionSubType }))
  const emotionStrong   = CARD_IMAGES.emotionStrong.map((imgs, i) => ({ id: `emotion-strong-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'strong' as EmotionSubType }))
  const emotionAdvanced = CARD_IMAGES.emotionAdvanced.map((imgs, i) => ({ id: `emotion-advanced-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'advanced' as EmotionSubType }))

  return {
    situation, reflection, selfcare,
    emotion: [...emotionBasic, ...emotionLight, ...emotionStrong, ...emotionAdvanced],
    emotionsByType: { basic: emotionBasic, light: emotionLight, strong: emotionStrong, advanced: emotionAdvanced },
  }
}

export const CARD_DATA = buildCards()

// ─── Component ────────────────────────────────────────────────────────────────

const TABS: { key: CardCategory; label: string; emoji: string }[] = [
  { key: 'situation',  label: 'Tình huống', emoji: '📋' },
  { key: 'emotion',    label: 'Cảm xúc',    emoji: '💭' },
  { key: 'reflection', label: 'Phản tư',    emoji: '🤔' },
  { key: 'selfcare',   label: 'Bí kíp',     emoji: '🌟' },
]

const EMOTION_TABS: { key: EmotionSubType; label: string }[] = [
  { key: 'basic',    label: 'Cơ bản' },
  { key: 'light',    label: 'Nhẹ' },
  { key: 'strong',   label: 'Mạnh' },
  { key: 'advanced', label: 'Nâng cao' },
]

interface CardInventoryProps {
  onClose: () => void
  onSelectCard?: (card: CardData) => void
  allowedCategory?: CardCategory
  showConfirmButton?: boolean
}

export function CardInventory({ onClose, onSelectCard, allowedCategory, showConfirmButton = false }: CardInventoryProps) {
  const [activeTab, setActiveTab]       = useState<CardCategory>(allowedCategory ?? 'situation')
  const [emotionSub, setEmotionSub]     = useState<EmotionSubType>('basic')
  const [preview, setPreview]           = useState<CardData | null>(null)
  const [confirmed, setConfirmed]       = useState<CardData | null>(null)

  const cards = activeTab === 'emotion' ? CARD_DATA.emotionsByType[emotionSub] : CARD_DATA[activeTab as 'situation' | 'reflection' | 'selfcare']

  const handleCardClick = (card: CardData) => {
    if (showConfirmButton) setConfirmed(card)
    else setPreview(card)
  }

  const handleConfirm = () => {
    if (confirmed && onSelectCard) { onSelectCard(confirmed); onClose() }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="modal-cartoon w-[90vw] max-w-md max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="modal-header-cartoon">
          <span>🎴 Túi thẻ bài</span>
          <CartoonCircleButton color="gray" size="sm" onClick={onClose} aria-label="Đóng">✕</CartoonCircleButton>
        </div>

        {/* Category tabs */}
        {!allowedCategory && (
          <div className="flex border-b-[3px] border-[var(--c-black)] bg-[var(--c-gray-pale)]">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={[
                  'flex-1 py-2 font-display text-xs transition-colors',
                  activeTab === t.key
                    ? 'bg-white border-b-4 border-[var(--c-blue-mid)] text-[var(--c-black)]'
                    : 'text-[var(--c-gray)] hover:text-[var(--c-black)]',
                ].join(' ')}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Emotion sub-tabs */}
        {activeTab === 'emotion' && (
          <div className="flex border-b border-[var(--c-gray-pale)] bg-[var(--c-sky-mist)] px-2">
            {EMOTION_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setEmotionSub(t.key)}
                className={[
                  'flex-1 py-1.5 font-display text-[10px] transition-colors',
                  emotionSub === t.key
                    ? 'text-[var(--c-blue-mid)] border-b-2 border-[var(--c-blue-mid)]'
                    : 'text-[var(--c-gray)] hover:text-[var(--c-black)]',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto scroll-cartoon p-3">
          <div className="grid grid-cols-4 gap-2">
            {cards.map(card => (
              <motion.button
                key={card.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCardClick(card)}
                className={[
                  'aspect-[2/3] rounded-xl border-[3px] overflow-hidden',
                  confirmed?.id === card.id
                    ? 'border-[var(--c-blue-mid)] shadow-cartoon'
                    : 'border-[var(--c-black)] shadow-cartoon-sm',
                ].join(' ')}
              >
                <img src={card.backImage} alt={card.id} className="w-full h-full object-cover" draggable={false} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t-[3px] border-[var(--c-black)] bg-[var(--c-gray-pale)] flex items-center justify-between">
          <span className="font-body text-[10px] text-[var(--c-gray)]">{cards.length} thẻ</span>
          {showConfirmButton && confirmed && (
            <CartoonButton color="green" size="sm" onClick={handleConfirm}>✓ Chọn thẻ này</CartoonButton>
          )}
        </div>
      </motion.div>

      {/* Preview overlay */}
      <AnimatePresence>
        {preview && !showConfirmButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={e => { e.stopPropagation(); setPreview(null) }}
          >
            <FlipCard
              frontImage={preview.backImage}
              backImage={preview.frontImage}
              altText={preview.id}
              size="large"
              onClose={() => setPreview(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
