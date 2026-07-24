import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CartoonBadge } from '@/components/cartoon'
import type { CardData, SelectedCards } from '@/stores/types'

interface CenterBoardProps {
  selectedCards: SelectedCards
  phase?: string
  revealSituation?: boolean
  previewSituationCard?: CardData | null
  onCardClick?: (card: CardData, revealed: boolean) => void
}

function CardSlot({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0, y: -30 }}
      animate={{ scale: 1, y: 0 }}
      className="flex min-h-0 flex-col items-center gap-1"
    >
      <CartoonBadge color={color as never}>{label}</CartoonBadge>
      {children}
    </motion.div>
  )
}

// Dashed placeholder shown while waiting for a card to be placed
function EmptyCardSlot({ size = 'md', icon = '🃏' }: { size?: 'sm' | 'md' | 'lg'; icon?: string }) {
  const cls = size === 'sm' ? 'w-12' : size === 'lg' ? 'w-20' : 'w-16'
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${cls} aspect-[2/3] rounded-[14px] border-2 border-dashed border-black/20 flex items-center justify-center bg-white/30`}
    >
      <span className="text-xl opacity-30 select-none">{icon}</span>
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
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
  revealed?: boolean
  onClick?: () => void
}) {
  const cls = size === 'sm' ? 'w-12' : size === 'lg' ? 'w-20' : 'w-16'
  const [displayRevealed, setDisplayRevealed] = useState(revealed)
  const [isFlipping, setIsFlipping] = useState(false)
  const prevRevealedRef = useRef(revealed)

  useEffect(() => {
    if (!faceDown) {
      setDisplayRevealed(true)
      return
    }
    // Only trigger flip animation when `revealed` actually transitions
    if (prevRevealedRef.current === revealed) return
    prevRevealedRef.current = revealed

    setIsFlipping(true)
    const swapTimer = window.setTimeout(() => setDisplayRevealed(revealed), 160)
    const doneTimer = window.setTimeout(() => setIsFlipping(false), 320)
    return () => { window.clearTimeout(swapTimer); window.clearTimeout(doneTimer) }
  }, [faceDown, revealed])

  const isFaceDown = faceDown && !displayRevealed
  const imageSrc = isFaceDown ? card.backImage : card.frontImage

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
        style={{ borderWidth: 1, borderRadius: 8, transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipping ? [0, 90, 0] : 0 }}
        transition={{ duration: 0.32, ease: 'easeInOut' }}
      >
        <div
          className="h-full w-full overflow-hidden rounded-[inherit]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <img src={imageSrc} alt={alt} className="h-full w-full object-cover" draggable={false} />
        </div>
      </motion.div>
    </motion.button>
  )
}

export function CenterBoard({ selectedCards, phase, revealSituation = true, previewSituationCard, onCardClick }: CenterBoardProps) {
  const { situation, emotion, reflections, selfcare } = selectedCards

  const isReflectionPhase = phase === 'reflection-card' || phase === 'reflection-sharing'
  const isSelfcarePhase = phase === 'selfcare-card' || phase === 'hug-action'
  const isSituationPhase = phase === 'situation-card'
  const isEmotionPhase = phase === 'emotion-card'
  const isStoryPhase = phase === 'story-telling' || phase === 'group-response'

  // ── Reflection phases: show up to 3 slots with placeholders ──────────────────
  if (isReflectionPhase) {
    const empty = Math.max(0, 3 - reflections.length)
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden p-1">
        <CardSlot label="Phản tư" color="blue">
          <div className="flex flex-row flex-nowrap justify-center gap-2">
            {reflections.map((card, i) => (
              <motion.div key={card.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                <CardImg card={card} alt="reflection" size="sm" onClick={() => onCardClick?.(card, true)} />
              </motion.div>
            ))}
            {Array.from({ length: empty }).map((_, i) => (
              <EmptyCardSlot key={`empty-${i}`} size="sm" icon="🪞" />
            ))}
          </div>
        </CardSlot>
      </div>
    )
  }

  // ── Selfcare phases: show slot with placeholder if not chosen yet ─────────────
  if (isSelfcarePhase) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden p-1">
        <CardSlot label="Bí kíp ôm" color="green">
          {selfcare
            ? <CardImg card={selfcare} alt="selfcare" onClick={() => onCardClick?.(selfcare, true)} />
            : <EmptyCardSlot icon="🤗" />
          }
        </CardSlot>
      </div>
    )
  }

  // ── Situation + emotion phases ────────────────────────────────────────────────
  const showSituationRow = isSituationPhase || isEmotionPhase || isStoryPhase || situation || emotion

  if (showSituationRow) {
    const showEmotionSlot = emotion || isEmotionPhase
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-4">
        <div className="flex flex-row items-end justify-center gap-6">
          {/* Situation card + label */}
          {(situation || previewSituationCard || isSituationPhase || isEmotionPhase) && (
            <motion.div
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              {situation
                ? <CardImg card={situation} alt="situation" size="lg" faceDown revealed={revealSituation} onClick={() => onCardClick?.(situation, revealSituation)} />
                : previewSituationCard
                  ? (
                    <motion.div
                      key={previewSituationCard.id}
                      initial={{ scale: 0.9, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 0.85 }}
                      className="relative"
                    >
                      <CardImg card={previewSituationCard} alt="preview" size="lg" faceDown revealed={false} />
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-1.5 py-0.5 font-body text-[9px] text-white">
                        👀 đang xem
                      </div>
                    </motion.div>
                  )
                  : <EmptyCardSlot size="lg" icon="🃏" />
              }
              <span className="rounded-full bg-white/60 px-2 py-0.5 font-display text-[10px] text-[#b5476b]">Tình huống</span>
            </motion.div>
          )}

          {/* Emotion card + label */}
          {showEmotionSlot && (
            <motion.div
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="flex flex-col items-center gap-1.5"
            >
              {emotion
                ? <CardImg card={emotion} alt="emotion" size="lg" onClick={() => onCardClick?.(emotion, true)} />
                : <EmptyCardSlot size="lg" icon="💛" />
              }
              <span className="rounded-full bg-white/60 px-2 py-0.5 font-display text-[10px] text-[#b07a10]">Cảm xúc</span>
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  return null
}
