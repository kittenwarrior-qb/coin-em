import { useState } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton } from '@/components/cartoon'
import { AVATAR_BG_COLORS, AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import type { Player } from './types'

interface RoleRewardPickerProps {
  players: Player[]
  ntgVotedIds: Set<string>
  onConfirm: (selectedPlayerIds: string[]) => void
  onClose: () => void
}

const ROLE_COLORS: Record<string, string> = {
  'Người Kết Nối': '#3FA7F5',
  'Người Gợi Mở': '#A66CFF',
  'Người Dẫn Lối': '#F59E42',
}

const ROLE_ICONS: Record<string, string> = {
  'Người Kết Nối': '/cartoon/icons/Magic.svg',
  'Người Gợi Mở': '/cartoon/icons/Gift-Pink-Border.svg',
  'Người Dẫn Lối': '/cartoon/icons/Key-Gold.svg',
}

export function RoleRewardPicker({
  players,
  ntgVotedIds,
  onConfirm,
  onClose,
}: RoleRewardPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filter players: only Connector, Opener, Guide
  const eligiblePlayers = players.filter(p => 
    p.role === 'Người Kết Nối' || 
    p.role === 'Người Gợi Mở' || 
    p.role === 'Người Dẫn Lối'
  )

  const togglePlayer = (playerId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds))
  }

  return (
    <motion.div
      className="absolute inset-0 z-[70] flex items-end justify-center overflow-hidden bg-black/45 px-4 pb-4 backdrop-blur-[2px]"
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
          <div className="font-display text-base text-[var(--c-pink)]">Đánh giá vai trò</div>
          <div className="mt-1 font-body text-[11px] leading-snug text-black/55">
            Chọn người chơi đã hoàn thành tốt vai trò của mình
          </div>
        </div>

        <div className="mt-4 max-h-[58dvh] space-y-3 overflow-y-auto pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {eligiblePlayers.map((player) => {
            const playerIndex = players.findIndex((p) => p.id === player.id)
            const avatarIndex = player.avatarIndex ?? playerIndex
            const bgIndex = player.bgIndex ?? playerIndex
            const wasVoted = ntgVotedIds.has(player.id)
            const isSelected = selectedIds.has(player.id)
            const roleColor = ROLE_COLORS[player.role] || '#2F76AC'
            const roleIcon = ROLE_ICONS[player.role]

            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={[
                  'w-full rounded-2xl border-2 p-3 transition-all text-left',
                  isSelected
                    ? 'border-green-400 bg-green-50 shadow-[0_3px_0_rgba(0,0,0,0.12)]'
                    : 'border-white bg-white shadow-[0_2px_0_rgba(0,0,0,0.12)]',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="grid h-14 w-14 place-items-center rounded-full border-2 shadow-[0_2px_0_rgba(0,0,0,0.18)]"
                      style={{ 
                        background: AVATAR_BG_COLORS[Math.abs(bgIndex) % AVATAR_BG_COLORS.length],
                        borderColor: roleColor,
                      }}
                    >
                      <img src={AVATAR_ICONS[Math.abs(avatarIndex) % AVATAR_ICONS.length]} alt="" className="h-10 w-10 object-contain" draggable={false} />
                    </div>
                    {roleIcon && (
                      <img
                        src={roleIcon}
                        alt=""
                        className="absolute -top-1 -left-1 h-6 w-6 object-contain"
                        style={{
                          filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.25))`,
                          transform: 'rotate(-8deg)',
                        }}
                        draggable={false}
                      />
                    )}
                    {isSelected && (
                      <motion.img
                        src="/cartoon/icons/Checkmark-Cartoon.svg"
                        alt=""
                        initial={{ scale: 0, rotate: -18 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 16 }}
                        className="absolute -top-1 -right-1 h-6 w-6 object-contain"
                        style={{
                          filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.25))`,
                        }}
                        draggable={false}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="truncate font-display text-sm text-[#2F76AC] mb-0.5">{player.name}</div>
                    <div 
                      className="inline-block px-2 py-0.5 rounded-full font-display text-[10px] font-bold"
                      style={{ 
                        backgroundColor: `${roleColor}20`,
                        color: roleColor,
                      }}
                    >
                      {player.role}
                    </div>
                    {wasVoted && (
                      <div className="inline-block ml-1 px-2 py-0.5 bg-yellow-100 rounded-full">
                        <span className="font-display text-[9px] text-yellow-700">✓ Được vote → +5 💛</span>
                      </div>
                    )}
                    {!wasVoted && isSelected && (
                      <div className="inline-block ml-1 px-2 py-0.5 bg-green-100 rounded-full">
                        <span className="font-display text-[9px] text-green-700">→ +2 💛</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <CartoonButton
          color="green"
          size="md"
          className="mt-4 w-full"
          onClick={handleConfirm}
          disabled={selectedIds.size === 0}
        >
          Xác nhận ({selectedIds.size} người)
        </CartoonButton>
      </motion.div>
    </motion.div>
  )
}
