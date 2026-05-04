import { useState, useCallback } from 'react'
import Lobby from './Lobby'
import WaitingRoom from './WaitingRoom'
import GameBoard from './GameBoard'
import { useSocket } from '../hooks/useSocket'
import { getUserId } from '../utils/userId'
import { CartoonScreen, CartoonButton } from '@/components/cartoon'

export default function GameContainer() {
  const [forcelobby, setForceLobby] = useState(false)
  const { socket, isConnected, roomState, availableRooms, error, currentSocketId, joinRoom, startGame, listRooms, clearSession, addFakePlayers, updateProfile } = useSocket()
  
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

  const handleUpdateProfile = useCallback((name: string, avatarIndex: number, bgIndex: number) => {
    if (!roomState) return
    updateProfile(roomState.id, name, avatarIndex, bgIndex)
  }, [roomState, updateProfile])

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
      <CartoonScreen data-testid="connecting">
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
          <div className="text-6xl animate-bounce">🎴</div>
          <h2 className="font-display text-2xl">Đang kết nối...</h2>
          <p className="font-body text-sm text-[var(--c-gray)]">Vui lòng đợi</p>
          <img src="/cartoon/icons/Loading-Spinner.svg" alt="" className="w-12 h-12 spin-cartoon opacity-60" />
        </div>
      </CartoonScreen>
    )
  }

  if (error) {
    return (
      <CartoonScreen>
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="font-display text-2xl text-[var(--c-red)]">Lỗi kết nối</h2>
          <p className="font-body text-sm text-[var(--c-gray)]">{error}</p>
          <CartoonButton color="white" onClick={() => window.location.reload()}>
            🔄 Tải lại trang
          </CartoonButton>
        </div>
      </CartoonScreen>
    )
  }

  if (gameState === 'waiting' && roomState && isConnected) {
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
        onUpdateProfile={handleUpdateProfile}
      />
    )
  }

  if (gameState === 'playing' && roomState && isConnected) {
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
