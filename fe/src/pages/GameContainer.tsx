import { useEffect, useState, useCallback } from 'react'
import Lobby from './Lobby'
import WaitingRoom from './WaitingRoom'
import GameBoard from './GameBoard'
import { useSocket } from '../hooks/useSocket'
import { getUserId } from '../utils/userId'
import { CartoonScreen, CartoonButton } from '@/components/cartoon'
import { useAssetPreloader } from '@/hooks/useAssetPreloader'
import { AssetPreloaderScreen } from '@/components/AssetPreloaderScreen'

export default function GameContainer() {
  const [forcelobby, setForceLobby] = useState(false)
  const preloadState = useAssetPreloader()
  const [splashGone, setSplashGone] = useState(false)
  const [lobbyKey, setLobbyKey] = useState(0)
  const [splashLogoRect, setSplashLogoRect] = useState<{ left: number; top: number; w: number; h: number } | null>(null)

  const [preloaderMounted, setPreloaderMounted] = useState(true)

  const handleSplashReady = useCallback((rect: { left: number; top: number; w: number; h: number }) => {
    setSplashLogoRect(rect)
    setSplashGone(true)
    setLobbyKey(k => k + 1)
  }, [])

  const handleSplashFullyGone = useCallback(() => {
    setPreloaderMounted(false)
  }, [])

  const {
    socket,
    isConnected,
    roomState,
    availableRooms,
    error,
    currentSocketId,
    joinRoom,
    startGame,
    listRooms,
    clearSession,
    addFakePlayers,
    updateProfile,
    leaveRoom,
    updateRoomSettings,
    setDebugRolePreference,
    resumeCandidates,
    resumeRoom,
    dismissResumeCandidate,
    nextTurn,
    prevTurn,
    nightAction,
    selectCard,
    sendResponse,
    ntgVote,
    shareReflection,
    submitVote,
  } = useSocket()
  
  const mySocketId = currentSocketId || socket?.id || ''
  const myUserId = getUserId()

  const handleJoinRoom = useCallback((roomId: string, userName: string) => {
    setForceLobby(false)
    joinRoom(roomId, userName, false)
  }, [joinRoom])

  const handleCreateRoom = useCallback((userName: string, cardDecks?: { situation: Record<string, boolean>; emotion: Record<string, boolean> }) => {
    setForceLobby(false)
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    joinRoom(roomId, userName, true)
    // Send card deck settings after a short delay to ensure room is created
    if (cardDecks) {
      const situationGroups = Object.entries(cardDecks.situation).filter(([, v]) => v).map(([k]) => k)
      const emotionGroups   = Object.entries(cardDecks.emotion).filter(([, v]) => v).map(([k]) => k)
      // Fallback to defaults if nothing selected
      const finalSituation = situationGroups.length > 0 ? situationGroups : ['light', 'medium']
      const finalEmotion   = emotionGroups.length > 0 ? emotionGroups : ['basic']
      setTimeout(() => updateRoomSettings(roomId, finalSituation, finalEmotion), 500)
    }
  }, [joinRoom, updateRoomSettings])

  const handleStartGame = useCallback(() => {
    if (!roomState) return
    startGame(roomState.id)
  }, [roomState, startGame])

  const handleLeaveRoom = useCallback(() => {
    const keepResumeSession = roomState?.status === 'playing'
    if (roomState) leaveRoom(roomState.id)
    clearSession({ keepStorage: keepResumeSession })
    setForceLobby(true)
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
  }, [clearSession, leaveRoom, roomState, socket])

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

  useEffect(() => {
    if (forcelobby && !roomState) setForceLobby(false)
  }, [forcelobby, roomState])

  if (!isConnected) {
    return (
      <>
        {!splashGone && <AssetPreloaderScreen state={preloadState} onExited={handleSplashReady} onFullyGone={handleSplashFullyGone} />}
        <CartoonScreen data-testid="connecting">
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-4">
            <div className="text-6xl animate-bounce">🎴</div>
            <h2 className="font-display text-2xl">Đang kết nối...</h2>
            <p className="font-body text-sm text-[var(--c-gray)]">Vui lòng đợi</p>
            <img src="/cartoon/icons/Loading-Spinner.svg" alt="" className="w-12 h-12 spin-cartoon opacity-60" />
          </div>
        </CartoonScreen>
      </>
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
      <>
        {!splashGone && <AssetPreloaderScreen state={preloadState} onExited={handleSplashReady} onFullyGone={handleSplashFullyGone} />}
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
          onSetDebugRolePreference={(targetUserId, role) => setDebugRolePreference(roomState.id, targetUserId, role)}
          debugRolePickerEnabled={roomState.debugRolePickerEnabled}
        />
      </>
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
        onUpdateProfile={handleUpdateProfile}
        nextTurn={nextTurn}
        prevTurn={prevTurn}
        nightAction={nightAction}
        emitSelectCard={selectCard}
        sendResponse={sendResponse}
        ntgVote={ntgVote}
        shareReflection={shareReflection}
        submitVote={submitVote}
      />
    )
  }

  return (
    <>
      {preloaderMounted && <AssetPreloaderScreen state={preloadState} onExited={handleSplashReady} onFullyGone={handleSplashFullyGone} />}
      <div style={splashGone ? undefined : { visibility: 'hidden', pointerEvents: 'none' }}>
        <Lobby
          key={lobbyKey}
          ready={splashGone}
          splashLogoRect={splashLogoRect}
          bgDone={preloadState.bgDone}
          bgLoaded={preloadState.bgLoaded}
          bgTotal={preloadState.bgTotal}
          availableRooms={availableRooms}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onRefreshRooms={listRooms}
          resumeCandidates={resumeCandidates}
          onResumeRoom={resumeRoom}
          onDismissResume={dismissResumeCandidate}
        />
      </div>
    </>
  )
}
