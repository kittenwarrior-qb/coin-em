import { useEffect, useRef, useState, useCallback } from 'react'
import { socketDiagnostic } from '@/features/transport/socketDiagnostics'
import { io, Socket } from 'socket.io-client'
import { getDeviceId, getUserId } from '../utils/userId'
import { useGameStore } from '../stores/gameStore'
import type { CardData, GamePhase } from '../stores/types'
import type { PhaseView } from '@/components/game/types'
import { cardIdentity } from '@/features/game/selectors/cardIdentity'
import { subscribeNativeForeground } from '@/features/platform/nativeEvents'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? window.location.origin
const SESSION_KEY = 'emcoin_session'
const COIN_UNCERTAIN_MESSAGE = 'Chưa xác nhận được lượt trao Coin. Thử lại đúng lượt trao này sẽ không trừ Coin hai lần.'
const RESUME_KEY = 'emcoin_resume_rooms'

interface Player {
  socketId: string
  userId?: string
  deviceId?: string
  name: string
  isFake?: boolean
  role?: string
  isNarrator?: boolean
  isSender?: boolean
  isDisconnected?: boolean
  disconnectedAt?: number | null
  debugPreferredRole?: string
  avatarIndex?: number
  bgIndex?: number
}

interface RoomState {
  catalogVersion?: string
  roundLimit?: number | null
  phaseView?: PhaseView | null
  selfcareActor?: string | null
  revision?: number
  phaseInstance?: string
  rulesVersion?: string
  coinCycle?: { version: string; closed: boolean; received: Record<string, { red: number; green: number; yellow: number }>; history: Array<{ round: number; received: Record<string, { red: number; green: number; yellow: number }> }> }
  id: string
  host: string
  players: Player[]
  status: 'waiting' | 'playing' | 'ended'
  phase?: GamePhase
  turn?: number
  currentRound: number
  totalRounds?: number
  currentNTG: string | null
  currentNarrator?: string | null
  mutedPlayer?: string | null
  selectedCard?: CardData | null
  votes?: Record<string, string>
  ntgVotes?: Record<string, string[]>
  gameLog?: GameLogEntry[]
  nightActions?: {
    silenced: boolean
    healed: boolean
    cardSelected: boolean
  }
  settings?: {
    situationGroups: ('light' | 'medium' | 'sensitive')[]
    emotionGroups: ('basic' | 'light' | 'strong' | 'advanced')[]
  }
  debugRolePickerEnabled?: boolean
  resumeExpiresAt?: number | null
}

interface GameLogEntry {
  type: string
  actorId: string
  targetId?: string
  data?: {
    phase?: GamePhase
    round?: number
    card?: CardData
    message?: string
    bonus?: number
    amount?: number
    requestId?: string
    receiverGainsGreen?: number
    coinType?: string
    silencerFound?: boolean
    silencerId?: string
    silencerYellowBonus?: number
    greenGuessBonus?: number
    correctGuesserIds?: string[]
  }
  timestamp: number
}

interface RoomActionAck {
  votedCount?: number
  success: boolean
  data?: RoomState
  message?: string
  error?: string
  phase?: GamePhase
  previousPhase?: GamePhase
  session?: { roomId: string; userId: string; token: string; generation: number }
}

type SocketAckError = Error | null

interface PendingCoin {
  version: 'coin-request/v1'
  roomId: string
  actorId: string
  receiverUserId: string
  receiverSocketId: string
  coinType: 'red' | 'green' | 'yellow'
  amount: number
  round: number
  requestId: string
}

interface CoinActionState {
  status: 'pending' | 'uncertain' | 'confirmed' | 'rejected'
  intent: PendingCoin
}

function validPendingCoin(value: unknown, session: Session): value is PendingCoin {
  if (!value || typeof value !== 'object') return false
  const item = value as PendingCoin
  return item.version === 'coin-request/v1' && item.roomId === session.roomId && item.actorId === session.userId &&
    typeof item.receiverUserId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.receiverUserId) &&
    typeof item.receiverSocketId === 'string' && item.receiverSocketId.length > 0 && item.receiverSocketId.length <= 128 &&
    ['red', 'green', 'yellow'].includes(item.coinType) && Number.isSafeInteger(item.amount) && item.amount > 0 && item.amount <= 20 &&
    Number.isSafeInteger(item.round) && item.round > 0 && typeof item.requestId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.requestId)
}

interface Session {
  roomId: string
  userName: string
  userId: string
  deviceId: string
  oldSocketId?: string
  sessionToken?: string
  status?: RoomState['status']
  pendingCoin?: PendingCoin
}

export interface ResumeCandidate {
  roomId: string
  userName: string
  userId: string
  deviceId: string
  role?: string
  round?: number
  totalRounds?: number
  phase?: GamePhase
  status?: RoomState['status']
  updatedAt: number
  expiresAt?: number | null
  sessionToken?: string
}

interface RoomListItem {
  id: string
  playerCount: number
  hostName: string
}

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  admissionAction: 'pending' | 'uncertain' | 'rejected' | null
  roomState: RoomState | null
  availableRooms: RoomListItem[]
  error: string | null
  clearError: () => void
  coinAction: CoinActionState | null
  retryPendingCoin: () => Promise<boolean>
  currentSocketId: string
  joinRoom: (roomId: string, name: string, createIfMissing?: boolean, settings?: { situationGroups: string[]; emotionGroups: string[] }) => Promise<boolean>
  startGame: (roomId: string) => Promise<boolean>
  getRoomState: (roomId: string) => void
  listRooms: () => void
  clearSession: (options?: { keepStorage?: boolean }) => void
  leaveRoom: (roomId: string) => Promise<boolean>
  nightAction: (roomId: string, action: string, targetSocketId?: string, cardData?: object) => Promise<boolean>
  nextPhase: (roomId: string) => void
  giveCoin: (roomId: string, receiverSocketId: string, coinType: string, amount?: number) => Promise<boolean>
  submitVote: (roomId: string, suspectSocketId: string) => Promise<boolean>
  endGame: (roomId: string) => Promise<boolean>
  addFakePlayers: (roomId: string) => void
  nextTurn: (roomId: string) => Promise<boolean>
  prevTurn: (roomId: string) => Promise<boolean>
  selectCard: (roomId: string, card: object, type?: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD') => Promise<boolean>
  sendResponse: (roomId: string, message: string) => Promise<boolean>
  ntgVote: (roomId: string, targetSocketId: string | string[]) => Promise<boolean>
  confirmRoleRewards: (roomId: string, targetSocketIds: string[]) => Promise<boolean>
  shareReflection: (roomId: string, message: string) => Promise<boolean>
  updateProfile: (roomId: string, name: string, avatarIndex: number, bgIndex: number) => Promise<boolean>
  updateRoomSettings: (roomId: string, situationGroups: string[], emotionGroups: string[]) => Promise<boolean>
  updateRoundLimit: (roomId: string, limit: number | null) => Promise<boolean>
  setDebugRolePreference: (roomId: string, targetUserId: string, role: string) => void
  resumeCandidates: ResumeCandidate[]
  resumeRoom: (candidate: ResumeCandidate) => Promise<boolean>
  dismissResumeCandidate: (roomId: string) => void
  emitCardPreview: (roomId: string, card: CardData | null) => void
  emitSituationFanState: (roomId: string, activePosition: number, cards?: CardData[]) => void
  situationPreviewCard: CardData | null
  situationFanState: { cards: CardData[]; activePosition: number } | null
}

// Session helpers
function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function loadSession(): Session | null {
  try {
    const data = localStorage.getItem(SESSION_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function clearSessionStorage() {
  localStorage.removeItem(SESSION_KEY)
}

function loadResumeCandidates(): ResumeCandidate[] {
  try {
    const data = localStorage.getItem(RESUME_KEY)
    const parsed = data ? JSON.parse(data) : []
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed.filter((item) =>
      item.status === 'playing' && typeof item.sessionToken === 'string' &&
      (!item.expiresAt || item.expiresAt > now)
    )
  } catch {
    return []
  }
}

function saveResumeCandidates(candidates: ResumeCandidate[]) {
  localStorage.setItem(RESUME_KEY, JSON.stringify(candidates))
}

function upsertResumeCandidate(candidate: ResumeCandidate): ResumeCandidate[] {
  const candidates = loadResumeCandidates()
  const next = [candidate, ...candidates.filter(c => c.roomId !== candidate.roomId)]
  saveResumeCandidates(next)
  return next
}

function removeResumeCandidate(roomId: string): ResumeCandidate[] {
  const next = loadResumeCandidates().filter(c => c.roomId !== roomId)
  saveResumeCandidates(next)
  return next
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [availableRooms, setAvailableRooms] = useState<RoomListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [coinAction, setCoinAction] = useState<CoinActionState | null>(() => {
    const session = loadSession()
    return session?.sessionToken && validPendingCoin(session.pendingCoin, session)
      ? { status: 'uncertain', intent: session.pendingCoin } : null
  })
  const [resumeCandidates, setResumeCandidates] = useState<ResumeCandidate[]>(() => loadResumeCandidates())
  const reconnectAttempted = useRef(false)
  const reconnectPending = useRef(false)
  const admissionRequest = useRef<{ socketId?: string } | null>(null)
  const admissionPersistenceError = useRef<string | null>(null)
  const [admissionAction, setAdmissionAction] = useState<'pending' | 'uncertain' | 'rejected' | null>(null)
  // A confirmed intentional exit keeps recovery credentials, not an automatic re-entry.
  const intentionallyDetached = useRef(false)
  const replacedSession = useRef(false)
  const roomStateRef = useRef<RoomState | null>(null)
  const admittedRoomRef = useRef<string | null>(null)
  const [currentSocketId, setCurrentSocketId] = useState<string>('')
  const [situationPreviewCard, setSituationPreviewCard] = useState<CardData | null>(null)
  const [situationFanState, setSituationFanState] = useState<{ cards: CardData[]; activePosition: number } | null>(null)
  const situationFanCardsRef = useRef<CardData[]>([])

  const persistResumeFromState = useCallback((state: RoomState) => {
    try {
    const userId = getUserId()
    const deviceId = getDeviceId()
    const session = loadSession()
    if (session?.roomId === state.id && session.sessionToken) saveSession({ ...session, status: state.status })
    if (state.status !== 'playing') {
      setResumeCandidates(removeResumeCandidate(state.id))
      return
    }

    const player = state.players.find(p => p.userId === userId)
    if (!player) return
    if (session?.roomId !== state.id || !session.sessionToken) return

    const candidate: ResumeCandidate = {
      roomId: state.id,
      userName: player.name,
      userId: player.userId ?? userId,
      deviceId,
      role: player.role,
      round: state.currentRound,
      totalRounds: state.totalRounds,
      phase: state.phase,
      status: state.status,
      updatedAt: Date.now(),
      expiresAt: state.resumeExpiresAt ?? null,
      sessionToken: session.sessionToken,
    }

    setResumeCandidates(upsertResumeCandidate(candidate))
    } catch {
      setError('Không lưu được dữ liệu khôi phục phiên trên thiết bị. Trạng thái phòng vẫn được giữ; tránh tải lại trang lúc này.')
    }
  }, [])

  const acceptAdmission = useCallback((roomId: string, name: string, ack: RoomActionAck) => {
    reconnectPending.current = false
    if (!ack.success || !ack.session || ack.session.roomId !== roomId) {
      const messages: Record<string, string> = {
        INVALID_SESSION: 'Phiên không hợp lệ hoặc đã hết hạn. Không thể khôi phục chỗ chơi này.',
        ALREADY_SEATED: 'Bạn đang có một phiên chơi. Hãy rời phòng trước khi vào phòng khác.',
        room_not_found: 'Phòng không còn tồn tại.',
        room_full: 'Phòng đã đủ 10 người.',
        game_in_progress: 'Trò chơi đã bắt đầu, không thể tham gia mới.',
        room_already_exists: 'Mã phòng đã được sử dụng. Hãy tạo phòng với mã khác.',
        invalid_settings: 'Nhóm thẻ đã chọn không hợp lệ. Phòng chưa được tạo.',
      }
      setError(messages[ack.error ?? ''] ?? ack.message ?? ack.error ?? 'Không thể nối phiên chơi.')
      return false
    }
    const previousSession = loadSession()
    const sameSeat = previousSession?.roomId === roomId && previousSession.userId === ack.session.userId &&
      previousSession.sessionToken === ack.session.token
    admittedRoomRef.current = roomId
    intentionallyDetached.current = false
    replacedSession.current = false
    try {
    saveSession({ roomId, userName: name, userId: ack.session.userId, deviceId: getDeviceId(),
      sessionToken: ack.session.token, oldSocketId: socketRef.current?.id,
      pendingCoin: sameSeat ? previousSession.pendingCoin : undefined })
    admissionPersistenceError.current = null
    } catch {
      admissionPersistenceError.current = 'Không lưu được phiên chơi trên thiết bị. Tránh tải lại trang lúc này; lượt trao Coin mới chưa được gửi.'
      setError(admissionPersistenceError.current)
      return false
    }
    if (sameSeat && validPendingCoin(previousSession.pendingCoin, previousSession)) {
      setCoinAction({ status: 'uncertain', intent: previousSession.pendingCoin })
    } else setCoinAction(null)
    return true
  }, [])

  const applyRoomState = useCallback((state: RoomState, resetError = false): boolean => {
    if (!state || typeof state.id !== 'string' || !Array.isArray(state.players) ||
      !['waiting', 'playing', 'ended'].includes(state.status) ||
      (state.revision !== undefined && (!Number.isSafeInteger(state.revision) || state.revision < 0)) ||
      (admittedRoomRef.current && admittedRoomRef.current !== state.id)) return false
    const previous = roomStateRef.current
    if (previous?.id === state.id && previous.status === 'ended' && state.status !== 'ended') return false
    if (previous?.id === state.id && previous.revision !== undefined &&
      (state.revision === undefined || state.revision < previous.revision)) return false
    if (resetError) setError(admissionPersistenceError.current)
    roomStateRef.current = state
    setRoomState(state)
    persistResumeFromState(state)
    if (state.phase) useGameStore.getState().setGameStep(state.phase)
    return true
  }, [persistResumeFromState])

  const sendAdmission = useCallback((event: 'join_room' | 'reconnect_room', payload: {
    roomId: string; name: string; userId: string; deviceId: string; sessionToken?: string;
    oldSocketId?: string; createIfMissing?: boolean; settings?: { situationGroups: string[]; emotionGroups: string[] }
  }): Promise<boolean> => {
    const socket = socketRef.current
    if (!socket?.connected) { setAdmissionAction('rejected'); setError('Chưa kết nối. Thao tác chưa được gửi.'); return Promise.resolve(false) }
    if (admissionRequest.current?.socketId === socket.id) return Promise.resolve(false)
    const ownerToken = loadSession()?.sessionToken
    const request = { socketId: socket.id }
    admissionRequest.current = request
    reconnectPending.current = event === 'reconnect_room'
    setAdmissionAction('pending')
    setError(null)
    return new Promise(resolve => {
      const onAck = (error: SocketAckError, ack?: RoomActionAck) => {
        if (!socket.connected || socketRef.current !== socket || socket.id !== request.socketId || admissionRequest.current !== request || loadSession()?.sessionToken !== ownerToken) { resolve(false); return }
        if (error || typeof ack?.success !== 'boolean' || (ack.success && (!ack.session || ack.session.roomId !== payload.roomId || ack.session.userId !== payload.userId || typeof ack.session.token !== 'string' || !ack.session.token || !Number.isSafeInteger(ack.session.generation) || ack.session.generation < 1 || (payload.sessionToken !== undefined && ack.session.token !== payload.sessionToken)))) {
          setAdmissionAction('uncertain')
          setError('Chưa xác nhận được việc vào phòng. Không tạo hoặc gửi lại phòng khác; chờ kết nối và trạng thái từ server.')
          resolve(false); return
        }
        admissionRequest.current = null
        reconnectPending.current = false
        const accepted = acceptAdmission(payload.roomId, payload.name, ack)
        setAdmissionAction(accepted ? null : 'rejected')
        resolve(accepted)
      }
      try { socket.timeout(5000).emit(event, payload, onAck) }
      catch { onAck(new Error('Admission transport failed')) }
    })
  }, [acceptAdmission])

  useEffect(() => {
    // Initialize socket
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket
    const detachNative = subscribeNativeForeground(() => {
      if (socketRef.current !== socket || replacedSession.current || intentionallyDetached.current || admissionRequest.current) return
      const session = loadSession()
      if (socket.connected) {
        if (session?.sessionToken && roomStateRef.current?.id === session.roomId) {
          socket.emit('get_room_state', { roomId: session.roomId })
        }
      } else socket.connect() // Existing connect handler owns token validation.
    })
    
    // Set initial socket ID if available
    if (socket.id) {
      socketDiagnostic('connect')
      setCurrentSocketId(socket.id)
    }

    // Connection events
    socket.on('connect', () => {
      socketDiagnostic('connect')
      setIsConnected(true)
      setCurrentSocketId(socket.id || '')
      setError(null)

      // Preserve active gameplay across transient network reconnects.
      const activeRoom = roomStateRef.current
      const session = loadSession()
      if (!intentionallyDetached.current && session?.sessionToken && (activeRoom || session.status === 'playing' || session.status === 'ended')) {
        void sendAdmission('reconnect_room', {
          roomId: session.roomId,
          userId: session.userId,
          deviceId: session.deviceId,
          oldSocketId: session.oldSocketId,
          name: session.userName,
          sessionToken: session.sessionToken,
        })
      }
    })

    socket.on('disconnect', () => {
      socketDiagnostic('disconnect')
      setIsConnected(false)
    })

    socket.on('session_replaced', () => {
      replacedSession.current = true
      admissionRequest.current = null
      setAdmissionAction(null)
      reconnectPending.current = false
      roomStateRef.current = null
      setRoomState(null)
      setError('Phiên chơi đã chuyển sang tab khác. Tab này đã ngắt kết nối.')
      socket.disconnect()
    })

    // Room events
    socket.on('room_state', (state: RoomState) => {
      socketDiagnostic('room_state')
      reconnectPending.current = false
      if (!applyRoomState(state, true)) return
      
    })

    socket.on('player_joined', ({ players, room }: { socketId: string; name: string; players: Player[]; room?: RoomState }) => {
      socketDiagnostic('player_joined')
      if (room) { applyRoomState(room); return }
      const previous = roomStateRef.current
      if (previous && previous.revision === undefined) applyRoomState({ ...previous, players })
    })

    socket.on('player_reconnected', ({ room }: { socketId: string; name: string; players: Player[]; room: RoomState }) => {
      socketDiagnostic('player_reconnected')
      if (!applyRoomState(room)) return
    })

    socket.on('players_disconnected', ({ room }: { players: Array<{ userId: string; name: string; disconnectedAt?: number | null }>; room: RoomState }) => {
      socketDiagnostic('players_disconnected')
      if (!applyRoomState(room)) return
    })

    socket.on('player_left', ({ players, host, room }: { socketId: string; players: Player[]; host: string; room?: RoomState }) => {
      socketDiagnostic('player_left')
      if (room) { applyRoomState(room); return }
      const previous = roomStateRef.current
      if (previous && previous.revision === undefined) applyRoomState({ ...previous, players, host })
    })

    socket.on('game_started', (state: RoomState) => {
      socketDiagnostic('game_started')
      if (!applyRoomState(state)) return
      
    })

    socket.on('night_action_completed', ({ room }: { action: string; room: RoomState }) => {
      socketDiagnostic('night_action_completed')
      if (!applyRoomState(room)) return
    })

    socket.on('phase_changed', (state: RoomState) => {
      socketDiagnostic('phase_changed')
      if (!applyRoomState(state)) return
      
    })

    socket.on('turn_changed', (state: RoomState) => {
      socketDiagnostic('turn_changed')
      if (!applyRoomState(state)) return
      
    })

    socket.on('coin_given', ({ room }: { giver: string; receiver: string; coinType: string; room: RoomState }) => {
      socketDiagnostic('coin_given')
      if (!applyRoomState(room)) return
    })

    socket.on('card_selected', ({ room }: { actorId: string; card: object; type: string; room: RoomState }) => {
      socketDiagnostic('card_selected')
      if (!applyRoomState(room)) return
    })

    socket.on('response_received', ({ room }: { actorId: string; actorName: string; message: string; room: RoomState }) => {
      socketDiagnostic('response_received')
      if (!applyRoomState(room)) return
    })

    socket.on('ntg_vote_cast', ({ room }: { ntgId: string; votedId: string; votedName: string; bonus: number; room: RoomState }) => {
      socketDiagnostic('ntg_vote_cast')
      if (!applyRoomState(room)) return
    })

    socket.on('role_rewards_confirmed', ({ room }: { rewards: Array<{ name: string; bonus: number }>; room: RoomState }) => {
      socketDiagnostic('role_rewards_confirmed')
      if (!applyRoomState(room)) return
    })

    socket.on('reflection_shared', ({ room }: { ntgId: string; ntgName: string; message: string; bonus: number; room: RoomState }) => {
      socketDiagnostic('reflection_shared')
      if (!applyRoomState(room)) return
    })

    socket.on('vote_submitted', ({ room }: { room?: RoomState } = {}) => {
      socketDiagnostic('vote_submitted')
      if (room) {
        if (!applyRoomState(room)) return
      }
    })

    socket.on('voting_complete', ({ votes, room }: { votes: Record<string, string>; room?: RoomState }) => {
      socketDiagnostic('voting_complete')
      if (room) { applyRoomState(room); return }
      const current = roomStateRef.current
      if (current && current.revision === undefined) {
        const next = { ...current, votes }
        if (!applyRoomState(next)) return
      }
    })

    socket.on('vote_updated', ({ room }: { room: RoomState }) => {
      socketDiagnostic('vote_updated')
      if (!applyRoomState(room)) return
    })

    socket.on('game_ended', (room: RoomState) => {
      if (!room.id || room.status !== 'ended') return
      if (!applyRoomState(room)) return
    })

    socket.on('rooms_list', (rooms: RoomListItem[]) => {
      socketDiagnostic('rooms_list')
      setAvailableRooms(rooms)
    })

    socket.on('card_preview', ({ card }: { card: CardData | null }) => {
      setSituationPreviewCard(card)
    })

    socket.on('situation_fan_state', ({ cards, activePosition }: { cards?: CardData[]; activePosition: number }) => {
      if (cards && cards.length > 0) situationFanCardsRef.current = cards
      const resolvedCards = situationFanCardsRef.current
      if (activePosition < 0) {
        setSituationFanState(null)
      } else if (resolvedCards.length > 0) {
        setSituationFanState({ cards: resolvedCards, activePosition })
      }
    })

    socket.on('room_closed', (payload: unknown) => {
      if (!payload || typeof payload !== 'object' || !('roomId' in payload) ||
          typeof payload.roomId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(payload.roomId)) return
      const roomId = payload.roomId
      setResumeCandidates(removeResumeCandidate(roomId))
      // Stale membership/replayed terminal events must not clear a newer room.
      if (roomStateRef.current?.id !== roomId) return
      socketDiagnostic('room_closed')
      if (loadSession()?.roomId === roomId) clearSessionStorage()
      roomStateRef.current = null
      setRoomState(null)
      
      // Auto-refresh room list to remove closed room from UI
      if (socketRef.current) {
        socketRef.current.emit('list_rooms')
      }
    })

    socket.on('error', (err: { code: string; message: string }) => {
      socketDiagnostic('error', 'error')
      
      // Handle rate limit silently - the delay in confirmPendingNtgRewards should prevent this
      if (err.code === 'RATE_LIMITED') {
        socketDiagnostic('error', 'warn')
        return
      }
      
      // If error arrives while reconnect is pending
      if (reconnectPending.current) {
        reconnectPending.current = false
        const session = loadSession()
        // player_not_found: room exists but player was removed (e.g. server restart)
        // → try to rejoin the room instead of going to lobby
        if (err.code === 'player_not_found' && session) {
          socketDiagnostic('join_room')
          socket.emit('join_room', {
            roomId: session.roomId,
            name: session.userName,
            userId: session.userId,
            deviceId: session.deviceId,
            createIfMissing: false,
          })
          return
        }
        // Any other error → clear session and go back to lobby silently
        clearSessionStorage()
        reconnectAttempted.current = false
        return
      }
      // room_not_found: clear session, không set error — GameContainer sẽ tự về Lobby
      if (err.code === 'room_not_found') {
        const session = loadSession()
        if (session) setResumeCandidates(removeResumeCandidate(session.roomId))
        clearSessionStorage()
        reconnectAttempted.current = false
        return
      }
      setError(err.message ?? JSON.stringify(err))
    })

    // Cleanup
    return () => {
      detachNative()
      admissionRequest.current = null
      socket.disconnect()
    }
  }, [applyRoomState, sendAdmission])

  const joinRoom = useCallback((roomId: string, name: string, createIfMissing = false, settings?: { situationGroups: string[]; emotionGroups: string[] }) => {
    const userId = getUserId()
    const deviceId = getDeviceId()
    const session = loadSession()
    return sendAdmission('join_room', { roomId, name, userId, deviceId, createIfMissing,
      sessionToken: session?.roomId === roomId ? session.sessionToken : undefined,
      ...(settings ? { settings: { situationGroups: [...settings.situationGroups], emotionGroups: [...settings.emotionGroups] } } : {}),
    })
  }, [sendAdmission])

  const getRoomState = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('get_room_state', { roomId })
  }, [])

  const listRooms = useCallback(() => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('list_rooms')
  }, [])

  const phaseRequests = useRef(new Map<string, { context: string; uncertain: boolean }>())
  const lastNavigationSend = useRef(0)
  const sendPhaseAction = useCallback((event: 'night_action' | 'select_card' | 'submit_vote' | 'next_turn' | 'prev_turn' | 'send_response' | 'ntg_vote' | 'share_reflection' | 'confirm_role_rewards' | 'start_game' | 'end_game' | 'update_profile' | 'update_room_settings', roomId: string, payload: object, expectedCount?: number): Promise<boolean> => {
    const socket = socketRef.current, state = roomStateRef.current
    if (!socket?.connected) { setError('Mất kết nối. Thao tác chưa được gửi.'); return Promise.resolve(false) }
    const profile = event === 'update_profile'
    const settings = event === 'update_room_settings'
    if (!state || state.id !== roomId || (profile ? !['waiting', 'playing'].includes(state.status) : state.status !== (event === 'start_game' || settings ? 'waiting' : 'playing'))) { setError('Chưa có phiên chơi đã xác nhận. Thao tác chưa được gửi.'); return Promise.resolve(false) }
    const navigation = event === 'next_turn' || event === 'prev_turn'
    const lifecycle = event === 'start_game' || event === 'end_game'
    const transition = navigation || lifecycle || profile || settings
    if (transition && (state.revision === undefined || !Number.isSafeInteger(state.revision))) { setError('Chưa có revision đã xác nhận. Thao tác chưa được gửi.'); return Promise.resolve(false) }
    const key = navigation ? 'navigation' : event
    const sendingSocketId = socket.id
    const context = `${roomId}:${state.currentRound}:${state.phaseInstance ?? state.phase}:${socket.id}`
    if (phaseRequests.current.get(key)?.context === context) return Promise.resolve(false)
    if (navigation && Date.now() - lastNavigationSend.current < 800) return Promise.resolve(false)
    const ownerToken = loadSession()?.sessionToken
    const request = { context, uncertain: false }
    phaseRequests.current.set(key, request)
    if (navigation) lastNavigationSend.current = Date.now()
    return new Promise(resolve => {
      const onAck = (err: SocketAckError, ack?: RoomActionAck) => {
        const current = roomStateRef.current
        const freshContext = current && `${current.id}:${current.currentRound}:${current.phaseInstance ?? current.phase}:${socketRef.current?.id}`
        if (!socketRef.current?.connected || socketRef.current !== socket || socket.id !== sendingSocketId || current?.id !== roomId || phaseRequests.current.get(key) !== request || (!transition && (current.status !== 'playing' || freshContext !== context)) || loadSession()?.sessionToken !== ownerToken) { resolve(false); return }
        if (err || typeof ack?.success !== 'boolean') {
          request.uncertain = true
          setError('Chưa xác nhận được thao tác. Không gửi lại trong bước này; chờ trạng thái từ server.')
          resolve(false); return
        }
        const snapshot = ack.data
        if (ack.success && event === 'ntg_vote' && ack.votedCount !== expectedCount) {
          request.uncertain = true
          setError('Chưa xác nhận đủ người đã chọn. Giữ lựa chọn và kiểm tra trạng thái từ server; không tự gửi lại.')
          resolve(false); return
        }
        const invalidTransition = transition && (!snapshot || snapshot.id !== roomId || snapshot.revision === undefined || !Number.isSafeInteger(snapshot.revision) || snapshot.revision <= state.revision! ||
          (lifecycle && snapshot.status !== (event === 'start_game' ? 'playing' : 'ended')))
        const profilePayload = payload as { userId?: string; name?: string; avatarIndex?: number; bgIndex?: number }
        const committedProfile = profile && snapshot?.players.find(player => player.userId === profilePayload.userId)
        const invalidProfile = profile && (!snapshot || !['waiting', 'playing'].includes(snapshot.status) || !committedProfile ||
          committedProfile.name !== profilePayload.name?.trim() || committedProfile.avatarIndex !== profilePayload.avatarIndex || committedProfile.bgIndex !== profilePayload.bgIndex)
        const requestedSettings = (payload as { settings?: { situationGroups: string[]; emotionGroups: string[] } }).settings
        const sameGroups = (actual?: string[], expected?: string[]) => Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((group, index) => group === expected[index])
        const invalidSettings = settings && (!snapshot || snapshot.status !== 'waiting' || !sameGroups(snapshot.settings?.situationGroups, requestedSettings?.situationGroups) || !sameGroups(snapshot.settings?.emotionGroups, requestedSettings?.emotionGroups))
        const alreadyNewer = transition && snapshot && current.revision !== undefined && snapshot.revision !== undefined && current.revision > snapshot.revision
        if (ack.success && (invalidTransition || invalidProfile || invalidSettings || (snapshot && (snapshot.id !== roomId || (!alreadyNewer && !applyRoomState(snapshot)))))) {
          request.uncertain = true
          setError('Chưa xác nhận được trạng thái của thao tác. Không gửi lại trong bước này.')
          resolve(false); return
        }
        phaseRequests.current.delete(key)
        if (!ack.success) {
          // A stale start is a rejection, not permission to auto-start changed round settings.
          // Refresh the host's confirmed waiting snapshot so the next explicit click can succeed.
          if (event === 'start_game' && ack.error === 'ROUND_REVISION_CONFLICT' && snapshot?.id === roomId && snapshot.status === 'waiting') applyRoomState(snapshot)
          setError(ack.message ?? ack.error ?? 'Server từ chối thao tác.'); resolve(false); return
        }
        resolve(true)
      }
      try { socket.timeout(5000).emit(event, { roomId, ...payload, ...(event === 'start_game' ? { expectedRevision: state.revision } : {}) }, onAck) }
      catch { onAck(new Error('Phase action transport failed')) }
    })
  }, [applyRoomState])
  const startGame = useCallback((roomId: string) => sendPhaseAction('start_game', roomId, {}), [sendPhaseAction])
  const endGame = useCallback((roomId: string) => sendPhaseAction('end_game', roomId, {}), [sendPhaseAction])
  const nightAction = useCallback((roomId: string, action: string, targetSocketId?: string, cardData?: object) =>
    sendPhaseAction('night_action', roomId, { action, targetSocketId, cardData: cardData === undefined ? undefined : cardIdentity(cardData) }), [sendPhaseAction])

  const nextPhase = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) { setError('Mất kết nối. Thao tác chưa được gửi.'); return }
    socketRef.current.emit('next_phase', { roomId })
  }, [])

  // A timeout is not a rejection: keep the same operation until its ACK is
  // recovered. Authenticated requests are also journaled in the existing session
  // before emission; a reload must not turn an ACK-lost operation into a new ID.
  const coinRequestRef = useRef<{
    roomId: string; actorId?: string; receiverSocketId: string; receiverUserId?: string; coinType: string;
    amount: number; round?: number; requestId: string; inFlight: boolean; uncertain: boolean; ownerToken?: string;
  } | null>(null)

  const giveCoin = useCallback((roomId: string, receiverSocketId: string, coinType: string, amount = 1): Promise<boolean> => {
    const socket = socketRef.current
    if (!socket?.connected) {
      setError('Mất kết nối. Coin chưa được trao.')
      return Promise.resolve(false)
    }
    const state = roomStateRef.current
    const session = loadSession()
    const ownsSeat = !!session?.sessionToken && session.roomId === roomId
    const receiver = state?.players.find(player => player.socketId === receiverSocketId)
    let previous = coinRequestRef.current
    if (previous?.ownerToken && (!ownsSeat || previous.ownerToken !== session!.sessionToken || previous.actorId !== session!.userId)) {
      // Credential replacement is not authority to replay another seat's intent.
      coinRequestRef.current = null
      previous = null
    }
    if (ownsSeat && session!.pendingCoin !== undefined) {
      if (!validPendingCoin(session!.pendingCoin, session!)) {
        setError('Dữ liệu lượt trao Coin chờ xác nhận không hợp lệ. Chưa gửi lượt trao mới.')
        return Promise.resolve(false)
      }
      if (!previous) {
        previous = { ...session!.pendingCoin, ownerToken: session!.sessionToken, inFlight: false, uncertain: true }
        coinRequestRef.current = previous
      } else if (previous.requestId !== session!.pendingCoin.requestId) {
        setError('Một lượt trao Coin khác đang chờ xác nhận. Chưa gửi lượt trao mới.')
        return Promise.resolve(false)
      }
    }
    const clearJournal = (request: NonNullable<typeof previous>): boolean => {
      if (!request.ownerToken) return true
      const stored = loadSession()
      if (stored?.sessionToken !== request.ownerToken || stored.roomId !== request.roomId || stored.userId !== request.actorId) return false
      if (!stored.pendingCoin) return true
      if (stored.pendingCoin.requestId !== request.requestId) return false
      try { saveSession({ ...stored, pendingCoin: undefined }); return true } catch { return false }
    }
    if (previous?.inFlight) return Promise.resolve(false)
    // A recipient projection can confirm an ACK-lost operation even after the
    // round advances. Require the entire committed fingerprint, not balance math.
    if (previous && previous.actorId && previous.receiverUserId && state?.id === previous.roomId &&
      state.gameLog?.some(entry => entry.type === 'GIVE_COIN' && entry.actorId === previous!.actorId &&
        entry.targetId === previous!.receiverUserId && entry.data?.requestId === previous!.requestId &&
        entry.data.round === previous!.round && entry.data.coinType === previous!.coinType && entry.data.amount === previous!.amount)) {
      const sameIntent = previous.roomId === roomId && previous.coinType === coinType && previous.amount === amount &&
        (previous.receiverUserId === receiver?.userId || previous.receiverSocketId === receiverSocketId)
      if (!clearJournal(previous)) {
        setError('Đã ghi nhận Coin nhưng chưa cập nhật được phiên trên thiết bị. Chưa gửi lượt trao mới.')
        return Promise.resolve(false)
      }
      coinRequestRef.current = null
      previous = null
      setCoinAction(action => action ? { ...action, status: 'confirmed' } : null)
      setError(error => error === COIN_UNCERTAIN_MESSAGE ? null : error)
      if (sameIntent) return Promise.resolve(true)
    }
    if (previous && (previous.roomId !== roomId || previous.coinType !== coinType ||
      previous.amount !== amount || previous.round !== state?.currentRound ||
      (previous.receiverUserId ? previous.receiverUserId !== receiver?.userId : previous.receiverSocketId !== receiverSocketId))) {
      setError('Lượt trao Coin trước chưa được xác nhận. Hãy thử lại đúng người nhận, màu và số Coin đó trước.')
      return Promise.resolve(false)
    }
    const request = previous ?? { roomId, actorId: state?.players.find(player => player.socketId === socket.id)?.userId ?? loadSession()?.userId,
      receiverSocketId, receiverUserId: receiver?.userId,
      coinType, amount, round: state?.currentRound, requestId: crypto.randomUUID(), inFlight: false, uncertain: false,
      ownerToken: ownsSeat ? session!.sessionToken : undefined }
    // Resolve the same seat's current socket after reconnect, never a new target.
    const targetSocketId = request.receiverUserId
      ? state?.players.find(player => player.userId === request.receiverUserId)?.socketId
      : request.receiverSocketId
    if (!targetSocketId) { setError('Chưa tìm thấy người nhận. Coin chưa được gửi lại.'); return Promise.resolve(false) }
    if (request.ownerToken) {
      const pending = { version: 'coin-request/v1' as const, roomId: request.roomId, actorId: request.actorId!,
        receiverUserId: request.receiverUserId!, receiverSocketId: targetSocketId, coinType: request.coinType as PendingCoin['coinType'],
        amount: request.amount, round: request.round!, requestId: request.requestId }
      if (!validPendingCoin(pending, session!) || state?.id !== roomId) {
        setError('Chưa có trạng thái phòng hợp lệ để lưu lượt trao Coin. Coin chưa được gửi.')
        return Promise.resolve(false)
      }
      try { saveSession({ ...session!, pendingCoin: pending }) } catch {
        setError('Không lưu được lượt trao Coin trên thiết bị. Coin chưa được gửi.')
        return Promise.resolve(false)
      }
      setCoinAction({ status: 'pending', intent: pending })
    } else if (state?.coinCycle || state?.rulesVersion === 'web-16-coin60/v1') {
      setError('Chưa khôi phục phiên chơi. Coin chưa được gửi.')
      return Promise.resolve(false)
    }
    request.inFlight = true
    coinRequestRef.current = request
    const sendingSocketId = socket.id
    return new Promise(resolve => {
      const onAck = (error: Error | null, ack?: RoomActionAck) => {
      const activeSession = loadSession()
      const current = roomStateRef.current
      if (socketRef.current !== socket || !socket.connected || socket.id !== sendingSocketId || coinRequestRef.current !== request ||
        (request.ownerToken && (activeSession?.sessionToken !== request.ownerToken ||
        activeSession.roomId !== request.roomId || activeSession.userId !== request.actorId ||
        activeSession.pendingCoin?.requestId !== request.requestId || current?.id !== request.roomId))) {
        request.inFlight = false
        request.uncertain = true
        if (coinRequestRef.current === request && activeSession?.sessionToken === request.ownerToken &&
          activeSession?.pendingCoin?.requestId === request.requestId) {
          setCoinAction(action => action?.intent.requestId === request.requestId ? { ...action, status: 'uncertain' } : action)
        }
        resolve(false)
        return
      }
      let success = !error && ack?.success === true
      let invalidConfirmation = false
      if (success && request.ownerToken) {
        const snapshot = ack?.data
        const exactReceipt = Array.isArray(snapshot?.gameLog) && snapshot.gameLog.some(entry => entry?.type === 'GIVE_COIN' &&
          entry.actorId === request.actorId && entry.targetId === request.receiverUserId &&
          entry.data?.requestId === request.requestId && entry.data.round === request.round &&
          entry.data.coinType === request.coinType && entry.data.amount === request.amount)
        const validSnapshot = snapshot?.id === request.roomId && Array.isArray(snapshot.players) &&
          ['playing', 'ended'].includes(snapshot.status) && Number.isSafeInteger(snapshot.revision) &&
          snapshot.revision! >= (state?.revision ?? 0) && exactReceipt
        const alreadyNewer = validSnapshot && current?.revision !== undefined && current.revision > snapshot!.revision!
        invalidConfirmation = !validSnapshot || (!alreadyNewer && !applyRoomState(snapshot!))
        success = !invalidConfirmation
      }
      request.inFlight = false
      if (success) {
        if (!request.ownerToken && ack?.data) applyRoomState(ack.data)
        if (!clearJournal(request)) {
          request.uncertain = true
          setCoinAction(action => action?.intent.requestId === request.requestId ? { ...action, status: 'uncertain' } : action)
          setError('Đã ghi nhận Coin nhưng chưa cập nhật được phiên trên thiết bị. Chưa gửi lượt trao mới.')
          resolve(false)
          return
        }
        coinRequestRef.current = null
        setCoinAction(action => action?.intent.requestId === request.requestId ? { ...action, status: 'confirmed' } : action)
        setError(error => error === COIN_UNCERTAIN_MESSAGE ? null : error)
      } else {
        request.uncertain ||= !!error || invalidConfirmation || ack?.success !== false
        setCoinAction(action => action?.intent.requestId === request.requestId
          ? { ...action, status: request.uncertain ? 'uncertain' : 'rejected' } : action)
        if (!request.uncertain && coinRequestRef.current === request && clearJournal(request)) coinRequestRef.current = null
        setError(request.uncertain
          ? COIN_UNCERTAIN_MESSAGE
          : ack?.message ?? ack?.error ?? 'Không thể trao Coin')
      }
      resolve(success)
      }
      try { socket.timeout(5000).emit('give_coin', {
        roomId: request.roomId, receiverSocketId: targetSocketId, coinType: request.coinType,
        amount: request.amount, requestId: request.requestId, round: request.round,
      }, onAck) }
      catch { onAck(new Error('Coin transport failed')) }
    })
  }, [applyRoomState])

  const retryPendingCoin = useCallback((): Promise<boolean> => {
    const stored = loadSession()
    if (!stored?.sessionToken || !validPendingCoin(stored.pendingCoin, stored)) return Promise.resolve(false)
    const pending = stored.pendingCoin
    const target = roomStateRef.current?.players.find(player => player.userId === pending.receiverUserId)
    if (!target) { setError('Chưa tìm thấy người nhận trong phiên đã khôi phục.'); return Promise.resolve(false) }
    return giveCoin(pending.roomId, target.socketId, pending.coinType, pending.amount)
  }, [giveCoin])

  const submitVote = useCallback((roomId: string, suspectSocketId: string) =>
    sendPhaseAction('submit_vote', roomId, { suspectSocketId }), [sendPhaseAction])

  const clearSession = useCallback((options?: { keepStorage?: boolean }) => {
    if (!options?.keepStorage) clearSessionStorage()
    intentionallyDetached.current = true
    admissionRequest.current = null
    admissionPersistenceError.current = null
    setAdmissionAction(null)
    reconnectAttempted.current = false
    roomStateRef.current = null
    coinRequestRef.current = null
    setCoinAction(null)
    setRoomState(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const leaveRequest = useRef<{ roomId: string; socketId: string | undefined; token: string | undefined } | null>(null)
  const leaveRoom = useCallback((roomId: string): Promise<boolean> => {
    const socket = socketRef.current
    if (!socket?.connected) { setError('Mất kết nối. Thao tác chưa được gửi.'); return Promise.resolve(false) }
    if (roomStateRef.current?.id !== roomId) return Promise.resolve(false)
    const token = loadSession()?.sessionToken
    if (leaveRequest.current?.roomId === roomId && leaveRequest.current.socketId === socket.id && leaveRequest.current.token === token) return Promise.resolve(false)
    const request = { roomId, socketId: socket.id, token }
    leaveRequest.current = request
    return new Promise(resolve => {
      const onAck = (error: SocketAckError, ack?: RoomActionAck) => {
        if (!socket.connected || socketRef.current !== socket || socket.id !== request.socketId || roomStateRef.current?.id !== roomId || loadSession()?.sessionToken !== token || leaveRequest.current !== request) { resolve(false); return }
        if (error || typeof ack?.success !== 'boolean') {
          setError('Chưa xác nhận được việc rời phòng. Phiên hiện tại vẫn được giữ; không tự gửi lại.')
          resolve(false); return
        }
        leaveRequest.current = null
        if (!ack.success) setError(ack.message ?? ack.error ?? 'Server chưa xác nhận rời phòng.')
        resolve(ack.success)
      }
      try { socket.timeout(5000).emit('leave_room', { roomId }, onAck) }
      catch { onAck(new Error('Leave transport failed')) }
    })
  }, [])

  const resumeRoom = useCallback((candidate: ResumeCandidate) => {
    return sendAdmission('reconnect_room', {
      roomId: candidate.roomId,
      userId: candidate.userId,
      deviceId: candidate.deviceId,
      name: candidate.userName,
      sessionToken: candidate.sessionToken,
    })
  }, [sendAdmission])

  const dismissResumeCandidate = useCallback((roomId: string) => {
    setResumeCandidates(removeResumeCandidate(roomId))
  }, [])

  const addFakePlayers = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) { setError('Mất kết nối. Thao tác chưa được gửi.'); return }
    socketRef.current.emit('add_fake_players', { roomId })
  }, [])

  const navigatePhase = useCallback((event: 'next_turn' | 'prev_turn', roomId: string) => {
    const session = loadSession()
    return sendPhaseAction(event, roomId, {
      userId: session?.userId ?? getUserId(), deviceId: session?.deviceId ?? getDeviceId(),
    })
  }, [sendPhaseAction])
  const nextTurn = useCallback((roomId: string) => navigatePhase('next_turn', roomId), [navigatePhase])
  const prevTurn = useCallback((roomId: string) => navigatePhase('prev_turn', roomId), [navigatePhase])

  const selectCard = useCallback((roomId: string, card: object, type: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD' = 'SELECT_CARD') =>
    sendPhaseAction('select_card', roomId, { card: cardIdentity(card), type }), [sendPhaseAction])

  const sendResponse = useCallback((roomId: string, message: string) =>
    sendPhaseAction('send_response', roomId, { message }), [sendPhaseAction])

  const ntgVote = useCallback((roomId: string, targetSocketId: string | string[]) =>
    sendPhaseAction('ntg_vote', roomId, Array.isArray(targetSocketId) ? { targetSocketIds: targetSocketId } : { targetSocketId },
      Array.isArray(targetSocketId) ? targetSocketId.length : 1), [sendPhaseAction])

  const emitCardPreview = useCallback((roomId: string, card: CardData | null) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('card_preview', { roomId, card: card === null ? null : cardIdentity(card) })
  }, [])

  const emitSituationFanState = useCallback((roomId: string, activePosition: number, cards?: CardData[]) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('situation_fan_state', { roomId, activePosition, cards: cards?.map(cardIdentity) })
  }, [])

  const shareReflection = useCallback((roomId: string, message: string) =>
    sendPhaseAction('share_reflection', roomId, { message }), [sendPhaseAction])

  const confirmRoleRewards = useCallback((roomId: string, targetSocketIds: string[]) =>
    sendPhaseAction('confirm_role_rewards', roomId, { targetSocketIds }), [sendPhaseAction])

  const updateProfile = useCallback((roomId: string, name: string, avatarIndex: number, bgIndex: number) =>
    sendPhaseAction('update_profile', roomId, { userId: loadSession()?.userId ?? getUserId(), name, avatarIndex, bgIndex }), [sendPhaseAction])

  const updateRoomSettings = useCallback((roomId: string, situationGroups: string[], emotionGroups: string[]) =>
    sendPhaseAction('update_room_settings', roomId, { userId: loadSession()?.userId ?? getUserId(), settings: { situationGroups: [...situationGroups], emotionGroups: [...emotionGroups] } }), [sendPhaseAction])

  const roundIntent = useRef<{ roomId: string; limit: number | null; expectedRevision: number; requestId: string; inFlight: boolean; ownerToken?: string } | null>(null)
  const updateRoundLimit = useCallback((roomId: string, limit: number | null): Promise<boolean> => {
    const socket = socketRef.current, state = roomStateRef.current
    if (!socket?.connected || state?.id !== roomId || state.status !== 'waiting' || !Number.isSafeInteger(state.revision)) return Promise.resolve(false)
    if (roundIntent.current?.inFlight) return Promise.resolve(false)
    const ownerToken = loadSession()?.sessionToken
    const previous = roundIntent.current
    const intent = previous?.roomId === roomId && previous.limit === limit && previous.ownerToken === ownerToken ? previous :
      { roomId, limit, expectedRevision: state.revision!, requestId: crypto.randomUUID(), inFlight: false, ownerToken }
    roundIntent.current = intent; intent.inFlight = true
    return new Promise(resolve => {
      const ack = (err: SocketAckError, result?: RoomActionAck) => {
        intent.inFlight = false
        if (roundIntent.current !== intent || socketRef.current !== socket || loadSession()?.sessionToken !== ownerToken || roomStateRef.current?.id !== roomId) { resolve(false); return }
        if (err || typeof result?.success !== 'boolean') { setError('Chưa xác nhận số lượt. Thử lại đúng lựa chọn này.'); resolve(false); return }
        if (!result.success) { roundIntent.current = null; setError(result.message || 'Phòng đã thay đổi. Chọn lại số lượt.'); resolve(false); return }
        if (!result.data || result.data.id !== roomId || (result.data.roundLimit ?? null) !== limit || !Number.isSafeInteger(result.data.revision)) { setError('Chưa nhận được cấu hình số lượt đã xác nhận.'); resolve(false); return }
        roundIntent.current = null
        resolve(applyRoomState(result.data))
      }
      try { socket.timeout(5000).emit('set_round_limit', { roomId, limit, expectedRevision: intent.expectedRevision, requestId: intent.requestId }, ack) }
      catch { ack(new Error('ROUND_SEND_FAILED')) }
    })
  }, [applyRoomState])

  const setDebugRolePreference = useCallback((roomId: string, targetUserId: string, role: string) => {
    if (!socketRef.current?.connected) { setError('Mất kết nối. Thao tác chưa được gửi.'); return }
    const userId = getUserId()
    socketRef.current.emit('set_debug_role_preference', { roomId, userId, targetUserId, role })
  }, [])

  return {
    socket: socketRef.current,
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
    getRoomState,
    listRooms,
    clearSession,
    leaveRoom,
    nightAction,
    nextPhase,
    giveCoin,
    submitVote,
    endGame,
    addFakePlayers,
    nextTurn,
    prevTurn,
    selectCard,
    sendResponse,
    ntgVote,
    confirmRoleRewards,
    shareReflection,
    emitCardPreview,
    emitSituationFanState,
    situationPreviewCard,
    situationFanState,
    updateProfile,
    updateRoomSettings,
    updateRoundLimit,
    setDebugRolePreference,
    resumeCandidates,
    resumeRoom,
    dismissResumeCandidate,
  }
}
