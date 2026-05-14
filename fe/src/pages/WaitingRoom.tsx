import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CartoonAvatar,
  CartoonButton,
  CartoonCircleButton,
  CartoonDropdown,
  CartoonScreen,
  CartoonScrollArea,
  ProfileModal,
  QuitConfirmModal,
} from '@/components/cartoon'
import { ROLE_TO_IMAGE } from '@/constants/cardImages'

interface Player {
  socketId: string
  userId?: string
  name: string
  avatarIndex?: number
  bgIndex?: number
  isFake?: boolean
  debugPreferredRole?: string
}

interface WaitingRoomProps {
  roomId: string
  players: Player[]
  hostSocketId: string
  mySocketId: string
  myUserId?: string
  onStartGame: () => void
  onLeave: () => void
  onAddFakePlayers?: () => void
  onUpdateProfile?: (name: string, avatarIndex: number, bgIndex: number) => void
  onSetDebugRolePreference?: (targetUserId: string, role: string) => void
  debugRolePickerEnabled?: boolean
}

export default function WaitingRoom({
  roomId,
  players,
  hostSocketId,
  myUserId,
  onStartGame,
  onLeave,
  onAddFakePlayers,
  onUpdateProfile,
  onSetDebugRolePreference,
  debugRolePickerEnabled: serverDebugRolePickerEnabled,
}: WaitingRoomProps) {
  const [showQuit, setShowQuit] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [myDisplayName, setMyDisplayName] = useState('')

  const myPlayer = players.find(p => p.userId === myUserId)
  const [myAvatarIndex, setMyAvatarIndex] = useState(() => myPlayer?.avatarIndex ?? 0)
  const [myBgIndex, setMyBgIndex] = useState(() => myPlayer?.bgIndex ?? 0)

  const hostUserId = hostSocketId
  const isHost = myUserId === hostUserId
  const canStart = players.length >= 5
  const MAX_PLAYERS = 10
  const canHostPickRoles = serverDebugRolePickerEnabled === true && isHost

  const [
    ROLE_NARRATOR,
    ROLE_SENDER,
    ROLE_HEALER,
    ROLE_GUIDE,
    ROLE_OPENER,
    ROLE_SILENCER,
    ROLE_CONNECTOR,
  ] = Object.keys(ROLE_TO_IMAGE)

  const getRoleDeck = (count: number) => {
    if (count >= 10) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_CONNECTOR, ROLE_OPENER, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 9) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 8) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 7) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE, ROLE_HEALER]
    if (count === 6) return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER, ROLE_GUIDE]
    return [ROLE_NARRATOR, ROLE_SENDER, ROLE_SILENCER, ROLE_CONNECTOR, ROLE_OPENER]
  }

  const countRoles = (roles: string[]) =>
    roles.reduce<Record<string, number>>((acc, role) => {
      acc[role] = (acc[role] ?? 0) + 1
      return acc
    }, {})

  const roleDeck = getRoleDeck(players.length)
  const roleCapacity = countRoles(roleDeck)
  const selectedRoleCounts = countRoles([
    ROLE_NARRATOR,
    ...(players
      .filter(p => p.userId !== hostUserId)
      .map(p => p.debugPreferredRole)
      .filter(Boolean) as string[]),
  ])

  const getRoleOptionsForPlayer = (player: Player) =>
    roleDeck
      .filter(role => role !== ROLE_NARRATOR)
      .filter((role, index, arr) => arr.indexOf(role) === index)
      .filter(role => role === player.debugPreferredRole || (selectedRoleCounts[role] ?? 0) < (roleCapacity[role] ?? 0))
      .map(role => ({ value: role, label: role }))

  const assignDebugRole = (player: Player, role: string) => {
    if (!player.userId || !roleDeck.includes(role)) return
    onSetDebugRolePreference?.(player.userId, role)
  }

  const slots = [
    ...players,
    ...Array(Math.max(0, MAX_PLAYERS - players.length)).fill(null),
  ]

  return (
    <CartoonScreen data-testid="waiting-room" panel={false}>
      <div
        className="screen-panel flex flex-col items-center justify-center"
        style={{
          height: '100dvh',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(/capybara_wallpaper.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <img src="/emcoin_logo.png" alt="EmCoin" style={{ height: 52, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} />
        </div>

        <div
          className="w-full mx-4 rounded-3xl flex flex-col gap-3 px-4 py-5"
          style={{
            maxWidth: '22rem',
            background: 'rgba(220, 252, 231, 0.82)',
            backdropFilter: 'blur(100px)',
          }}
        >
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center gap-1 px-5 py-2 rounded-2xl bg-white/80">
              <h2 className="font-display text-2xl leading-tight" style={{ color: '#ff6993' }}>Phòng chờ</h2>
              <div className="inline-flex items-center gap-1.5">
                <span className="font-body text-xs text-[var(--c-gray)]">Room:</span>
                <span data-testid="room-id" className="font-display text-xs tracking-wider">{roomId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="font-body text-xs text-[var(--c-gray)]">Người chơi</span>
            <span data-testid="player-count" className="font-display text-xs">{players.length} / {MAX_PLAYERS}</span>
          </div>

          {canHostPickRoles && (
            <div className="rounded-2xl bg-white/70 px-3 py-2" data-testid="debug-role-picker">
              <div className="font-display text-xs text-[var(--c-gray)]">Debug role round 1</div>
              <div className="font-body text-[11px] text-black/55">
                {roleDeck.length
                  ? 'Host chọn role cho từng người. Người cuối sẽ tự nhận role còn lại.'
                  : 'Cần ít nhất 5 người chơi hoặc bot để chọn role.'}
              </div>
            </div>
          )}

          <CartoonScrollArea
            className="flex-shrink-0"
            style={{ height: canHostPickRoles ? 260 : 220 }}
            alwaysShowScrollbar
            data-testid="player-list"
          >
            <div className="grid grid-cols-1 gap-2 pb-2 pt-1">
              {slots.map((player, idx) => {
                if (!player) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-dashed border-black/15 bg-white/30"
                    >
                      <div className="w-9 h-9 rounded-full bg-black/8 flex items-center justify-center flex-shrink-0">
                        <span className="text-black/25 text-lg">+</span>
                      </div>
                      <span className="font-body text-xs text-black/30">Đang chờ người chơi...</span>
                    </div>
                  )
                }

                const isMe = player.userId === myUserId
                const isPlayerHost = player.userId === hostUserId
                const displayName = isMe && myDisplayName ? myDisplayName : player.name

                return (
                  <motion.div
                    key={player.socketId}
                    data-testid={`waiting-player-${player.name}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-black/8 cursor-pointer"
                    style={{ background: isMe ? 'rgba(254,240,138,0.85)' : 'rgba(255,255,255,0.7)' }}
                    onClick={isMe ? () => setShowProfile(true) : undefined}
                  >
                    <div className="relative flex-shrink-0">
                      <CartoonAvatar
                        name={player.name}
                        avatarIndex={isMe ? myAvatarIndex : (player.avatarIndex ?? idx)}
                        bgIndex={isMe ? myBgIndex : (player.bgIndex ?? idx)}
                        size="lg"
                      />
                      {isMe && (
                        <div className="absolute pointer-events-none" style={{ bottom: -24, right: -8 }}>
                          <CartoonCircleButton
                            color="purple"
                            iconSrc="/cartoon/icons/white/Photo.png"
                            iconSize="50%"
                            style={{ height: 24, width: 24 }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base truncate leading-tight">{displayName}</div>
                      {canHostPickRoles && (
                        <div className="font-body text-[10px] text-black/45 truncate">
                          {isPlayerHost ? ROLE_NARRATOR : (player.debugPreferredRole ?? 'Chưa chọn role')}
                        </div>
                      )}
                    </div>

                    {!canHostPickRoles && isMe && (
                      <span className="font-display text-sm" style={{ color: '#f59e0b' }}>Bạn</span>
                    )}

                    {!canHostPickRoles && isPlayerHost && (
                      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                        <img src="/cartoon/icons/Crown.svg" alt="" className="w-4 h-4" />
                        <span className="font-display text-sm text-amber-700">Host</span>
                      </div>
                    )}

                    {canHostPickRoles && (
                      <div className="w-32 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {isPlayerHost ? (
                          <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-amber-100 border border-amber-300">
                            <img src="/cartoon/icons/Crown.svg" alt="" className="w-4 h-4" />
                            <span className="font-display text-[10px] text-amber-700 truncate">Quản trò</span>
                          </div>
                        ) : (
                          <CartoonDropdown
                            options={getRoleOptionsForPlayer(player)}
                            value={player.debugPreferredRole}
                            placeholder="Chọn role"
                            disabled={roleDeck.length === 0}
                            onChange={(role) => assignDebugRole(player, role)}
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CartoonScrollArea>

          <div className="flex flex-col gap-2">
            {isHost ? (
              <>
                <CartoonButton
                  color={canStart ? 'green' : 'gray'}
                  size="lg"
                  className="w-full"
                  disabled={!canStart}
                  onClick={onStartGame}
                  data-testid="btn-start-game"
                >
                  {canStart ? 'Bắt đầu' : `Bắt đầu (${players.length}/5)`}
                </CartoonButton>
                {onAddFakePlayers && players.length < MAX_PLAYERS && (
                  <CartoonButton color="orange" className="w-full" onClick={onAddFakePlayers} data-testid="btn-add-bots">
                    Thêm Bot
                  </CartoonButton>
                )}
              </>
            ) : (
              <div className="text-center py-2 font-display text-sm" data-testid="waiting-for-host">
                Đang chờ host bắt đầu...
              </div>
            )}
            <CartoonButton color="white" className="w-full" onClick={() => setShowQuit(true)} data-testid="btn-leave-room">
              Rời phòng
            </CartoonButton>
          </div>
        </div>
      </div>

      <QuitConfirmModal
        open={showQuit}
        onConfirm={() => { setShowQuit(false); onLeave() }}
        onCancel={() => setShowQuit(false)}
        message="Bạn có muốn rời phòng không?"
        subMessage="Bạn sẽ mất chỗ trong phòng!"
        confirmLabel="Rời"
        cancelLabel="Ở lại"
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        currentName={myDisplayName || (players.find(p => p.userId === myUserId)?.name ?? '')}
        currentAvatarIndex={myAvatarIndex}
        currentBgIndex={myBgIndex}
        onSave={(name, avatarIdx, bgIdx) => {
          setMyDisplayName(name)
          setMyAvatarIndex(avatarIdx)
          setMyBgIndex(bgIdx)
          onUpdateProfile?.(name, avatarIdx, bgIdx)
        }}
      />
    </CartoonScreen>
  )
}
