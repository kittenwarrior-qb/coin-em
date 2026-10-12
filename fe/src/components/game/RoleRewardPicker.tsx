import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useRef, useState } from 'react'
import { usePopupLifecycle } from '@/features/overlays/usePopupLifecycle'
import { motion, useIsPresent } from 'framer-motion'
import { CartoonButton } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import type { Player } from './types'

interface RoleRewardPickerProps {
  pending?: boolean
  players: Player[]
  ntgPlayer?: Player
  ntgVotedIds: Set<string>
  onConfirm: (selectedPlayerIds: string[], rewardNtg: boolean) => void
  onClose: () => void
}

const ROLE_COLORS: Record<string, string> = {
  'Người Kết Nối': '#3FA7F5',
  'Người Gợi Mở': '#A66CFF',
  'Người Dẫn Lối': '#F59E42',
  'Người Trao Gửi': '#F97BB0',
}

const ROLE_ICONS: Record<string, string> = {
  'Người Kết Nối': '/emcoin/icons/orbit/connect.svg',
  'Người Gợi Mở': '/emcoin/icons/orbit/gift.svg',
  'Người Dẫn Lối': '/emcoin/icons/orbit/compass.svg',
}

export function RoleRewardPicker({
  pending,
  players,
  ntgPlayer,
  ntgVotedIds,
  onConfirm,
  onClose,
}: RoleRewardPickerProps) {
  const present = useIsPresent()
  const dialogRef = useRef<HTMLDivElement>(null)
  // onClose advances the phase: keyboard/history dismissal must never call it.
  usePopupLifecycle(dialogRef, present, { persistent: true })
  const blocked = pending || !present
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rewardNtg, setRewardNtg] = useState(true)

  const eligiblePlayers = players.filter(p =>
    p.role === 'Người Kết Nối' ||
    p.role === 'Người Gợi Mở' ||
    p.role === 'Người Dẫn Lối'
  )

  const togglePlayer = (playerId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const totalSelected = selectedIds.size + (rewardNtg && ntgPlayer ? 1 : 0)

  return (
    <motion.div
      data-testid="role-reward-picker"
      className="absolute inset-0 z-[70] flex items-end justify-center overflow-hidden bg-black/55 px-4 pb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={blocked ? undefined : onClose}
    >
      <motion.div
        ref={dialogRef} role="dialog" data-ui-panel="a1" aria-label="Đánh giá lượt chơi" tabIndex={-1} aria-busy={pending || undefined}
        className="flex flex-col max-h-[calc(100%-16px)] w-full max-w-sm overflow-hidden rounded-t-[28px] border-t-[3px] border-[var(--c-black)] bg-white p-4 shadow-[0_-5px_0_rgba(0,0,0,0.16)] [&>*]:shrink-0"
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        style={{ willChange: 'transform' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div data-ui-ink="primary" className="font-display text-base text-[var(--c-pink)]">Đánh giá lượt chơi</div>
          <div className="mt-0.5 font-body text-[11px] text-black/45">Ai đã hoàn thành tốt vai trò của mình?</div>
        </div>

        <div className="min-h-0 !shrink max-h-[50dvh] space-y-2 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

          {/* NTG row — same list style, toggle ON/OFF */}
          {ntgPlayer && (() => {
            const idx = players.findIndex(p => p.id === ntgPlayer.id)
            const avatarIdx = ntgPlayer.avatarIndex ?? idx
            const bgIdx = ntgPlayer.bgIndex ?? idx
            return (
              <button
                type="button"
                data-ui-chrome="reward-choice"
                aria-pressed={rewardNtg}
                disabled={blocked}
                onClick={() => setRewardNtg(v => !v)}
                className={[
                  'w-full flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all',
                  rewardNtg
                    ? 'border-[#F97BB0] bg-pink-50 shadow-[0_3px_0_rgba(0,0,0,0.10)]'
                    : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.08)]',
                ].join(' ')}
              >
                <div className="relative shrink-0">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.18)]"
                    style={{
                      background: AVATAR_BG_COLORS[Math.abs(bgIdx) % AVATAR_BG_COLORS.length],
                      borderColor: rewardNtg ? '#F97BB0' : '#e5e7eb',
                    }}
                  >
                    <EmcoinImage
                      src={AVATAR_ICONS[Math.abs(avatarIdx) % AVATAR_ICONS.length]}
                      alt=""
                      className="h-9 w-9 object-contain"
                      draggable={false}
                    />
                  </div>
                  {rewardNtg && (
                    <motion.img
                      src="/emcoin/icons/orbit/check.svg"
                      alt=""
                      initial={{ scale: 0, rotate: -18 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                      className="absolute -top-1 -right-1 h-5 w-5 object-contain"
                      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}
                      draggable={false}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="truncate font-display text-xs text-[#2F76AC]">{ntgPlayer.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full font-display text-[9px]"
                      style={{ backgroundColor: '#F97BB020', color: '#F97BB0' }}
                    >
                      Người Trao Gửi
                    </span>
                    {rewardNtg && (
                      <span className="inline-block px-2 py-0.5 bg-yellow-100 rounded-full font-display text-[9px] text-yellow-700">
                        +5 💛
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <div data-ui-chrome="selection-switch" className={[
                  'shrink-0 w-10 h-6 rounded-full transition-all relative border-2',
                  rewardNtg ? 'bg-[#F97BB0] border-[#F97BB0]' : 'bg-gray-200 border-gray-200',
                ].join(' ')}>
                  <motion.div
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
                    animate={{ left: rewardNtg ? '18px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 480, damping: 22 }}
                  />
                </div>
              </button>
            )
          })()}

          {/* Role players */}
          {eligiblePlayers.map((player) => {
            const playerIndex = players.findIndex(p => p.id === player.id)
            const avatarIndex = player.avatarIndex ?? playerIndex
            const bgIndex = player.bgIndex ?? playerIndex
            const wasVoted = ntgVotedIds.has(player.id)
            const isSelected = selectedIds.has(player.id)
            const roleColor = ROLE_COLORS[player.role] || '#2F76AC'
            const roleIcon = ROLE_ICONS[player.role]

            return (
              <button
                key={player.id}
                type="button"
                data-ui-chrome="reward-choice"
                aria-pressed={isSelected}
                disabled={blocked}
                onClick={() => togglePlayer(player.id)}
                className={[
                  'w-full rounded-2xl border-2 p-3 transition-all text-left',
                  isSelected
                    ? 'border-green-400 bg-green-50 shadow-[0_3px_0_rgba(0,0,0,0.12)]'
                    : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.12)]',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="grid h-12 w-12 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.18)]"
                      style={{
                        background: AVATAR_BG_COLORS[Math.abs(bgIndex) % AVATAR_BG_COLORS.length],
                        borderColor: isSelected ? '#4ade80' : roleColor,
                      }}
                    >
                      <EmcoinImage src={AVATAR_ICONS[Math.abs(avatarIndex) % AVATAR_ICONS.length]} alt="" className="h-9 w-9 object-contain" draggable={false} />
                    </div>
                    {roleIcon && (
                      <EmcoinImage
                        src={roleIcon}
                        alt=""
                        className="absolute -top-1 -left-1 h-5 w-5 object-contain"
                        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))', transform: 'rotate(-8deg)' }}
                        draggable={false}
                      />
                    )}
                    {isSelected && (
                      <motion.img
                        src="/emcoin/icons/orbit/check.svg"
                        alt=""
                        initial={{ scale: 0, rotate: -18 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                        className="absolute -top-1 -right-1 h-5 w-5 object-contain"
                        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}
                        draggable={false}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="truncate font-display text-xs text-[#2F76AC]">{player.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full font-display text-[9px]"
                        style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
                      >
                        {player.role}
                      </span>
                      {wasVoted && (
                        <span className="inline-block px-2 py-0.5 bg-yellow-100 rounded-full font-display text-[9px] text-yellow-700">
                          ✓ Được NTG vote
                        </span>
                      )}
                      {isSelected && (
                        <span className="inline-block px-2 py-0.5 bg-green-100 rounded-full font-display text-[9px] text-green-700">
                          +2 💛
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          {!ntgPlayer && eligiblePlayers.length === 0 && (
            <div className="py-3 text-center font-body text-xs text-black/40">
              Không có người chơi đủ điều kiện
            </div>
          )}
        </div>

        <CartoonButton
          color="green"
          size="md"
          className="mt-4 w-full"
          pending={pending}
          disabled={!present}
          onClick={() => { if (!blocked) onConfirm(Array.from(selectedIds), rewardNtg) }}
        >
          {totalSelected > 0 ? `Xác nhận (${totalSelected} người)` : 'Xác nhận'}
        </CartoonButton>
      </motion.div>
    </motion.div>
  )
}
