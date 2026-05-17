import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CartoonButton, CartoonCircleButton } from '@/components/cartoon'
import { FlipCard } from './FlipCard'
import type { CardData, CardCategory, EmotionSubType, SituationSubType } from '@/stores/types'

// ─── Card data builder (module-level singleton) ───────────────────────────────
import { CARD_IMAGES } from '@/constants/cardImages'

function buildCards() {
  const make = (key: string, url: string, cat: CardCategory, back: string) =>
    ({ id: `${cat}-${key}`, frontImage: url, backImage: back, category: cat } as CardData)

  const roles = Object.entries(CARD_IMAGES.roles)
    .filter(([k]) => k !== 'back')
    .map(([k, u]) => make(k, u, 'role', CARD_IMAGES.roles.back))

  const allSituation = Object.entries(CARD_IMAGES.situation).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'situation', CARD_IMAGES.situation.back))
  // TH1-TH13 = Nhẹ, TH14-TH24 = Vừa, TH25-TH32 = Nhạy cảm
  const situationLight     = allSituation.filter(c => { const n = parseInt(c.id.replace('situation-TH', '')); return n >= 1 && n <= 13 })
  const situationMedium    = allSituation.filter(c => { const n = parseInt(c.id.replace('situation-TH', '')); return n >= 14 && n <= 24 })
  const situationSensitive = allSituation.filter(c => { const n = parseInt(c.id.replace('situation-TH', '')); return n >= 25 })

  const reflection = Object.entries(CARD_IMAGES.reflection).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'reflection', CARD_IMAGES.reflection.back))
  const selfcare   = Object.entries(CARD_IMAGES.selfcare).filter(([k]) => k !== 'back').map(([k, u]) => make(k, u, 'selfcare', CARD_IMAGES.selfcare.back))

  const emotionBasic    = Object.entries(CARD_IMAGES.emotionBasic).map(([k, imgs]) => ({ id: `emotion-basic-${k}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'basic' as EmotionSubType }))
  const emotionLight    = CARD_IMAGES.emotionLight.map((imgs, i) => ({ id: `emotion-light-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'light' as EmotionSubType }))
  const emotionStrong   = CARD_IMAGES.emotionStrong.map((imgs, i) => ({ id: `emotion-strong-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'strong' as EmotionSubType }))
  const emotionAdvanced = CARD_IMAGES.emotionAdvanced.map((imgs, i) => ({ id: `emotion-advanced-${i+1}`, frontImage: imgs.front, backImage: imgs.back, category: 'emotion' as CardCategory, subType: 'advanced' as EmotionSubType }))

  return {
    roles,
    situation: allSituation, reflection, selfcare,
    situationByType: { light: situationLight, medium: situationMedium, sensitive: situationSensitive },
    emotion: [...emotionBasic, ...emotionLight, ...emotionStrong, ...emotionAdvanced],
    emotionsByType: { basic: emotionBasic, light: emotionLight, strong: emotionStrong, advanced: emotionAdvanced },
  }
}

export const CARD_DATA = buildCards()

// ─── Component ────────────────────────────────────────────────────────────────

const TABS: { key: CardCategory; label: string }[] = [
  { key: 'role',       label: 'Vai trò' },
  { key: 'situation',  label: 'Tình huống' },
  { key: 'emotion',    label: 'Cảm xúc' },
  { key: 'reflection', label: 'Phản tư' },
  { key: 'selfcare',   label: 'Bí kíp' },
]

const SITUATION_TABS: { key: SituationSubType; label: string }[] = [
  { key: 'light',     label: 'Nhẹ' },
  { key: 'medium',    label: 'Vừa' },
  { key: 'sensitive', label: 'Nhạy cảm' },
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
  allowedEmotionGroups?: ('basic' | 'light' | 'strong' | 'advanced')[]
  allowedSituationGroups?: ('light' | 'medium' | 'sensitive')[]
  showConfirmButton?: boolean
}

export function CardInventory({ onClose, onSelectCard, allowedCategory, allowedEmotionGroups, allowedSituationGroups, showConfirmButton = false }: CardInventoryProps) {
  const [activeTab, setActiveTab]       = useState<CardCategory>(allowedCategory ?? 'role')
  const [situationSub, setSituationSub] = useState<SituationSubType>('light')
  const [emotionSub, setEmotionSub]     = useState<EmotionSubType>('basic')
  const [preview, setPreview]           = useState<CardData | null>(null)
  const [previewDir, setPreviewDir]     = useState<1 | -1>(1)

  // Filter tabs based on allowed groups
  const allowedEmotionTabs = EMOTION_TABS.filter(t =>
    !allowedEmotionGroups || allowedEmotionGroups.includes(t.key)
  )
  const allowedSituationTabs = SITUATION_TABS.filter(t =>
    !allowedSituationGroups || allowedSituationGroups.includes(t.key)
  )

  // Auto-select first allowed sub-tab if current is not allowed
  const effectiveSituationSub = allowedSituationTabs.find(t => t.key === situationSub)?.key ?? allowedSituationTabs[0]?.key ?? 'light'
  const effectiveEmotionSub   = allowedEmotionTabs.find(t => t.key === emotionSub)?.key   ?? allowedEmotionTabs[0]?.key   ?? 'basic'

  const cards =
    activeTab === 'role' ? CARD_DATA.roles :
    activeTab === 'situation' ? CARD_DATA.situationByType[effectiveSituationSub] :
    activeTab === 'emotion' ? CARD_DATA.emotionsByType[effectiveEmotionSub] :
    CARD_DATA[activeTab as 'reflection' | 'selfcare']

  const previewIndex = preview ? cards.findIndex(c => c.id === preview.id) : -1

  const navigatePreview = (dir: 1 | -1) => {
    if (previewIndex < 0) return
    const next = previewIndex + dir
    if (next < 0 || next >= cards.length) return
    setPreviewDir(dir)
    setPreview(cards[next])
  }

  const handleCardClick = (card: CardData) => {
    setPreview(card)
  }

  const handleConfirm = (card: CardData) => {
    if (onSelectCard) { onSelectCard(card); onClose() }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Constrain to mobile panel width */}
      <div className="relative w-full h-full flex items-center justify-center" style={{ maxWidth: 430 }}>
      <motion.div
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="relative w-[90%] flex flex-col"
      >
        {/* Panel-Teal background */}
        <div
          className="flex flex-col min-h-0"
          style={{
            borderImage: 'url(/cartoon/ui/Panel-Teal.png) 120 fill / 40px / 0px stretch',
          }}
        >
          {/* Inner clip layer — bo góc để content không tràn ra ngoài border-image */}
          <div className="flex flex-col min-h-0 overflow-hidden p-4 pt-5" style={{ borderRadius: '28px', margin: '8px' }}>

            {/* Title */}
            <h2 className="font-display text-2xl text-[var(--c-pink)] text-center mb-3">Bộ thẻ</h2>

            {/* Category tabs */}
            {!allowedCategory && (
              <div className="flex bg-[var(--c-gray-pale)] rounded-t-lg overflow-hidden mb-0">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={[
                      'flex-1 py-2 font-display text-xs transition-colors',
                      activeTab === t.key
                        ? 'bg-white border-b-4 border-[var(--c-pink)] text-[var(--c-pink)]'
                        : 'text-[var(--c-gray)] hover:text-[var(--c-black)]',
                    ].join(' ')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Situation sub-tabs — ẩn nếu chỉ có 1 nhóm được phép */}
            {activeTab === 'situation' && allowedSituationTabs.length > 1 && (
              <div className="flex bg-[var(--c-sky-mist)] px-2 rounded-md">
                {allowedSituationTabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setSituationSub(t.key)}
                    className={[
                      'flex-1 py-1.5 font-display text-[10px] transition-colors',
                      effectiveSituationSub === t.key
                        ? 'text-[var(--c-pink)]'
                        : 'text-[var(--c-gray)] hover:text-[var(--c-black)]',
                    ].join(' ')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Emotion sub-tabs — ẩn nếu chỉ có 1 nhóm được phép */}
            {activeTab === 'emotion' && allowedEmotionTabs.length > 1 && (
              <div className="flex bg-[var(--c-sky-mist)] px-2 rounded-md">
                {allowedEmotionTabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setEmotionSub(t.key)}
                    className={[
                      'flex-1 py-1.5 font-display text-[10px] transition-colors',
                      effectiveEmotionSub === t.key
                        ? 'text-[var(--c-pink)]'
                        : 'text-[var(--c-gray)] hover:text-[var(--c-black)]',
                    ].join(' ')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Grid — cố định 4 hàng */}
            <div
              className="overflow-y-auto scroll-cartoon py-3"
              style={{ height: '60vh', minHeight: '60vh', maxHeight: '60vh' }}
            >
              <div className="grid grid-cols-4 gap-2">
                {cards.map((card, index) => (
                  <div key={card.id} className="flex flex-col items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCardClick(card)}
                      className={[
                        'aspect-[2/3] w-full rounded-[14px] border overflow-hidden',
                        preview?.id === card.id
                          ? 'border-[var(--c-blue-mid)] shadow-cartoon'
                          : 'border-[var(--c-black)] shadow-cartoon-sm',
                      ].join(' ')}
                    >
                      <img src={card.frontImage} alt={card.id} className="w-full h-full object-cover" draggable={false} />
                    </motion.button>
                    <span className="font-body text-[9px] text-[var(--c-gray)] leading-none">Thẻ {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Close button — góc trên phải, ngoài panel */}
        <div className="absolute -top-[1px] -right-[1px] z-30">
          <CartoonCircleButton
            color="blue-teal"
            size="sm"
            onClick={onClose}
            aria-label="Đóng"
            className="!h-8 !w-8"
          >
            <img
              src="/cartoon/icons/X-Icon-Rounded.svg"
              alt="close"
              className="w-[33%] h-[33%] object-contain brightness-0 invert"
              draggable={false}
            />
          </CartoonCircleButton>
        </div>
      </motion.div>
      </div>

      {/* Preview overlay — constrained to 430px panel */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            style={{ maxWidth: 430, margin: '0 auto' }}
            onClick={e => { e.stopPropagation(); setPreview(null) }}
          >
            {/* Prev button */}
            <button
              className="absolute left-2 z-10 p-2 disabled:opacity-20 transition-opacity"
              onClick={e => { e.stopPropagation(); navigatePreview(-1) }}
              disabled={previewIndex <= 0}
              aria-label="Thẻ trước"
            >
              <img src="/cartoon/icons/Arrow---Right.svg" alt="prev" className="w-8 h-8" style={{ transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} draggable={false} />
            </button>

            {/* Card with slide transition */}
            <AnimatePresence mode="popLayout" custom={previewDir}>
              <motion.div
                key={preview.id}
                custom={previewDir}
                variants={{
                  enter: (dir: number) => ({ x: dir * 120, opacity: 0, scale: 0.92 }),
                  center: { x: 0, opacity: 1, scale: 1 },
                  exit: (dir: number) => ({ x: dir * -120, opacity: 0, scale: 0.92 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) navigatePreview(1)
                  else if (info.offset.x > 60) navigatePreview(-1)
                }}
                onClick={e => e.stopPropagation()}
                className="flex flex-col items-center"
              >
                <FlipCard
                  frontImage={preview.frontImage}
                  backImage={preview.backImage}
                  altText={preview.id}
                  size="large"
                  onClose={() => setPreview(null)}
                />
                {showConfirmButton && (
                  <div className="mt-12">
                    <CartoonButton
                      color="green"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleConfirm(preview) }}
                      data-testid="btn-confirm-preview-card"
                    >
                      Chọn
                    </CartoonButton>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Next button */}
            <button
              className="absolute right-2 z-10 p-2 disabled:opacity-20 transition-opacity"
              onClick={e => { e.stopPropagation(); navigatePreview(1) }}
              disabled={previewIndex >= cards.length - 1}
              aria-label="Thẻ tiếp"
            >
              <img src="/cartoon/icons/Arrow---Right.svg" alt="next" className="w-8 h-8" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} draggable={false} />
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-display text-xs text-white/70">
              {previewIndex + 1} / {cards.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
