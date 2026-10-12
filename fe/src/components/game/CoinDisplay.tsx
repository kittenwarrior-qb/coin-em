import { CARD_IMAGES } from '@/constants/cardImages'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { isBrandTheme } from '@/components/cartoon/controlThemes'
import { BrandCoinIcon } from './BrandCoinIcon'

interface CoinDisplayProps {
  coins: { red: number; yellow: number; green: number }
  onCoinClick: (front: string, back: string, alt: string) => void
}

const COINS = [
  { key: 'green'  as const, icon: '/coins/xanh.png', front: CARD_IMAGES.coins.green1,  back: CARD_IMAGES.coins.green2 },
  { key: 'yellow' as const, icon: '/coins/vang.png', front: CARD_IMAGES.coins.yellow1, back: CARD_IMAGES.coins.yellow2 },
  { key: 'red'    as const, icon: '/coins/do.png',   front: CARD_IMAGES.coins.red1,    back: CARD_IMAGES.coins.red2 },
]

export function CoinDisplay({ coins, onCoinClick }: CoinDisplayProps) {
  const theme = useControlTheme()
  const branded = isBrandTheme(theme)
  return (
    <div className={branded ? 'brand-coin-wallet' : 'flex flex-col gap-1'} aria-label="Coin của bạn">
      {COINS.map(coin => (
        <button
          key={coin.key}
          type="button"
          aria-label={`Xem Coin ${coin.key === 'green' ? 'Xanh' : coin.key === 'yellow' ? 'Vàng' : 'Đỏ'}`}
          onClick={() => onCoinClick(coin.front, coin.back, coin.key)}
          className="flex items-center gap-1.5 transition-transform active:scale-95"
        >
          {branded ? <BrandCoinIcon type={coin.key} workshop={theme === 'kindness-workshop'} /> : <img src={coin.icon} alt={coin.key} style={{ width: 25, height: 25, objectFit: 'contain' }} draggable={false} />}
          <span className="font-display leading-none" style={{ fontSize: 13, color: 'var(--c-pink)' }}>
            {coins[coin.key]}
          </span>
        </button>
      ))}
    </div>
  )
}
