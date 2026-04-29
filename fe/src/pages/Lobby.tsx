import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

export default function Lobby({ availableRooms, onJoinRoom, onCreateRoom, onRefreshRooms }: LobbyProps) {
  const [screen, setScreen] = useState<Screen>('menu')
  const [roomId, setRoomId] = useState('')
  const [userName, setUserName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null)

  // Auto-refresh rooms when on join screen
  useEffect(() => {
    if (screen === 'join') {
      onRefreshRooms()
      const interval = setInterval(onRefreshRooms, 3000) // Refresh every 3s
      return () => clearInterval(interval)
    }
  }, [screen, onRefreshRooms])

  const handleJoin = () => {
    if (!userName.trim()) return
    const targetRoomId = selectedRoom ? selectedRoom.id : roomId.trim()
    if (!targetRoomId) return
    onJoinRoom(targetRoomId, userName.trim())
  }

  const handleCreate = () => {
    if (!userName.trim()) return
    onCreateRoom(userName.trim())
  }

  return (
    <div className="h-screen bg-[#FAFAF8] flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-sm h-full bg-white">
        <AnimatePresence mode="wait">
          {screen === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="h-full flex flex-col justify-center p-8 gap-4"
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">🎴</div>
                <h1 className="text-2xl font-black text-gray-800">EmCoin</h1>
                <p className="text-sm text-gray-500 mt-1">Hành trình cảm xúc</p>
              </div>

              <button
                onClick={() => setScreen('join')}
                className="w-full py-4 rounded-2xl border-[3px] border-black bg-[#F0F5FF]
                           text-base font-bold hover:bg-[#E0E5FF] active:scale-[0.98] transition-all"
              >
                Tham gia phòng
              </button>

              <button
                onClick={() => setScreen('create')}
                className="w-full py-4 rounded-2xl border-[3px] border-black bg-[#FFF0F5]
                           text-base font-bold hover:bg-[#FFE0E5] active:scale-[0.98] transition-all"
              >
                Tạo phòng mới
              </button>
            </motion.div>
          )}

          {screen === 'join' && (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col p-8 gap-5 overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => { setScreen('menu'); setSelectedRoom(null); setRoomId(''); setUserName('') }}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center
                             hover:bg-gray-100 active:scale-95 transition-all"
                >
                  ←
                </button>
                <h2 className="text-xl font-black text-gray-800">Tham gia phòng</h2>
              </div>

              {/* Available rooms list */}
              {availableRooms.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-gray-600">Phòng đang chờ</label>
                    <button
                      onClick={onRefreshRooms}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                    >
                      🔄 Làm mới
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4">
                    {availableRooms.map(room => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`p-3 rounded-xl border-2 text-left transition-all
                          ${selectedRoom?.id === room.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-black bg-white hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-gray-800">{room.id}</div>
                            <div className="text-xs text-gray-500">Host: {room.hostName}</div>
                          </div>
                          <div className="text-xs font-bold text-gray-600">
                            {room.playerCount}/11
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableRooms.length === 0 && (
                <div className="bg-[#FFF9C4] rounded-xl p-4 border-2 border-black text-center">
                  <p className="text-xs text-gray-600">
                    Chưa có phòng nào đang chờ
                  </p>
                </div>
              )}

              {/* Manual room ID input */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Hoặc nhập mã phòng
                </label>
                <input
                  type="text"
                  value={selectedRoom ? selectedRoom.id : roomId}
                  onChange={e => { setRoomId(e.target.value); setSelectedRoom(null) }}
                  placeholder="Nhập mã phòng"
                  disabled={!!selectedRoom}
                  className="w-full px-4 py-3 rounded-xl border-2 border-black
                             focus:outline-none focus:ring-2 focus:ring-blue-300
                             disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Tên của bạn</label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Nhập tên"
                  className="w-full px-4 py-3 rounded-xl border-2 border-black
                             focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={!userName.trim() || (!selectedRoom && !roomId.trim())}
                className="w-full py-4 rounded-2xl border-[3px] border-black bg-[#6BCB77]
                           text-base font-bold hover:bg-[#5BB767] active:scale-[0.98]
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Vào phòng
              </button>
            </motion.div>
          )}

          {screen === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col justify-center p-8 gap-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setScreen('menu')}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center
                             hover:bg-gray-100 active:scale-95 transition-all"
                >
                  ←
                </button>
                <h2 className="text-xl font-black text-gray-800">Tạo phòng mới</h2>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Tên của bạn</label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Nhập tên"
                  className="w-full px-4 py-3 rounded-xl border-2 border-black
                             focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="bg-[#FFF9C4] rounded-xl p-4 border-2 border-black">
                <p className="text-xs text-gray-600">
                  💡 Mã phòng sẽ được tạo tự động sau khi bạn tạo phòng
                </p>
              </div>

              <button
                onClick={handleCreate}
                disabled={!userName.trim()}
                className="w-full py-4 rounded-2xl border-[3px] border-black bg-[#FFD93D]
                           text-base font-bold hover:bg-[#FFC91D] active:scale-[0.98]
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Tạo phòng
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
