import { useState } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton, CartoonCircleButton, CartoonAvatar, CartoonScreen, QuitConfirmModal, CartoonScrollArea, ProfileModal } from '@/components/cartoon'

interface Player {
  socketId: string
  userId?: string
  name: string
  avatarIndex?: number
  bgIndex?: number
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
}

export default function WaitingRoom({
  roomId, players, hostSocketId, myUserId,
  onStartGame, onLeave, onAddFakePlayers, onUpdateProfile,
}: WaitingRoomProps) {
  const [showQuit, setShowQuit] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [myDisplayName, setMyDisplayName] = useState('')

  // Init avatar/bg from server data (set by backend on join)
  const myPlayer = players.find(p => p.userId === myUserId)
  const [myAvatarIndex, setMyAvatarIndex] = useState(() => myPlayer?.avatarIndex ?? 0)
  const [myBgIndex, setMyBgIndex] = useState(() => myPlayer?.bgIndex ?? 0)
  const hostUserId = hostSocketId
  const isHost     = myUserId === hostUserId
  const canStart   = players.length >= 5
  const MAX_PLAYERS = 10

  const slots = [
    ...players,
    ...Array(Math.max(0, MAX_PLAYERS - players.length)).fill(null),
  ]

  return (
    <CartoonScreen data-testid="waiting-room" panel={false}>
      {/* Full-screen background */}
      <div
        className="screen-panel flex flex-col items-center justify-center"
        style={{
          height: '100dvh',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(/capybara_wallpaper.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Logo top */}
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <img src="/emcoin_logo.png" alt="EmCoin" style={{ height: 52, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }} />
        </div>

        {/* Green-tinted card wrapping everything */}
        <div
          className="w-full mx-4 rounded-3xl flex flex-col gap-3 px-4 py-5"
          style={{
            maxWidth: '22rem',
            background: 'rgba(220, 252, 231, 0.82)',
            backdropFilter: 'blur(100px)',
          }}
        >
          {/* Header */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center gap-1 px-5 py-2 rounded-2xl bg-white/80">
              <h2 className="font-display text-2xl leading-tight" style={{ color: '#ff6993' }}>Phòng chờ</h2>
              <div className="inline-flex items-center gap-1.5">
                <span className="font-body text-xs text-[var(--c-gray)]">Room:</span>
                <span data-testid="room-id" className="font-display text-xs tracking-wider">{roomId}</span>
              </div>
            </div>
          </div>

          {/* Player count */}
          <div className="flex items-center justify-between px-1">
            <span className="font-body text-xs text-[var(--c-gray)]">Người chơi</span>
            <span data-testid="player-count" className="font-display text-xs">{players.length} / {MAX_PLAYERS}</span>
          </div>

          {/* Player list */}
          <CartoonScrollArea
            className="flex-shrink-0"
            style={{ height: 220 }}
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
                const isMe         = player.userId === myUserId
                const isPlayerHost = player.userId === hostUserId
                return (
                  <motion.div
                    key={player.socketId}
                    data-testid={`waiting-player-${player.name}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl border border-black/8 cursor-pointer"
                    style={{ background: isMe ? 'rgba(254,240,138,0.85)' : 'rgba(255,255,255,0.7)' }}
                    onClick={isMe ? () => setShowProfile(true) : undefined}
                  >
                    {/* Avatar — with camera badge for self */}
                    <div className="relative flex-shrink-0">
                      <CartoonAvatar name={player.name} avatarIndex={isMe ? myAvatarIndex : (player.avatarIndex ?? idx)} bgIndex={isMe ? myBgIndex : (player.bgIndex ?? idx)} size="lg" />
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
                      <div className="font-display text-base truncate leading-tight">
                        {isMe && myDisplayName ? myDisplayName : player.name}
                      </div>
                    </div>
                    {isMe && (
                      <span className="font-display text-sm" style={{ color: '#f59e0b' }}>Bạn</span>
                    )}
                    {isPlayerHost && (
                      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                        <img src="/cartoon/icons/Crown.svg" alt="" className="w-4 h-4" />
                        <span className="font-display text-sm text-amber-700">Host</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </CartoonScrollArea>

          {/* Actions */}
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
                ⏳ Đang chờ host bắt đầu...
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
