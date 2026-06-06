import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CartoonButton } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import type { CoinType, Player } from './types'

interface GiveCoinPickerProps {
  players: Player[]
  myPlayer?: Player
  onGiveCoin: (targetId: string, coinType: Extract<CoinType, 'red' | 'yellow'>, amount: number) => void
  onClose: () => void
}

export function GiveCoinPicker({ players, myPlayer, onGiveCoin, onClose }: GiveCoinPickerProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [coinType, setCoinType] = useState<'red' | 'yellow'>('yellow')
  const [amount, setAmount] = useState(1)
  const [successName, setSuccessName] = useState<string | null>(null)

  // Everyone except yourself can receive coins
  const giftablePlayers = useMemo(
    () => players.filter(p => p.id !== myPlayer?.id),
    [myPlayer?.id, players],
  )

  const selectedTarget = giftablePlayers.find(p => p.id === selectedPlayer)
  const redMax = Math.max(0, myPlayer?.coins.red ?? 0)
  const yellowMax = Math.max(0, myPlayer?.coins.yellow ?? 0)
  const currentMax = coinType === 'red' ? redMax : yellowMax
  const safeAmount = currentMax <= 0 ? 0 : Math.min(Math.max(1, amount), currentMax)
  const canGive = Boolean(selectedTarget && safeAmount > 0)

  const chooseCoinType = (next: 'red' | 'yellow') => {
    const nextMax = next === 'red' ? redMax : yellowMax
    setCoinType(next)
    setAmount(nextMax <= 0 ? 0 : Math.min(Math.max(1, amount), nextMax))
  }

  const handleConfirm = () => {
    if (!canGive || !selectedTarget) return
    onGiveCoin(selectedTarget.id, coinType, safeAmount)
    setSuccessName(selectedTarget.name)
    setSelectedPlayer(null)
    setAmount(1)
  }

  const coinColor = coinType === 'yellow' ? '#F5A623' : '#F97BB0'
  const coinSrc = coinType === 'yellow' ? '/coins/vang.png' : '/coins/do.png'
  const coinLabel = coinType === 'yellow' ? 'vàng' : 'đỏ'

  return (
    <motion.div
      className="absolute inset-0 z-[90] flex items-end justify-center overflow-hidden bg-black/50 px-3 pb-3 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-[390px] overflow-hidden rounded-[28px] border-[3px] border-[var(--c-black)] bg-white shadow-[0_8px_0_rgba(0,0,0,0.22)]"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-[var(--c-black)] bg-[var(--c-pink)] px-4 py-3">
          <div className="font-display text-sm text-white">🎁 Tặng coin cho bạn</div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 font-display text-lg leading-none text-white"
            onClick={onClose}
          >×</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Coin type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['yellow', 'red'] as const).map(type => {
              const max = type === 'yellow' ? yellowMax : redMax
              const active = coinType === type
              const src = type === 'yellow' ? '/coins/vang.png' : '/coins/do.png'
              const label = type === 'yellow' ? 'Vàng' : 'Đỏ'
              const activeColor = type === 'yellow' ? 'border-yellow-400 bg-yellow-50' : 'border-pink-400 bg-pink-50'
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => chooseCoinType(type)}
                  disabled={max <= 0}
                  className={[
                    'flex items-center justify-center gap-2 rounded-2xl border-2 py-3 font-display text-sm transition-all',
                    active ? activeColor + ' shadow-[0_3px_0_rgba(0,0,0,0.12)]' : 'border-gray-100 bg-gray-50 text-gray-400',
                    max <= 0 ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <img src={src} alt="" className="h-7 w-7 object-contain" draggable={false} />
                  <span style={{ color: active ? (type === 'yellow' ? '#B45309' : '#BE185D') : undefined }}>
                    {label} · {max}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Amount selector */}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <img src={coinSrc} alt="" className="h-8 w-8 object-contain" draggable={false} />
              <span className="font-display text-sm" style={{ color: coinColor }}>
                Tặng {coinLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAmount(Math.max(1, safeAmount - 1))}
                disabled={safeAmount <= 1 || currentMax <= 0}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-gray-200 bg-white font-display text-lg text-gray-600 shadow-[0_2px_0_rgba(0,0,0,0.08)] disabled:opacity-30"
              >−</button>
              <span className="w-6 text-center font-display text-xl" style={{ color: coinColor }}>
                {safeAmount}
              </span>
              <button
                type="button"
                onClick={() => setAmount(Math.min(currentMax, safeAmount + 1))}
                disabled={safeAmount >= currentMax || currentMax <= 0}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-gray-200 bg-white font-display text-lg text-gray-600 shadow-[0_2px_0_rgba(0,0,0,0.08)] disabled:opacity-30"
              >+</button>
            </div>
          </div>

          {/* Player grid */}
          <div className="grid max-h-[36dvh] grid-cols-2 gap-2 overflow-y-auto [scrollbar-width:none]">
            {giftablePlayers.map((player, i) => {
              const avatarIdx = player.avatarIndex ?? players.findIndex(p => p.id === player.id)
              const bgIdx = player.bgIndex ?? players.findIndex(p => p.id === player.id)
              const isSelected = selectedPlayer === player.id
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayer(isSelected ? null : player.id)}
                  className={[
                    'flex min-w-0 items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-all',
                    isSelected
                      ? 'border-[var(--c-orange)] bg-orange-50 shadow-[0_3px_0_rgba(0,0,0,0.12)]'
                      : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.08)]',
                  ].join(' ')}
                >
                  <div
                    className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                    style={{
                      background: AVATAR_BG_COLORS[Math.abs(bgIdx) % AVATAR_BG_COLORS.length],
                      borderColor: isSelected ? 'var(--c-orange)' : 'white',
                    }}
                  >
                    <img src={AVATAR_ICONS[Math.abs(avatarIdx) % AVATAR_ICONS.length]} alt="" className="h-8 w-8 object-contain" draggable={false} />
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--c-orange)]"
                      >
                        <img src="/cartoon/icons/Checkmark-Cartoon.svg" alt="" className="h-3 w-3 object-contain brightness-0 invert" draggable={false} />
                      </motion.div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-xs text-[#2F76AC]">{player.name}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Confirm */}
          <CartoonButton
            color="green"
            size="md"
            className="w-full"
            disabled={!canGive}
            onClick={handleConfirm}
          >
            {canGive
              ? `Tặng ${safeAmount} coin ${coinLabel} cho ${selectedTarget?.name}`
              : currentMax <= 0
                ? `Hết coin ${coinLabel} rồi!`
                : 'Chọn người nhận'}
          </CartoonButton>
        </div>

        {/* Success overlay */}
        <AnimatePresence>
          {successName && (
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full rounded-[26px] border-[3px] border-[var(--c-black)] bg-white px-5 py-5 text-center shadow-[0_7px_0_rgba(0,0,0,0.2)]"
                initial={{ scale: 0.82, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 440, damping: 24 }}
              >
                <div className="text-4xl mb-1">🎁</div>
                <div className="font-display text-base leading-tight text-[var(--c-pink)]">
                  Tặng coin thành công!
                </div>
                <div className="mt-1 font-body text-xs text-black/50">cho {successName}</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <CartoonButton color="orange" size="sm" onClick={() => setSuccessName(null)}>
                    Tặng tiếp
                  </CartoonButton>
                  <CartoonButton color="purple" size="sm" onClick={onClose}>
                    Đóng
                  </CartoonButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
