import { motion } from 'framer-motion'
import { CartoonBadge, CartoonAvatar } from '@/components/cartoon'
import type { Player, CoinType } from './types'

const PASTEL_LIST = [
  '#FFF0F5','#F0F5FF','#F0FFF4','#FFFBF0',
  '#F5F0FF','#F0FFFF','#FFF5F0','#F0FFF8','#FAFFF0',
]

interface PlayerCardProps {
  player: Player
  playerIndex: number
  onExpand: () => void
  onSendCoin: (coin: CoinType) => void
  onNightAction?: (id: string) => void
  onVote?: (id: string) => void
  isGlowing?: boolean
  isNightPhase?: boolean
}

export function PlayerCard({
  player, playerIndex, onExpand, onSendCoin,
  onNightAction, onVote, isGlowing, isNightPhase,
}: PlayerCardProps) {
  const bg = PASTEL_LIST[playerIndex % PASTEL_LIST.length]

  const isNarrator   = player.role === 'Người Quản trò'
  const isSender     = player.role === 'Người Trao Gửi'
  const hasPublicRole = isNarrator || isSender

  const handleClick = () => {
    if (player.isMe)                          { onExpand(); return }
    if (isNightPhase && onNightAction)         { onNightAction(player.id); return }
    if (onVote)                                { onVote(player.id); return }
  }

  return (
    <div className="relative flex flex-col">
      {/* Public role badge */}
      {hasPublicRole && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
          <CartoonBadge color={isNarrator ? 'purple' : 'yellow'}>
            {isNarrator ? '👑 Quản trò' : '💌 Trao gửi'}
          </CartoonBadge>
        </div>
      )}

      <motion.div
        whileTap={{ scale: 0.93 }}
        onClick={handleClick}
        animate={isGlowing ? { boxShadow: ['4px 4px 0 #1A1A1A', '4px 4px 0 #F5CC00, 0 0 16px rgba(245,204,0,0.7)', '4px 4px 0 #1A1A1A'] } : {}}
        transition={isGlowing ? { duration: 1.5, repeat: Infinity } : {}}
        data-testid={`player-card-${player.name}`}
        data-player-id={player.id}
        data-is-me={player.isMe}
        data-role={player.role}
        className={[
          'player-card-cartoon aspect-[3/4]',
          'flex flex-col items-center justify-center gap-1',
          player.isMe ? 'player-card-me' : '',
        ].join(' ')}
        style={{ background: bg }}
      >
        {player.isMuted  && <span className="absolute top-1 right-1 badge-cartoon badge-black text-[8px]">🔇</span>}
        {player.isHealed && <span className="absolute top-1 left-1  badge-cartoon badge-green text-[8px]">✨</span>}

        <CartoonAvatar name={player.name} colorIndex={playerIndex} size="sm" className="pointer-events-none" />

        <div className="font-display text-[10px] text-center px-1 leading-tight pointer-events-none">
          {player.name}
        </div>

        {player.isMe && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
            <CartoonBadge color="blue" className="text-[8px]">👤 Mình</CartoonBadge>
          </div>
        )}
      </motion.div>

    </div>
  )
}
