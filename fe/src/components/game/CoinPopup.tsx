import { motion } from 'framer-motion'
import { CartoonCoin } from '@/components/cartoon'
import { CartoonCircleButton } from '@/components/cartoon/CartoonButton'
import type { CoinType } from './types'
import { COIN_META } from './types'

interface CoinPopupProps {
  onSend: (c: CoinType) => void
  onClose: () => void
}

export function CoinPopup({ onSend, onClose }: CoinPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.7, y: 10 }}
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50
                 card-cartoon p-2 flex gap-2 items-center"
    >
      {(Object.keys(COIN_META) as CoinType[]).map(c => (
        <button
          key={c}
          data-testid={`coin-btn-${c}`}
          onClick={() => { onSend(c); onClose() }}
          title={COIN_META[c].label}
          className="press-cartoon"
        >
          <CartoonCoin color={c} size="sm" />
        </button>
      ))}
      <CartoonCircleButton color="gray" size="sm" onClick={onClose} aria-label="Đóng">✕</CartoonCircleButton>
    </motion.div>
  )
}
