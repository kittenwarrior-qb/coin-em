import { motion } from 'framer-motion'
import { CartoonCoin } from '@/components/cartoon'
import type { CoinType } from './types'

interface CoinStackProps {
  coins: { red: number; yellow: number; green: number }
}

const ORDER: CoinType[] = ['yellow', 'green', 'red']

export function CoinStack({ coins }: CoinStackProps) {
  return (
    <div className="absolute top-2 left-2 flex gap-1.5 z-10">
      {ORDER.map((type, i) => (
        <motion.div
          key={type}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.08 }}
        >
          <CartoonCoin color={type} count={coins[type]} size="sm" />
        </motion.div>
      ))}
    </div>
  )
}
