import { useState, useCallback } from 'react'
import Lobby from './Lobby'
import WaitingRoom from './WaitingRoom'
import GameBoard from './GameBoard'
import { useSocket } from '../hooks/useSocket'
import { getUserId } from '../utils/userId'

export default function GameContainer() {
  const [forcelobby, setForceLobby] = useState(false)
  const { socket, isConnected, roomState, availableRooms, error, currentSocketId, joinRoom, startGame, listRooms, clearSession, addFakePlayers } = useSocket()
  
  const mySocketId = currentSocketId || socket?.id || ''
  const myUserId = getUserId()

  const handleJoinRoom = useCallback((roomId: string, userName: string) => {
    joinRoom(roomId, userName, false)
  }, [joinRoom])

  const handleCreateRoom = useCallback((userName: string) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    joinRoom(roomId, userName, true)
  }, [joinRoom])

  const handleStartGame = useCallback(() => {
    if (!roomState) return
    startGame(roomState.id)
  }, [roomState, startGame])

  const handleLeaveRoom = useCallback(() => {
    clearSession()
    setForceLobby(true)
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
  }, [clearSession, socket])

  const handleAddFakePlayers = useCallback(() => {
    if (!roomState) return
    addFakePlayers(roomState.id)
  }, [roomState, addFakePlayers])

  // Derive game state directly from roomState to avoid race conditions
  const gameState = !forcelobby && roomState
    ? roomState.status === 'waiting' ? 'waiting'
    : roomState.status === 'playing' ? 'playing'
    : 'lobby'
    : 'lobby'

  // Reset forceLobby when roomState is cleared
  if (forcelobby && !roomState) {
    setForceLobby(false)
  }

  if (!isConnected) {
    return (
      <div data-testid="connecting" className="h-screen bg-[#FAFAF8] flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-sm h-full bg-white p-8 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4 animate-bounce">🎴</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Đang kết nối...</h2>
          <p className="text-sm text-gray-600">Vui lòng đợi</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-[#FAFAF8] flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-sm h-full bg-white p-8 flex flex-col items-center justify-center text-center">
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

  if (gameState === 'waiting' && roomState && socket) {
    return (
      <WaitingRoom
        roomId={roomState.id}
        players={roomState.players}
        hostSocketId={roomState.host}
        mySocketId={mySocketId}
        myUserId={myUserId}
        onStartGame={handleStartGame}
        onLeave={handleLeaveRoom}
        onAddFakePlayers={handleAddFakePlayers}
      />
    )
  }

  if (gameState === 'playing' && roomState && socket) {
    return (
      <GameBoard
        roomId={roomState.id}
        roomState={roomState}
        mySocketId={mySocketId}
        myUserId={myUserId}
        onLeave={handleLeaveRoom}
      />
    )
  }

  return (
    <Lobby
      availableRooms={availableRooms}
      onJoinRoom={handleJoinRoom}
      onCreateRoom={handleCreateRoom}
      onRefreshRooms={listRooms}
    />
  )
}
