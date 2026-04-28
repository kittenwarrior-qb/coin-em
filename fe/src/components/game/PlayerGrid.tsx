import { motion } from 'framer-motion'
import { GamePlayer } from '@/types/game'

interface PlayerGridProps {
  players: GamePlayer[]
  currentUserId: string
  onPlayerClick?: (player: GamePlayer) => void
}

export function PlayerGrid({ players, currentUserId, onPlayerClick }: PlayerGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {players.map((player, index) => {
        const isCurrentUser = player.socketId === currentUserId
        const isMuted = player.isMuted
        const isNTG = player.isNTG

        return (
          <motion.button
            key={player.socketId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onPlayerClick?.(player)}
            disabled={isCurrentUser}
            className={`relative aspect-[3/4] rounded-2xl border-3 border-black p-3
                       transition-all flex flex-col items-center justify-center
                       ${isCurrentUser ? 'bg-blue-200 cursor-default' : 'bg-white hover:scale-105 active:scale-95'}
                       ${isMuted ? 'opacity-60' : ''}
                       ${isNTG ? 'ring-4 ring-yellow-400' : ''}`}
          >
            {/* Badges */}
            <div className="absolute -top-2 -right-2 flex gap-1">
              {isNTG && (
                <span className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-black
                               flex items-center justify-center text-xs">
                  ⭐
                </span>
              )}
              {isMuted && (
                <span className="w-6 h-6 rounded-full bg-red-500 border-2 border-black
                               flex items-center justify-center text-xs">
                  🔇
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400
                          border-3 border-black flex items-center justify-center text-2xl mb-2">
              {player.name.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <div className="font-bold text-xs text-center truncate w-full px-1">
              {isCurrentUser ? 'Me' : player.name}
            </div>

            {/* Role (if revealed) */}
            {player.role && (
              <div className="mt-1 text-xs text-gray-600 text-center truncate w-full px-1">
                {player.role}
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
