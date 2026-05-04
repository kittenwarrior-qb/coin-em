import { useState } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton, CartoonAvatar, CartoonScreen, QuitConfirmModal, CartoonScrollArea } from '@/components/cartoon'

interface Player {
  socketId: string
  userId?: string
  name: string
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
}

export default function WaitingRoom({
  roomId, players, hostSocketId, myUserId,
  onStartGame, onLeave, onAddFakePlayers,
}: WaitingRoomProps) {
  const [showQuit, setShowQuit] = useState(false)
  const hostUserId = hostSocketId
  const isHost     = myUserId === hostUserId
  const canStart   = players.length >= 5
  const MAX_PLAYERS = 10

  // Pad with empty slots up to MAX_PLAYERS so scroll area always has content
  const slots = [
    ...players,
    ...Array(Math.max(0, MAX_PLAYERS - players.length)).fill(null),
  ]

  return (
    <CartoonScreen data-testid="waiting-room" panel={false}>
      {/* Actions — fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 flex flex-col gap-2 z-10" style={{ background: 'linear-gradient(to bottom, transparent, #2cb9db 40%)' }}>
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
              {canStart ? '🎮 Bắt đầu chơi' : `Cần ít nhất 5 người (${players.length}/5)`}
            </CartoonButton>
            {onAddFakePlayers && players.length < MAX_PLAYERS && (
              <CartoonButton color="orange" className="w-full" onClick={onAddFakePlayers} data-testid="btn-add-bots">
                Thêm Bot
              </CartoonButton>
            )}
          </>
        ) : (
          <div className="text-center py-3 font-display text-sm text-[var(--c-blue-dark)]" data-testid="waiting-for-host">
            ⏳ Đang chờ host bắt đầu...
          </div>
        )}
        <CartoonButton color="white" className="w-full" onClick={() => setShowQuit(true)} data-testid="btn-leave-room">
          Rời phòng
        </CartoonButton>
      </div>

      {/* Main content — centered vertically in remaining space */}
      <div className="screen-panel flex flex-col justify-center" style={{ height: '100dvh', paddingBottom: isHost ? 160 : 120, background: 'radial-gradient(circle at center, #4df0f7 0%, #3adbe7 33%, #25b0ca 66%, #2cb9db 100%)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 text-center">
          <h2 className="font-display text-lg leading-tight">Phòng chờ</h2>
          <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-white/60 border border-black/10">
            <span className="font-body text-xs text-[var(--c-gray)]">Room:</span>
            <span data-testid="room-id" className="font-display text-xs tracking-wider">{roomId}</span>
          </div>
        </div>

        {/* Player count */}
        <div className="flex-shrink-0 px-4 pb-1.5 flex items-center justify-between">
          <span className="font-body text-xs text-[var(--c-gray)]">Người chơi</span>
          <span data-testid="player-count" className="font-display text-xs">{players.length} / {MAX_PLAYERS}</span>
        </div>

        {/* Player list — always shows 10 slots, scrollable, visible ~4 at a time */}
        <CartoonScrollArea
          className="flex-shrink-0"
          style={{ height: 220 }}
          alwaysShowScrollbar
          data-testid="player-list"
        >
          <div className="grid grid-cols-1 gap-2 px-4 pb-2 pt-1">
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/70 border border-black/8"
                >
                  <CartoonAvatar name={player.name} colorIndex={idx} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm truncate leading-tight">{player.name}</div>
                    {isMe && <div className="font-body text-xs text-[var(--c-gray)] leading-tight">Bạn</div>}
                  </div>
                  {isPlayerHost && (
                    <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                      <img src="/cartoon/icons/Crown.svg" alt="" className="w-3.5 h-3.5" />
                      <span className="font-display text-xs text-amber-700">Host</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </CartoonScrollArea>
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
    </CartoonScreen>
  )
}
