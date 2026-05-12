import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CartoonButton, CartoonCircleButton, CartoonScreen } from '@/components/cartoon'
import { JoinRoomModal } from '@/components/lobby/JoinRoomModal'
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal'
import { GameMenuModal } from '@/components/lobby/GameMenuModal'
import type { RoomListItem } from '@/components/lobby/RoomCard'

interface LobbyProps {
  availableRooms: RoomListItem[]
  onJoinRoom: (roomId: string, userName: string) => void
  onCreateRoom: (userName: string) => void
  onRefreshRooms: () => void
}

export default function Lobby({ availableRooms, onJoinRoom, onCreateRoom, onRefreshRooms }: LobbyProps) {
  const [joinOpen, setJoinOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Refresh room list while join modal is open
  useEffect(() => {
    if (!joinOpen) return
    onRefreshRooms()
    const id = setInterval(onRefreshRooms, 3000)
    return () => clearInterval(id)
  }, [joinOpen, onRefreshRooms])

  return (
    <CartoonScreen data-testid="lobby" purpleBg>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col justify-center p-8 gap-4 relative"
        data-testid="lobby-menu"
      >
        {/* Settings — top right */}
        <div className="absolute top-4 right-4">
          <CartoonCircleButton
            color="purple"
            size="sm"
            iconSrc="/cartoon/icons/Settings.svg"
            iconAlt="Cài đặt"
            iconSize="40%"
            aria-label="Cài đặt"
            style={{ height: 45, width: 45 }}
            onClick={() => setMenuOpen(true)}
          />
        </div>

        {/* Logo */}
        <div className="text-center" style={{ marginBottom: 32, marginTop: -40 }}>
          <img
            src="/emcoin_logo.png"
            alt="EmCoin"
            className="mx-auto"
            style={{ height: 100, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
          />
        </div>

        <CartoonButton color="blue" size="lg" onClick={() => setJoinOpen(true)} data-testid="btn-join-room">
          Tìm phòng
        </CartoonButton>

        <CartoonButton color="pink" size="lg" onClick={() => setCreateOpen(true)} data-testid="btn-create-room">
          Tạo phòng
        </CartoonButton>
      </motion.div>

      <JoinRoomModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        availableRooms={availableRooms}
        onJoin={onJoinRoom}
        onRefresh={onRefreshRooms}
      />

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreateRoom}
      />

      <GameMenuModal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onGuide={() => { setMenuOpen(false) }}
        onSettings={() => { setMenuOpen(false) }}
      />
    </CartoonScreen>
  )
}
