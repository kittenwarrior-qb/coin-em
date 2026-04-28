import { useState, useEffect } from 'react'
import Lobby from './Lobby'
import WaitingRoom from './WaitingRoom'
import GameBoard from './GameBoard'
import { useSocket } from '../hooks/useSocket'

type GameState = 'lobby' | 'waiting' | 'playing'

export default function GameContainer() {
  const [gameState, setGameState] = useState<GameState>('lobby')
  const { socket, isConnected, roomState, availableRooms, error, joinRoom, startGame, listRooms, clearSession } = useSocket()

  const handleJoinRoom = (roomId: string, userName: string) => {
    joinRoom(roomId, userName, false)
  }

  const handleCreateRoom = (userName: string) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    joinRoom(roomId, userName, true)
  }

  const handleStartGame = () => {
    if (!roomState) return
    startGame(roomState.id)
  }

  const handleLeaveRoom = () => {
    clearSession()
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
    setGameState('lobby')
  }

  // Update game state based on room state
  useEffect(() => {
    if (!roomState) return

    if (roomState.status === 'waiting') {
      setGameState('waiting')
    } else if (roomState.status === 'playing') {
      setGameState('playing')
    }
  }, [roomState])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto rounded-3xl border-4 border-black bg-white p-8 text-center">
          <div className="text-5xl mb-4 animate-bounce">🎴</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Đang kết nối...</h2>
          <p className="text-sm text-gray-600">Vui lòng đợi</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto rounded-3xl border-4 border-black bg-white p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Lỗi</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => { window.location.reload() }}
            className="px-6 py-3 rounded-2xl border-2 border-black bg-white
                       text-sm font-bold hover:bg-gray-100 active:scale-95 transition-all"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }

  if (gameState === 'lobby') {
    return (
      <Lobby
        availableRooms={availableRooms}
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
        onRefreshRooms={listRooms}
      />
    )
  }

  if (gameState === 'waiting' && roomState && socket) {
    return (
      <WaitingRoom
        roomId={roomState.id}
        players={roomState.players}
        hostSocketId={roomState.host}
        mySocketId={socket.id || ''}
        onStartGame={handleStartGame}
        onLeave={handleLeaveRoom}
      />
    )
  }

  if (gameState === 'playing') {
    return <GameBoard />
  }

  return null
}
