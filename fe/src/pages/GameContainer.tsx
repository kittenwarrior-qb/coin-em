import { EmcoinImage } from '@/components/cartoon/EmcoinImage'
import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import Lobby from './Lobby'
import WaitingRoom from './WaitingRoom'
import GameBoard from './GameBoard'
import { useSocket } from '../hooks/useSocket'
import { getUserId } from '../utils/userId'
import { CartoonScreen, CartoonButton } from '@/components/cartoon'
import { useAssetPreloader } from '@/hooks/useAssetPreloader'
import { AssetPreloaderScreen } from '@/components/AssetPreloaderScreen'
import { useConfirmedAction } from '@/features/game/controllers/useConfirmedAction'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'
import { setPwaRoomIdle } from '@/features/pwa/updateGate'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { themeLogo } from '@/components/cartoon/controlThemes'
import { RoomChatPanel } from '@/features/communication/RoomChatPanel'

export default function GameContainer() {
  const theme = useControlTheme()
  const [connectionDelayed, setConnectionDelayed] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [connectionAttempt, setConnectionAttempt] = useState(0)
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
    admissionAction,
    roomState,
    availableRooms,
    error,
    clearError,
    coinAction,
    retryPendingCoin,
    currentSocketId,
    joinRoom,
    startGame,
    listRooms,
    clearSession,
    addFakePlayers,
    updateProfile,
    updateRoundLimit,
    leaveRoom,
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
    confirmRoleRewards,
    shareReflection,
    emitCardPreview,
    emitSituationFanState,
    situationPreviewCard,
    situationFanState,
    submitVote,
    giveCoin,
  } = useSocket()
  const hasRoom = !!roomState
  useEffect(() => {
    setConnectionDelayed(false)
    if (isConnected || hasRoom) return
    const timer = setTimeout(() => setConnectionDelayed(true), 8000)
    return () => clearTimeout(timer)
  }, [isConnected, hasRoom, connectionAttempt])
  
  const mySocketId = currentSocketId || socket?.id || ''
  const myUserId = getUserId()
  const startScope = JSON.stringify([roomState?.id, myUserId, mySocketId, roomState?.status])
  const { pending: startPending, run: confirmStart, error: startError } = useConfirmedAction(startScope, isConnected && roomState?.status === 'waiting')
  const leaveScope = JSON.stringify([roomState?.id, myUserId, mySocketId])
  const { pending: leavePending, run: confirmLeave, error: leaveError } = useConfirmedAction(leaveScope, isConnected && !!roomState)
  usePendingNavigationGuard(startPending || leavePending || admissionAction === 'pending' || coinAction?.status === 'pending')
  useLayoutEffect(() => {
    setPwaRoomIdle(isConnected && !roomState && !admissionAction && !startPending && !leavePending && coinAction?.status !== 'pending')
    return () => setPwaRoomIdle(false)
  }, [isConnected, roomState, admissionAction, startPending, leavePending, coinAction?.status])

  const handleJoinRoom = useCallback((roomId: string, userName: string) => {
    setPwaRoomIdle(false)
    setForceLobby(false)
    return joinRoom(roomId, userName, false)
  }, [joinRoom])

  const handleCreateRoom = useCallback((userName: string, cardDecks?: { situation: Record<string, boolean>; emotion: Record<string, boolean> }) => {
    setPwaRoomIdle(false)
    setForceLobby(false)
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    // Creation and selected groups share the server's admission commit.
    if (cardDecks) {
      const situationGroups = Object.entries(cardDecks.situation).filter(([, v]) => v).map(([k]) => k)
      const emotionGroups   = Object.entries(cardDecks.emotion).filter(([, v]) => v).map(([k]) => k)
      // Fallback to defaults if nothing selected
      const finalSituation = situationGroups.length > 0 ? situationGroups : ['light', 'medium']
      const finalEmotion   = emotionGroups.length > 0 ? emotionGroups : ['basic']
      return joinRoom(roomId, userName, true, { situationGroups: finalSituation, emotionGroups: finalEmotion })
    } else {
      return joinRoom(roomId, userName, true)
    }
  }, [joinRoom])

  const handleStartGame = useCallback(async () => {
    if (!roomState || chatBusy) return
    await confirmStart(() => startGame(roomState.id))
  }, [roomState, startGame, confirmStart, chatBusy])

  const handleLeaveRoom = useCallback(async () => {
    if (chatBusy) return false
    const keepResumeSession = roomState?.status === 'playing'
    if (!roomState || !await confirmLeave(() => leaveRoom(roomState.id))) return false
    clearSession({ keepStorage: keepResumeSession })
    setForceLobby(true)
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
    return true
  }, [clearSession, leaveRoom, roomState, socket, confirmLeave, chatBusy])

  const handleAddFakePlayers = useCallback(() => {
    if (!roomState) return
    addFakePlayers(roomState.id)
  }, [roomState, addFakePlayers])

  const handleUpdateProfile = useCallback((name: string, avatarIndex: number, bgIndex: number) => {
    if (!roomState) return Promise.resolve(false)
    return updateProfile(roomState.id, name, avatarIndex, bgIndex)
  }, [roomState, updateProfile])

  // Derive game state directly from roomState to avoid race conditions
  const gameState = !forcelobby && roomState
    ? roomState.status === 'waiting' ? 'waiting'
    : roomState.status === 'playing' || roomState.status === 'ended' ? 'playing'
    : 'lobby'
    : 'lobby'

  useEffect(() => {
    if (forcelobby && !roomState) setForceLobby(false)
  }, [forcelobby, roomState])

  if (!isConnected && !roomState && !error) {
    return (
      <>
        {!splashGone && <AssetPreloaderScreen state={preloadState} onExited={handleSplashReady} onFullyGone={handleSplashFullyGone} />}
        <CartoonScreen data-testid="connecting">
          <div className="flex flex-col items-center justify-center flex-1 gap-6">
            <EmcoinImage
              src={themeLogo(theme)}
              alt="EmCoin"
              className="w-44 object-contain"
              style={{ animation: 'float-logo 2.4s ease-in-out infinite' }}
              draggable={false}
            />
            <EmcoinImage
              src="/emcoin/icons/orbit/spinner.svg"
              alt=""
              className="w-10 h-10 spin-cartoon opacity-70"
              draggable={false}
            />
            <div className="text-center">
              <h2 className="font-display text-2xl">{connectionDelayed ? 'Chưa kết nối được máy chủ' : 'Đang kết nối...'}</h2>
              <p role="status" className="font-body text-sm text-[var(--brand-muted-ink)] mt-1">
                {connectionDelayed ? 'Kiểm tra mạng hoặc thử lại. Bạn vẫn có thể đọc hướng dẫn.' : 'Vui lòng đợi một chút'}
              </p>
            </div>
            {connectionDelayed && <div className="flex flex-col items-center gap-4">
              <CartoonButton color="blue" onClick={() => { setConnectionAttempt(attempt => attempt + 1); socket?.connect() }}>
                Thử kết nối lại
              </CartoonButton>
              <a className="min-h-11 inline-flex items-center underline font-body text-[var(--brand-ink)]"
                href={import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? '/#/about/story' : '/about/story'}>Đọc hướng dẫn</a>
            </div>}
          </div>
        </CartoonScreen>
      </>
    )
  }

  if (error && !roomState && !admissionAction) {
    return (
      <CartoonScreen purpleBg>
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center gap-5">
          <div className="relative">
            <EmcoinImage
              src="/emcoin/icons/orbit/brokenHeart.svg"
              alt=""
              className="w-24 h-24 object-contain drop-shadow-lg"
              draggable={false}
            />
            <EmcoinImage
              src="/emcoin/icons/orbit/alert.svg"
              alt=""
              className="absolute -bottom-2 -right-2 w-9 h-9 drop-shadow"
              draggable={false}
            />
          </div>
          <div>
            <h2 className="font-display text-2xl text-white drop-shadow">Lỗi kết nối</h2>
            <p role="alert" className="font-body text-sm text-white/70 mt-1 max-w-[260px]">{error}</p>
          </div>
          <CartoonButton color="pink" onClick={() => window.location.reload()}>
            <span className="flex items-center gap-2">
              <EmcoinImage src="/emcoin/icons/orbit/repeat.svg" alt="" className="w-5 h-5 shrink-0" draggable={false} />
              Tải lại trang
            </span>
          </CartoonButton>
        </div>
      </CartoonScreen>
    )
  }

  const unresolvedCoin = coinAction && ['pending', 'uncertain'].includes(coinAction.status) && coinAction.intent.roomId === roomState?.id
  const coinReceiver = unresolvedCoin && roomState?.players.find(player => player.userId === coinAction.intent.receiverUserId)?.name
  const transportNotice = (!isConnected || error || startError || leaveError || unresolvedCoin) && (
    <aside data-ui-chrome="transport" className="relative z-50 flex flex-wrap items-center justify-between gap-3 bg-[var(--c-purple)] px-4 py-3 text-white font-body text-sm"
      aria-label="Trạng thái phiên chơi">
      <div className="min-w-0 basis-full">
        {!isConnected && <p role="status">Mất kết nối. Đang nối lại; thao tác mới chưa được gửi.</p>}
        {error && <p role="alert" className="break-words">{error}</p>}
        {startError && <p role="alert" className="break-words">{startError}</p>}
        {leaveError && <p role="alert" className="break-words">{leaveError}</p>}
        {unresolvedCoin && <p role="status" className="break-words">
          {coinAction.status === 'pending' ? 'Đang xác nhận' : 'Chờ xác nhận'}: {coinAction.intent.amount} Coin{' '}
          {{ red: 'Đỏ', green: 'Xanh', yellow: 'Vàng' }[coinAction.intent.coinType]} → {coinReceiver ?? 'người nhận đã chọn'}.
        </p>}
      </div>
      {unresolvedCoin && coinAction.status === 'uncertain' && <button type="button" disabled={!isConnected}
        onClick={() => { void retryPendingCoin() }}
        className="min-h-11 shrink-0 rounded-xl border border-white/60 px-3 font-display disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        Kiểm tra lượt trao
      </button>}
      {error && <button type="button" onClick={clearError}
        className="min-h-11 shrink-0 rounded-xl border border-white/60 px-3 font-display focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        Đóng thông báo
      </button>}
    </aside>
  )

  if (gameState === 'waiting' && roomState) {
    return (
      <>
        {!splashGone && <AssetPreloaderScreen state={preloadState} onExited={handleSplashReady} onFullyGone={handleSplashFullyGone} />}
        {transportNotice}
        <WaitingRoom
          roundLimit={roomState.roundLimit ?? null}
          onUpdateRoundLimit={limit => updateRoundLimit(roomState.id, limit)}
          isConnected={isConnected}
          startPending={startPending || chatBusy}
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
        {socket && <RoomChatPanel key={`${roomState.id}:${myUserId}`} socket={socket} roomId={roomState.id} userId={myUserId}
          connected={isConnected} players={roomState.players} onBusy={setChatBusy} />}
      </>
    )
  }

  if (gameState === 'playing' && roomState) {
    return (
      <>
      {transportNotice}
      <GameBoard
        key={roomState.id}
        roomId={roomState.id}
        roomState={roomState}
        mySocketId={mySocketId}
        myUserId={myUserId}
        isConnected={isConnected}
        leavePending={leavePending || chatBusy}
        onLeave={handleLeaveRoom}
        onUpdateProfile={handleUpdateProfile}
        nextTurn={nextTurn}
        prevTurn={prevTurn}
        nightAction={nightAction}
        emitSelectCard={selectCard}
        sendResponse={sendResponse}
        ntgVote={ntgVote}
        confirmRoleRewards={confirmRoleRewards}
        shareReflection={shareReflection}
        emitCardPreview={emitCardPreview}
        emitSituationFanState={emitSituationFanState}
        situationPreviewCard={situationPreviewCard}
        situationFanState={situationFanState}
        submitVote={submitVote}
        giveCoin={giveCoin}
      />
      {socket && roomState.status !== 'ended' && <RoomChatPanel key={`${roomState.id}:${myUserId}`} socket={socket} roomId={roomState.id} userId={myUserId}
        connected={isConnected} players={roomState.players} onBusy={setChatBusy} />}
      </>
    )
  }

  return (
    <>
      {admissionAction && error && <aside role="alert" className="break-words px-4 py-3 font-body text-sm">{error}</aside>}
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
