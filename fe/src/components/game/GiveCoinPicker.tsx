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

  const giftablePlayers = useMemo(
    () => players.filter((player) => player.id !== myPlayer?.id && !player.isNarrator && !player.isSender),
    [myPlayer?.id, players],
  )
  const selectedTarget = giftablePlayers.find((player) => player.id === selectedPlayer)
  const redMax = Math.max(0, myPlayer?.coins.red ?? 0)
  const yellowMax = Math.max(0, myPlayer?.coins.yellow ?? 0)
  const currentMax = coinType === 'red' ? redMax : yellowMax
  const safeAmount = currentMax <= 0 ? 0 : Math.min(Math.max(1, amount), currentMax)
  const canGive = Boolean(selectedTarget && safeAmount > 0)

  const chooseCoinType = (nextType: 'red' | 'yellow') => {
    const nextMax = nextType === 'red' ? redMax : yellowMax
    setCoinType(nextType)
    setAmount(nextMax <= 0 ? 0 : Math.min(Math.max(1, amount), nextMax))
  }

  const handleConfirm = () => {
    if (!canGive || !selectedTarget) return
    onGiveCoin(selectedTarget.id, coinType, safeAmount)
    setSuccessName(selectedTarget.name)
    setSelectedPlayer(null)
    setAmount(1)
  }

  return (
    <motion.div
      className="absolute inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/50 px-4 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex max-h-[88dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] border-[3px] border-[var(--c-black)] bg-white shadow-[0_8px_0_rgba(0,0,0,0.24)]"
        initial={{ scale: 0.88, y: 26 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 26 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-[var(--c-black)] bg-[var(--c-pink)] px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-sm text-white">Tặng coin cho bạn thích</div>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 font-display text-lg leading-none text-white"
            onClick={onClose}
            aria-label="Đóng"
          >
            x
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-5 bg-[#e6f9ff] px-4 py-2 font-display text-xs text-[var(--c-black)]">
          <span className="inline-flex items-center gap-1.5">
            <img src="/coins/do.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
            {redMax}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <img src="/coins/vang.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
            {yellowMax}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3 bg-[#fff8dc] px-4 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => chooseCoinType('yellow')}
              className={[
                'flex items-center gap-1 rounded-full border-2 px-3 py-1.5 font-display text-xs transition-all',
                coinType === 'yellow'
                  ? 'border-yellow-400 bg-yellow-100 text-yellow-800'
                  : 'border-transparent bg-white text-gray-500',
              ].join(' ')}
            >
              <img src="/coins/vang.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
              Vàng
            </button>
            <button
              type="button"
              onClick={() => chooseCoinType('red')}
              className={[
                'flex items-center gap-1 rounded-full border-2 px-3 py-1.5 font-display text-xs transition-all',
                coinType === 'red'
                  ? 'border-[var(--c-pink)] bg-pink-100 text-[var(--c-pink)]'
                  : 'border-transparent bg-white text-gray-500',
              ].join(' ')}
            >
              <img src="/coins/do.png" alt="" className="h-5 w-5 object-contain" draggable={false} />
              Đỏ
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAmount(Math.max(1, safeAmount - 1))}
              disabled={safeAmount <= 1}
              className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white font-display text-sm text-gray-600 disabled:opacity-30"
            >
              -
            </button>
            <input
              type="number"
              min={currentMax > 0 ? 1 : 0}
              max={currentMax}
              value={safeAmount}
              disabled={currentMax <= 0}
              onChange={(event) => setAmount(Math.max(1, Math.min(currentMax, Number(event.target.value) || 1)))}
              className="h-8 w-12 rounded-lg border-2 border-gray-300 bg-white px-1 text-center font-display text-sm text-[var(--c-black)] disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => setAmount(Math.min(currentMax, safeAmount + 1))}
              disabled={safeAmount >= currentMax}
              className="h-8 w-8 rounded-full border-2 border-gray-300 bg-white font-display text-sm text-gray-600 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-[#f9fdff] px-3 py-3">
          <div className="grid max-h-[40dvh] grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {giftablePlayers.map((player, index) => {
              const avatarIndex = player.avatarIndex ?? index
              const bgIndex = player.bgIndex ?? index
              const isSelected = selectedPlayer === player.id

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayer(isSelected ? null : player.id)}
                  className={[
                    'flex min-w-0 items-center gap-2 rounded-2xl border-2 p-2 text-left transition-all',
                    isSelected
                      ? 'border-[var(--c-orange)] bg-[#fff1d6] shadow-[0_3px_0_rgba(0,0,0,0.12)]'
                      : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.08)]',
                  ].join(' ')}
                >
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                    style={{ background: AVATAR_BG_COLORS[Math.abs(bgIndex) % AVATAR_BG_COLORS.length] }}
                  >
                    <img
                      src={AVATAR_ICONS[Math.abs(avatarIndex) % AVATAR_ICONS.length]}
                      alt=""
                      className="h-7 w-7 object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-xs text-[#2F76AC]">{player.name}</div>
                  </div>
                  {isSelected && (
                    <motion.img
                      src="/cartoon/icons/Checkmark-Cartoon.svg"
                      alt=""
                      className="h-5 w-5 shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                      draggable={false}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="shrink-0 px-4 pb-4">
          <CartoonButton color="green" size="md" className="w-full" disabled={!canGive} onClick={handleConfirm}>
            {canGive
              ? `Tặng ${safeAmount} coin ${coinType === 'red' ? 'đỏ' : 'vàng'}`
              : currentMax <= 0
                ? `Bạn không còn coin ${coinType === 'red' ? 'đỏ' : 'vàng'}`
                : 'Chọn người nhận'}
          </CartoonButton>
        </div>

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
                <img
                  src="/cartoon/icons/Checkmark-Cartoon.svg"
                  alt=""
                  className="mx-auto h-14 w-14 object-contain"
                  draggable={false}
                />
                <div className="mt-3 font-display text-base leading-tight text-[var(--c-pink)]">
                  Bạn đã tặng coin thành công cho {successName}
                </div>
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
