import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CartoonButton, CartoonCard, CartoonBadge, CartoonAvatar, CartoonScreen, QuitConfirmModal,
} from '@/components/cartoon'

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
  const hostUserId  = hostSocketId
  const isHost      = myUserId === hostUserId
  const canStart    = players.length >= 7
  const fillPct     = Math.round((players.length / 11) * 100)

  return (
    <CartoonScreen data-testid="waiting-room">
      <div className="flex flex-col gap-4 p-6 flex-1">

        {/* Header */}
        <div className="text-center pt-6">
          <div className="text-5xl mb-2">🎴</div>
          <h2 className="font-display text-2xl">Phòng chờ</h2>
          <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full border-cartoon bg-[var(--c-sky-mist)] shadow-cartoon-sm">
            <span className="font-body text-xs text-[var(--c-gray)]">Room ID:</span>
            <span data-testid="room-id" className="font-display text-sm">{roomId}</span>
          </div>
        </div>

        {/* Player count bar */}
        <CartoonCard pastel="yellow" variant="sm" className="p-3 text-center">
          <span data-testid="player-count" className="font-display text-sm">
            Thành viên: {players.length} / 11
          </span>
          <div className="progress-cartoon progress-blue mt-2">
            <div className="progress-cartoon-fill" style={{ width: `${fillPct}%` }} />
          </div>
        </CartoonCard>

        {/* Player list */}
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto scroll-cartoon" data-testid="player-list">
          {players.map((player, idx) => {
            const isMe         = player.userId === myUserId
            const isPlayerHost = player.userId === hostUserId
            return (
              <motion.div
                key={player.socketId}
                data-testid={`waiting-player-${player.name}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 p-3 card-cartoon card-cartoon-sm"
              >
                <CartoonAvatar name={player.name} colorIndex={idx} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm truncate">
                    {player.name}
                    {isMe && <span className="font-body text-xs text-[var(--c-gray)] ml-1">(Bạn)</span>}
                  </div>
                </div>
                {isPlayerHost && (
                  <CartoonBadge color="black" data-testid="host-badge">HOST</CartoonBadge>
                )}
                {isMe && !isPlayerHost && (
                  <CartoonBadge color="blue">Tôi</CartoonBadge>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pb-4">
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
                {canStart ? '🎮 Bắt đầu chơi' : `Cần ít nhất 7 người (${players.length}/7)`}
              </CartoonButton>

              {onAddFakePlayers && players.length < 11 && (
                <CartoonButton
                  color="orange"
                  className="w-full"
                  onClick={onAddFakePlayers}
                  data-testid="btn-add-bots"
                >
                  🤖 Thêm Bot +1 (Debug)
                </CartoonButton>
              )}
            </>
          ) : (
            <CartoonCard pastel="blue" variant="sm" className="p-4 text-center" data-testid="waiting-for-host">
              <p className="font-display text-sm text-[var(--c-blue-dark)]">
                ⏳ Đang chờ host bắt đầu...
              </p>
            </CartoonCard>
          )}

          <CartoonButton color="white" className="w-full" onClick={() => setShowQuit(true)} data-testid="btn-leave-room">
            Rời phòng
          </CartoonButton>
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
    </CartoonScreen>
  )
}
