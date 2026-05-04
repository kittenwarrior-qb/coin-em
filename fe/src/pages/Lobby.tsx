import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CartoonButton, CartoonCircleButton, CartoonInput, CartoonCard, CartoonBadge, CartoonScreen,
} from '@/components/cartoon'

type Screen = 'menu' | 'join' | 'create'

interface RoomListItem {
  id: string
  playerCount: number
  hostName: string
}

interface LobbyProps {
  availableRooms: RoomListItem[]
  onJoinRoom: (roomId: string, userName: string) => void
  onCreateRoom: (userName: string) => void
  onRefreshRooms: () => void
}

// ─── Sub-screens ──────────────────────────────────────────────────────────────

function MenuScreen({ onJoin, onCreate }: { onJoin: () => void; onCreate: () => void }) {
  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex-1 flex flex-col justify-center p-8 gap-4"
      data-testid="lobby-menu"
    >
      <div className="text-center" style={{ marginBottom: 32, marginTop: -40 }}>
        <img src="/emcoin_logo.png" alt="EmCoin" className="mx-auto" style={{ height: 100, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} />
      </div>

      <CartoonButton color="blue" size="lg" onClick={onJoin} data-testid="btn-join-room">
        Tìm phòng
      </CartoonButton>

      <CartoonButton color="pink" size="lg" onClick={onCreate} data-testid="btn-create-room">
        Tạo phòng
      </CartoonButton>
    </motion.div>
  )
}

function JoinScreen({
  availableRooms,
  onBack,
  onJoin,
  onRefresh,
}: {
  availableRooms: RoomListItem[]
  onBack: () => void
  onJoin: (roomId: string, userName: string) => void
  onRefresh: () => void
}) {
  const [roomId, setRoomId] = useState('')
  const [userName, setUserName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null)

  const targetRoomId = selectedRoom ? selectedRoom.id : roomId.trim()
  const canJoin = !!userName.trim() && !!targetRoomId

  return (
    <motion.div
      key="join"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto scroll-cartoon"
      data-testid="lobby-join"
    >
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <CartoonCircleButton color="gray" size="sm" onClick={onBack} aria-label="Quay lại">←</CartoonCircleButton>
        <h2 className="font-display text-xl">Tham gia phòng</h2>
      </div>

      {/* Room list */}
      {availableRooms.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-[var(--c-gray-dark)]">Phòng đang chờ</span>
            <button onClick={onRefresh} className="text-xs font-display text-[var(--c-blue-mid)] hover:underline">
              🔄 Làm mới
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto scroll-cartoon">
            {availableRooms.map(room => (
              <RoomListItem
                key={room.id}
                room={room}
                selected={selectedRoom?.id === room.id}
                onSelect={() => { setSelectedRoom(room); setRoomId('') }}
              />
            ))}
          </div>
        </div>
      ) : (
        <CartoonCard pastel="yellow" variant="sm" className="p-3 text-center">
          <p className="font-body text-sm text-[var(--c-gray-dark)]">Chưa có phòng nào đang chờ</p>
        </CartoonCard>
      )}

      {/* Manual input */}
      <CartoonInput
        label="Hoặc nhập mã phòng"
        data-testid="input-room-id"
        value={selectedRoom ? selectedRoom.id : roomId}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setRoomId(e.target.value); setSelectedRoom(null) }}
        placeholder="Nhập mã phòng"
        disabled={!!selectedRoom}
      />

      <CartoonInput
        label="Tên của bạn"
        data-testid="input-username-join"
        value={userName}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
        placeholder="Nhập tên"
      />

      <CartoonButton
        color="green"
        size="lg"
        className="mt-auto self-center"
        disabled={!canJoin}
        onClick={() => onJoin(targetRoomId, userName.trim())}
        data-testid="btn-confirm-join"
      >
        Vào phòng 🎮
      </CartoonButton>
    </motion.div>
  )
}

function CreateScreen({ onBack, onCreate }: { onBack: () => void; onCreate: (name: string) => void }) {
  const [userName, setUserName] = useState('')

  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col justify-center p-6 gap-4"
      data-testid="lobby-create"
    >
      <div className="flex items-center gap-3">
        <CartoonCircleButton color="gray" size="sm" onClick={onBack} aria-label="Quay lại">←</CartoonCircleButton>
        <h2 className="font-display text-xl">Tạo phòng mới</h2>
      </div>

      <CartoonInput
        label="Tên của bạn"
        data-testid="input-username-create"
        value={userName}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserName(e.target.value)}
        placeholder="Nhập tên"
      />

      <CartoonCard pastel="yellow" variant="sm" className="p-3">
        <p className="font-body text-sm text-[var(--c-gray-dark)]">
          💡 Mã phòng sẽ được tạo tự động sau khi bạn tạo phòng
        </p>
      </CartoonCard>

      <CartoonButton
        color="yellow"
        size="lg"
        className="self-center"
        disabled={!userName.trim()}
        onClick={() => onCreate(userName.trim())}
        data-testid="btn-confirm-create"
      >
        Tạo phòng 🏠
      </CartoonButton>
    </motion.div>
  )
}

function RoomListItem({
  room, selected, onSelect,
}: { room: RoomListItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={[
        'p-3 rounded-xl border-[3px] text-left transition-all w-full',
        selected
          ? 'border-[var(--c-blue-mid)] bg-[var(--c-sky-mist)] shadow-cartoon'
          : 'border-[var(--c-black)] bg-white hover:bg-[var(--c-sky-mist)]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-sm">{room.id}</div>
          <div className="font-body text-xs text-[var(--c-gray)]">Host: {room.hostName}</div>
        </div>
        <CartoonBadge color={room.playerCount >= 7 ? 'green' : 'blue'}>
          {room.playerCount}/11
        </CartoonBadge>
      </div>
    </button>
  )
}

// ─── Main Lobby ───────────────────────────────────────────────────────────────

export default function Lobby({ availableRooms, onJoinRoom, onCreateRoom, onRefreshRooms }: LobbyProps) {
  const [screen, setScreen] = useState<Screen>('menu')

  useEffect(() => {
    if (screen === 'join') {
      onRefreshRooms()
      const id = setInterval(onRefreshRooms, 3000)
      return () => clearInterval(id)
    }
  }, [screen, onRefreshRooms])

  return (
    <CartoonScreen data-testid="lobby" purpleBg>
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <MenuScreen
            onJoin={() => setScreen('join')}
            onCreate={() => setScreen('create')}
          />
        )}
        {screen === 'join' && (
          <JoinScreen
            availableRooms={availableRooms}
            onBack={() => setScreen('menu')}
            onJoin={onJoinRoom}
            onRefresh={onRefreshRooms}
          />
        )}
        {screen === 'create' && (
          <CreateScreen
            onBack={() => setScreen('menu')}
            onCreate={onCreateRoom}
          />
        )}
      </AnimatePresence>
    </CartoonScreen>
  )
}
