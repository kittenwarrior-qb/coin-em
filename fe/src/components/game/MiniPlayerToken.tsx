import { useState } from 'react'
import { motion } from 'framer-motion'
import { CartoonAvatar, CartoonCircleButton, ProfileModal } from '@/components/cartoon'
import type { Player } from '@/components/game/types'

interface MiniPlayerTokenProps {
  player: Player
  index: number
  isTop?: boolean
  isBottom?: boolean
  showActionIcon?: boolean
  actionIconSrc?: string
  actionIconSide?: 'left' | 'right'
  isActionTarget?: boolean
  actionTargetTone?: 'heal' | 'silence'
  isSelectedActionTarget?: boolean
  showRoleLabel?: boolean
  hideRoleBadge?: boolean
  isNightDimmed?: boolean
  showSleepEffect?: boolean
  isRoleActive?: boolean
  onClick?: () => void
  onActionClick?: () => void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => void
}

// Border colors for special roles
const BORDER_NTG    = '#FFB830'  // gold — Quản trò
const BORDER_SENDER = '#FF6B9D'  // pink — Người trao gửi
const BORDER_ME     = '#29B6F6'  // sky blue — bản thân
const BORDER_DEFAULT = 'white'
const BORDER_HEALER = '#62C76D'
const BORDER_SILENCER = '#7D7F8C'
const BORDER_CONNECTOR = '#3FA7F5'
const BORDER_OPENER = '#A66CFF'
const BORDER_GUIDE = '#F59E42'

const ROLE_LABELS: Record<string, string> = {
  'Người Quản trò': 'Quản trò',
  'Người Trao Gửi': 'Người trao gửi',
  'Người Chữa Lành': 'Người chữa lành',
  'Người Im Lặng': 'Người im lặng',
  'Người Kết Nối': 'Người kết nối',
  'Người Gợi Mở': 'Người gợi mở',
  'Người Dẫn Lối': 'Người dẫn lối',
}

const ROLE_ICONS: Record<string, string> = {
  'Người Quản trò': '/cartoon/icons/Crown.svg',
  'Người Trao Gửi': '/cartoon/icons/Flower-Multicolor.svg',
  'Người Chữa Lành': '/cartoon/icons/Life-Bag.svg',
  'Người Im Lặng': '/cartoon/icons/Lock-Gold.svg',
  'Người Gợi Mở': '/cartoon/icons/Gift-Pink-Border.svg',
  'Người Kết Nối': '/cartoon/icons/Magic.svg',
  'Người Dẫn Lối': '/cartoon/icons/Key-Gold.svg',
}

function getRoleLabel(player: Player, isTop?: boolean, isBottom?: boolean) {
  if (isTop || player.isNarrator) return 'Quản trò'
  if (isBottom || player.isSender) return 'Người trao gửi'
  const label = ROLE_LABELS[player.role]
  if (!label || player.role === 'Chưa chia vai trò') return null
  return label
}

function getRoleColor(player: Player, isTop?: boolean, isBottom?: boolean) {
  if (isTop || player.isNarrator) return BORDER_NTG
  if (isBottom || player.isSender) return BORDER_SENDER
  if (player.role === 'Người Chữa Lành') return BORDER_HEALER
  if (player.role === 'Người Im Lặng') return BORDER_SILENCER
  if (player.role === 'Người Kết Nối') return BORDER_CONNECTOR
  if (player.role === 'Người Gợi Mở') return BORDER_OPENER
  if (player.role === 'Người Dẫn Lối') return BORDER_GUIDE
  return '#2f76ac'
}

function getRoleIcon(player: Player, isTop?: boolean, isBottom?: boolean) {
  if (isTop || player.isNarrator) return ROLE_ICONS['Người Quản trò']
  if (isBottom || player.isSender) return ROLE_ICONS['Người Trao Gửi']
  return ROLE_ICONS[player.role]
}

function CurvedRoleLabel({ text, color, id }: { text: string; color: string; id: string }) {
  return (
    <svg
      viewBox="0 0 156 34"
      className="pointer-events-none h-[34px] w-[156px] overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <path id={id} d="M 12 26 Q 78 4 144 26" />
      </defs>
      <text
        className="font-display"
        fill={color}
        stroke="rgba(255,255,255,0.88)"
        strokeWidth={4}
        paintOrder="stroke fill"
        fontSize={15}
        fontWeight={800}
        textAnchor="middle"
      >
        <textPath href={`#${id}`} startOffset="50%" method="align" spacing="auto">
          {text}
        </textPath>
      </text>
    </svg>
  )
}

export function MiniPlayerToken({
  player,
  index,
  isTop,
  isBottom,
  showActionIcon,
  actionIconSrc = '/cartoon/icons/Potion-Green-Border.svg',
  actionIconSide = 'right',
  isActionTarget,
  actionTargetTone,
  isSelectedActionTarget,
  showRoleLabel,
  hideRoleBadge,
  isNightDimmed,
  showSleepEffect,
  isRoleActive,
  onClick,
  onActionClick,
  onUpdateProfile,
}: MiniPlayerTokenProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [localAvatarIdx, setLocalAvatarIdx] = useState<number | null>(null)
  const [localBgIdx, setLocalBgIdx] = useState<number | null>(null)

  // Use local overrides if set (optimistic update), else fall back to server data
  const displayAvatarIdx = localAvatarIdx ?? player.avatarIndex ?? index
  const displayBgIdx     = localBgIdx     ?? player.bgIndex     ?? index

  const roleLabel = getRoleLabel(player, isTop, isBottom)
  const roleColor = getRoleColor(player, isTop, isBottom)
  const roleIcon = getRoleIcon(player, isTop, isBottom)
  const shouldShowRoleLabel = Boolean(
    !hideRoleBadge && roleLabel && (showRoleLabel || isTop || isBottom || player.isNarrator || player.isSender)
  )
  const actionTargetColor = actionTargetTone === 'silence' ? BORDER_SILENCER : BORDER_HEALER
  const borderColor = shouldShowRoleLabel
      ? roleColor
      : player.isMe
        ? BORDER_ME
        : BORDER_DEFAULT
  const labelPathId = `role-arc-${player.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`

  const handleClick = () => {
    if (onActionClick) {
      onActionClick()
      return
    }
    // Only allow viewing own role card
    if (player.isMe) onClick?.()
  }

  const handlePhotoBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowProfile(true)
  }

  return (
    <>
      <div
        data-player-token-id={player.id}
        className="flex flex-col items-center gap-0 cursor-pointer select-none"
        onClick={handleClick}
      >
        <div className="relative flex h-7 w-[156px] items-end justify-center">
          {shouldShowRoleLabel && roleLabel && (
            <CurvedRoleLabel
              text={roleLabel}
              color={roleColor}
              id={labelPathId}
            />
          )}
        </div>

        {/* Avatar with role-based border + photo badge for self */}
        <div className="relative" data-player-avatar-id={player.id}>
          {shouldShowRoleLabel && roleIcon && (
            <motion.img
              src={roleIcon}
              alt=""
              className="pointer-events-none absolute z-20 h-8 w-8 object-contain"
              animate={{
                scale: isRoleActive ? [1, 1.18, 1] : 1,
                opacity: isRoleActive ? 1 : 0.92,
              }}
              transition={isRoleActive ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              style={{
                top: isTop || player.isNarrator ? -20 : -18,
                left: isTop || player.isNarrator ? 4 : -1,
                transform: isTop || player.isNarrator ? 'rotate(-14deg)' : 'rotate(-8deg)',
                filter: isRoleActive
                  ? `drop-shadow(0 0 8px ${roleColor}) drop-shadow(0 3px 4px rgba(0,0,0,0.22))`
                  : 'drop-shadow(0 3px 4px rgba(0,0,0,0.22))',
              }}
              draggable={false}
            />
          )}
          {(isActionTarget || isSelectedActionTarget) && (
            <motion.div
              className="pointer-events-none absolute z-10 rounded-[18px] border-[3px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: isSelectedActionTarget ? 1.08 : 1,
                boxShadow: isSelectedActionTarget
                  ? `0 0 22px 6px ${actionTargetColor}`
                  : `0 0 10px 1px ${actionTargetColor}`,
              }}
              transition={{ duration: 0.22 }}
              style={{
                inset: -9,
                borderColor: actionTargetColor,
                background: 'transparent',
              }}
            />
          )}
          <motion.div
            animate={{
              opacity: isSelectedActionTarget ? 1 : isNightDimmed ? 0.48 : 1,
              scale: isSelectedActionTarget ? 1.08 : 1,
              filter: isSelectedActionTarget
                ? `saturate(1.12) brightness(1.16) drop-shadow(0 0 14px ${actionTargetColor})`
                : isNightDimmed
                  ? 'saturate(0.75) brightness(0.78)'
                  : 'saturate(1) brightness(1)',
            }}
            transition={{ duration: 0.25 }}
          >
            <CartoonAvatar
              name={player.name}
              avatarIndex={displayAvatarIdx}
              bgIndex={displayBgIdx}
              borderColor={borderColor}
              size="lg"
            />
          </motion.div>
          {showSleepEffect && (
            <motion.img
              src="/cartoon/icons/Zzz.svg"
              alt=""
              className="pointer-events-none absolute z-30 h-7 w-7 object-contain"
              initial={{ opacity: 0, scale: 0.6, x: 30, y: -2 }}
              animate={{
                opacity: [0, 0.95, 0],
                scale: [0.65, 1, 0.85],
                x: [28, 34, 40],
                y: [-2, -14, -28],
              }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' }}
              style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}
              draggable={false}
            />
          )}
          {showActionIcon && (
            <motion.img
              src={actionIconSrc}
              alt=""
              initial={{ scale: 0, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="absolute z-20 h-8 w-8 object-contain pointer-events-none"
              style={{
                top: 8,
                [actionIconSide]: -24,
                filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.25))',
              }}
            />
          )}
          {player.isMuted && (
            <motion.img
              src="/cartoon/icons/Lock-Sliver.svg"
              alt=""
              initial={{ scale: 0, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="absolute z-30 h-7 w-7 object-contain pointer-events-none"
              style={{
                bottom: -8,
                left: -8,
                filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.28))',
              }}
              draggable={false}
            />
          )}
          {player.isMe && (
            <div
              className="absolute"
              style={{ bottom: -24, right: -3 }}
              onClick={handlePhotoBadgeClick}
            >
              <CartoonCircleButton
                color="purple"
                iconSrc="/cartoon/icons/white/Photo.png"
                iconSize="50%"
                style={{ height: 24, width: 24 }}
              />
            </div>
          )}
        </div>

        {/* Name */}
        <span
          className="font-display text-center leading-tight"
          style={{
            marginTop: 7,
            fontSize: 12,
            color: player.isMe ? 'var(--c-pink)' : '#2f76ac',
            fontWeight: player.isMe ? 700 : 400,
            maxWidth: 76,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {player.isMe ? 'Bạn' : player.name}
        </span>

      </div>

      {/* Profile modal — only for self, name locked */}
      {player.isMe && (
        <ProfileModal
          open={showProfile}
          onClose={() => setShowProfile(false)}
          currentName={player.name}
          currentAvatarIndex={displayAvatarIdx}
          currentBgIndex={displayBgIdx}
          lockName
          currentRole={player.role}
          onSave={(name, avatarIdx, bgIdx) => {
            setLocalAvatarIdx(avatarIdx)
            setLocalBgIdx(bgIdx)
            onUpdateProfile?.(name, avatarIdx, bgIdx)
          }}
        />
      )}
    </>
  )
}
