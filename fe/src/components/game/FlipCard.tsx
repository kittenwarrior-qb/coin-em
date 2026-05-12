import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface FlipCardProps {
  frontImage: string
  backImage: string
  altText: string
  size?: 'small' | 'large'
  onClose?: () => void
}

export function FlipCard({ frontImage, backImage, altText, size = 'large', onClose }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  // Reset flip when card changes
  useEffect(() => { setFlipped(false) }, [frontImage])
  const dims = size === 'large'
    ? { maxWidth: 'min(70vw, 280px)', maxHeight: '65vh' }
    : { maxWidth: 'min(35vw, 140px)', maxHeight: '32vh' }
  const radius = size === 'large' ? '24px' : '14px'

  return (
    <motion.div
      initial={{ scale: 0.5, y: 100 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.5, y: 100 }}
      drag={onClose ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={onClose ? (_, info) => { if (info.offset.y > 100) onClose() } : undefined}
      className="relative"
      style={{ perspective: '1000px', ...dims }}
      onClick={e => e.stopPropagation()}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', cursor: 'pointer' }}
        onClick={() => setFlipped(f => !f)}
      >
        {/* Front */}
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: radius, overflow: 'hidden', boxShadow: '6px 6px 0 #1A1A1A' }}>
          <img src={frontImage} alt={`${altText} - front`} style={{ display: 'block', ...dims, width: 'auto', height: 'auto' }} draggable={false} />
        </div>
        {/* Back */}
        <div style={{ position: 'absolute', top: 0, left: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: radius, overflow: 'hidden', boxShadow: '6px 6px 0 #1A1A1A' }}>
          <img src={backImage} alt={`${altText} - back`} style={{ display: 'block', ...dims, width: 'auto', height: 'auto' }} draggable={false} />
        </div>
      </motion.div>

      {size === 'large' && onClose && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-sm whitespace-nowrap text-center">
          <div className="font-display">{flipped ? 'Nhấn để úp lại' : 'Nhấn để lật thẻ'}</div>
          <div className="text-xs text-gray-300 mt-0.5">👆 Vuốt xuống để đóng</div>
        </div>
      )}
    </motion.div>
  )
}
