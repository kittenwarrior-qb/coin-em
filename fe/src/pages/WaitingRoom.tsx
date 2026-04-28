import { motion } from 'framer-motion'

interface Player {
  socketId: string
  name: string
}

interface WaitingRoomProps {
  roomId: string
  players: Player[]
  hostSocketId: string
  mySocketId: string
  onStartGame: () => void
  onLeave: () => void
}

export default function WaitingRoom({
  roomId,
  players,
  hostSocketId,
  mySocketId,
  onStartGame,
  onLeave,
}: WaitingRoomProps) {
  const isHost = mySocketId === hostSocketId
  const canStart = players.length >= 2

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto rounded-3xl border-4 border-black bg-white p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🎴</div>
          <h2 className="text-xl font-black text-gray-800 mb-1">Phòng chờ</h2>
          <div className="inline-flex items-center gap-2 bg-[#F0F5FF] px-4 py-2 rounded-full border-2 border-black">
            <span className="text-xs font-bold text-gray-500">Room ID:</span>
            <span className="text-sm font-black text-gray-800">{roomId}</span>
          </div>
        </div>

        {/* Member count */}
        <div className="bg-[#FFF9C4] rounded-xl p-3 border-2 border-black text-center">
          <span className="text-sm font-bold text-gray-700">
            Thành viên: {players.length} / 8
          </span>
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {players.map((player, idx) => {
            const isMe = player.socketId === mySocketId
            const isPlayerHost = player.socketId === hostSocketId
            return (
              <motion.div
                key={player.socketId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-black bg-white"
              >
                <div className="w-10 h-10 rounded-full border-2 border-black bg-[#F0FFF4]
                                flex items-center justify-center text-base font-black">
                  {player.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-800">
                    {player.name}
                    {isMe && <span className="text-xs text-gray-500 ml-1">(Bạn)</span>}
                  </div>
                </div>
                {isPlayerHost && (
                  <div className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    HOST
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full py-4 rounded-2xl border-[3px] border-black bg-[#6BCB77]
                         text-base font-bold hover:bg-[#5BB767] active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {canStart ? 'Bắt đầu chơi' : 'Cần ít nhất 2 người'}
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl border-[3px] border-black bg-[#F0F5FF]
                            text-base font-bold text-center text-gray-600">
              Đang chờ host bắt đầu...
            </div>
          )}

          <button
            onClick={onLeave}
            className="w-full py-3 rounded-2xl border-2 border-black bg-white
                       text-sm font-bold hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            Rời phòng
          </button>
        </div>
      </div>
    </div>
  )
}
