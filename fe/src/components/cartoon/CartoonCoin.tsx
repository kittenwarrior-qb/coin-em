import { cn } from '@/lib/utils'

type CoinColor = 'red' | 'yellow' | 'green' | 'gold'

const COIN_EMOJI: Record<CoinColor, string> = {
  red:    '❤️',
  yellow: '💛',
  green:  '💚',
  gold:   '🪙',
}

interface CartoonCoinProps extends React.HTMLAttributes<HTMLDivElement> {
  color: CoinColor
  count?: number
  size?: 'sm' | 'md' | 'lg'
}

export function CartoonCoin({ color, count, size = 'md', className, ...props }: CartoonCoinProps) {
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-base' : size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-12 h-12 text-xl'

  return (
    <div className={cn('coin-cartoon gloss-cartoon', `coin-${color}`, sizeClass, className)} {...props}>
      <span className="pointer-events-none">{COIN_EMOJI[color]}</span>
      {count !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-[var(--c-black)] text-white text-[10px] font-display flex items-center justify-center px-1 leading-none">
          {count}
        </span>
      )}
    </div>
  )
}
