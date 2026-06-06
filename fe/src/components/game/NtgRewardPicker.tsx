import { motion } from 'framer-motion'
import { CartoonButton } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import type { Player } from './types'

interface NtgRewardPickerProps {
  players: Player[]
  rewardedIds: Set<string>
  pendingIds: Set<string>
  onTogglePending: (id: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function NtgRewardPicker({
  players,
  rewardedIds,
  pendingIds,
  onTogglePending,
  onConfirm,
  onClose,
}: NtgRewardPickerProps) {
  return (
    <motion.div
      className="absolute inset-0 z-[72] flex items-end justify-center overflow-hidden bg-black/45 px-4 pb-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm overflow-hidden rounded-t-[28px] border-t-[3px] border-[var(--c-black)] bg-white p-4 shadow-[0_-5px_0_rgba(0,0,0,0.16)]"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="font-display text-base text-[var(--c-pink)]">Tặng coin</div>
          <div className="mt-0.5 font-body text-[11px] text-black/45">
            Chọn người phản hồi hay nhất · +5 🪙
          </div>
        </div>

        <div className="mt-4 grid max-h-[58dvh] grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {players.filter((player) => !player.isMe).map((player) => {
            const rewarded = rewardedIds.has(player.id)
            const selected = pendingIds.has(player.id)
            const playerIndex = players.findIndex((p) => p.id === player.id)
            const avatarIndex = player.avatarIndex ?? playerIndex
            const bgIndex = player.bgIndex ?? playerIndex

            return (
              <button
                key={player.id}
                type="button"
                disabled={rewarded}
                onClick={() => onTogglePending(player.id)}
                className={[
                  'relative min-w-0 overflow-hidden flex items-center gap-2 rounded-2xl border-2 p-2 text-left transition-all',
                  rewarded
                    ? 'border-[var(--c-yellow)] bg-[#fff7cc] opacity-70 cursor-not-allowed'
                    : selected
                      ? 'border-[var(--c-orange)] bg-[#fff1d6] shadow-[0_4px_0_rgba(0,0,0,0.16)] active:translate-y-[1px]'
                      : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.12)] hover:border-[var(--c-sky-mist)] active:translate-y-[1px]',
                ].join(' ')}
                data-testid={`btn-ntg-reward-${player.name}`}
              >
                <div
                  className={[
                    'grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.18)]',
                    rewarded ? 'border-[var(--c-yellow)]' : 'border-white',
                  ].join(' ')}
                  style={{ background: AVATAR_BG_COLORS[Math.abs(bgIndex) % AVATAR_BG_COLORS.length] }}
                >
                  <img 
                    src={AVATAR_ICONS[Math.abs(avatarIndex) % AVATAR_ICONS.length]} 
                    alt="" 
                    className={[
                      'h-9 w-9 object-contain',
                      rewarded ? 'opacity-60' : '',
                    ].join(' ')}
                    draggable={false} 
                  />
                </div>
                <div className="min-w-0">
                  <div className={[
                    'truncate font-display text-xs',
                    rewarded ? 'text-[#2F76AC]/60' : 'text-[#2F76AC]',
                  ].join(' ')}>
                    {player.name}
                  </div>
                  {rewarded && (
                    <div className="truncate font-body text-[10px] text-black/50">Đã tặng +5 🪙</div>
                  )}
                </div>
                {(rewarded || selected) && (
                  <motion.img
                    src={rewarded ? '/cartoon/icons/Coin.svg' : '/cartoon/icons/Checkmark-Cartoon.svg'}
                    alt=""
                    className="absolute right-1 top-1 h-6 w-6 object-contain drop-shadow"
                    initial={{ scale: 0, rotate: -18 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                    draggable={false}
                  />
                )}
              </button>
            )
          })}
        </div>

        <motion.div
          key={pendingIds.size > 0 ? 'choose' : 'close'}
          initial={pendingIds.size > 0 ? { scale: 0.86, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        >
          <CartoonButton
            color={pendingIds.size > 0 ? 'orange' : 'white'}
            size="md"
            className="mt-4 w-full"
            onClick={onConfirm}
          >
            {pendingIds.size > 0 ? 'Chọn' : 'Đóng'}
          </CartoonButton>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
