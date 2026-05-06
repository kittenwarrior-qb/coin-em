import { useState } from 'react'
import { CartoonAvatar, CartoonCircleButton, ProfileModal } from '@/components/cartoon'
import type { Player } from '@/components/game/types'

interface MiniPlayerTokenProps {
  player: Player
  index: number
  isTop?: boolean
  isBottom?: boolean
  onClick?: () => void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => void
}

// Border colors for special roles
const BORDER_NTG    = '#FFB830'  // gold — Quản trò
const BORDER_SENDER = '#FF6B9D'  // pink — Người trao gửi
const BORDER_ME     = '#29B6F6'  // sky blue — bản thân
const BORDER_DEFAULT = 'white'

export function MiniPlayerToken({ player, index, isTop, isBottom, onClick, onUpdateProfile }: MiniPlayerTokenProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [localAvatarIdx, setLocalAvatarIdx] = useState<number | null>(null)
  const [localBgIdx, setLocalBgIdx] = useState<number | null>(null)

  // Use local overrides if set (optimistic update), else fall back to server data
  const displayAvatarIdx = localAvatarIdx ?? player.avatarIndex ?? index
  const displayBgIdx     = localBgIdx     ?? player.bgIndex     ?? index

  const label = isTop ? 'Quản trò' : isBottom ? 'Người trao gửi' : null
  const borderColor = isTop ? BORDER_NTG : isBottom ? BORDER_SENDER : player.isMe ? BORDER_ME : BORDER_DEFAULT

  const handleClick = () => {
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
        className="flex flex-col items-center gap-0.5 cursor-pointer select-none"
        onClick={handleClick}
      >
        {/* Avatar with role-based border + photo badge for self */}
        <div className="relative">
          <CartoonAvatar
            name={player.name}
            avatarIndex={displayAvatarIdx}
            bgIndex={displayBgIdx}
            borderColor={borderColor}
            size="lg"
          />
          {player.isMe && (
            <div
              className="absolute"
              style={{ bottom: -3, right: -3 }}
              onClick={handlePhotoBadgeClick}
            >
              <CartoonCircleButton
                color="purple"
                iconSrc="/cartoon/icons/white/Photo.png"
                iconSize="50%"
                style={{ height: 20, width: 20 }}
              />
            </div>
          )}
        </div>

        {/* Name */}
        <span
          className="font-display text-center leading-tight"
          style={{
            fontSize: 10,
            color: player.isMe ? BORDER_ME : '#2f76ac',
            fontWeight: player.isMe ? 700 : 400,
            maxWidth: 64,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {player.isMe ? 'Bạn' : player.name}
        </span>

        {/* Role label */}
        {label && (
          <span className="font-body text-center" style={{ fontSize: 8, color: borderColor }}>
            {label}
          </span>
        )}
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
