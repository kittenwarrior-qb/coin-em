import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { CardFaceImage } from './CardFaceImage'
import { cardImageFit, pdfCardAspect } from '@/features/game/catalog/cardImageLayout'

interface FlipCardProps {
  frontImage: string
  backImage: string
  altText: string
  size?: 'small' | 'large'
  aspect?: 'card' | 'coin'
  initialFlipped?: boolean
  autoFlipDelayMs?: number
  allowFlip?: boolean
  onClose?: () => void
}

export function FlipCard({
  frontImage,
  backImage,
  altText,
  size = 'large',
  initialFlipped = false,
  autoFlipDelayMs,
  allowFlip = true,
  onClose,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(initialFlipped)
  const kawaii=useControlTheme()==='candy-clouds',reduced=useReducedMotion()

  // Reset flip when card changes
  useEffect(() => {
    setFlipped(initialFlipped)
    if (autoFlipDelayMs === undefined) return

    const t = setTimeout(() => setFlipped(true), autoFlipDelayMs)
    return () => clearTimeout(t)
  }, [frontImage, backImage, initialFlipped, autoFlipDelayMs])
  const width = size === 'large'
      ? 'min(70vw, calc(65vh * 2 / 3), 280px)'
      : 'min(35vw, calc(32vh * 2 / 3), 140px)'
  const radius = size === 'large' ? '24px' : '14px'
  const cardAspectRatio = pdfCardAspect(frontImage) ?? pdfCardAspect(backImage) ?? '2 / 3'
  const imageFit = cardImageFit(frontImage) === 'contain' || cardImageFit(backImage) === 'contain' ? 'contain' : 'cover'
  const faceStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: radius,
    overflow: 'hidden',
    filter: kawaii?'drop-shadow(0 4px 0 #b7d1df)':'drop-shadow(6px 6px 0 #1A1A1A)',
  }
  const imageStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: imageFit,
  }

  return (
    <motion.div
      initial={kawaii?{scale:reduced?1:.96,y:reduced?0:12}: { scale: 0.5, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      exit={kawaii?{scale:reduced?1:.7,rotateX:reduced?0:55,opacity:0,transition:{duration:reduced?0:.22}}:{ scale: 0.5, y: 100 }}
      drag={onClose ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={onClose ? (_, info) => { if (info.offset.y > 100) onClose() } : undefined}
      className="relative"
      style={{
        perspective: '1000px',
        width,
        aspectRatio: cardAspectRatio,
      }}
      onClick={e => e.stopPropagation()}
    >
      <motion.div
        initial={{ rotateY: initialFlipped ? 180 : 0 }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: reduced?0:kawaii?.38:.7, ease: 'easeInOut' }}
        style={{
          transformStyle: 'preserve-3d',
          position: 'relative',
          cursor: allowFlip ? 'pointer' : 'default',
          width: '100%',
          height: '100%',
          willChange: 'transform',
        }}
        onClick={() => {
          if (allowFlip) setFlipped(f => !f)
        }}
      >
        {/* Front */}
        <div style={faceStyle}>
          <CardFaceImage retry src={frontImage} alt={`${altText} - front`} style={imageStyle} draggable={false} />
        </div>
        {/* Back */}
        <div style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
          <CardFaceImage retry src={backImage} alt={`${altText} - back`} style={imageStyle} draggable={false} />
        </div>
      </motion.div>

      {size === 'large' && onClose && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-sm whitespace-nowrap text-center">
          <div className="font-display">{flipped ? 'Nhấn để úp lại' : 'Nhấn để lật thẻ'}</div>
          {/* <div className="text-xs text-gray-300 mt-0.5">Vuốt xuống để đóng</div> */}
        </div>
      )}
    </motion.div>
  )
}
