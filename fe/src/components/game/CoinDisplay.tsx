import { PlayerCoins } from '@/types/game'

interface CoinDisplayProps {
  coins: PlayerCoins
  size?: 'sm' | 'md' | 'lg'
}

export function CoinDisplay({ coins, size = 'md' }: CoinDisplayProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  const coinClass = sizeClasses[size]

  return (
    <div className="flex items-center gap-2">
      {/* Red coin */}
      <div className="flex items-center gap-1">
        <div className={`${coinClass} rounded-full bg-red-500 border-2 border-black flex items-center justify-center font-bold text-white`}>
          {coins.red}
        </div>
      </div>

      {/* Yellow coin */}
      <div className="flex items-center gap-1">
        <div className={`${coinClass} rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center font-bold text-gray-800`}>
          {coins.yellow}
        </div>
      </div>

      {/* Green coin */}
      <div className="flex items-center gap-1">
        <div className={`${coinClass} rounded-full bg-green-500 border-2 border-black flex items-center justify-center font-bold text-white`}>
          {coins.green}
        </div>
      </div>
    </div>
  )
}
