import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getDeviceId, getUserId } from '../utils/userId'
import { useGameStore } from '../stores/gameStore'
import type { CardData, GamePhase } from '../stores/types'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? window.location.origin
const SESSION_KEY = 'emcoin_session'
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
}

interface RoomState {
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
    coinType?: string
    silencerFound?: boolean
  }
  timestamp: number
}

interface RoomActionAck {
  success: boolean
  data?: RoomState
  message?: string
  error?: string
}

interface Session {
  roomId: string
  userName: string
  userId: string
  deviceId: string
  oldSocketId?: string
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
}

interface RoomListItem {
  id: string
  playerCount: number
  hostName: string
}

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  roomState: RoomState | null
  availableRooms: RoomListItem[]
  error: string | null
  currentSocketId: string
  joinRoom: (roomId: string, name: string, createIfMissing?: boolean) => void
  startGame: (roomId: string) => void
  getRoomState: (roomId: string) => void
  listRooms: () => void
  clearSession: () => void
  leaveRoom: (roomId: string) => void
  nightAction: (roomId: string, action: string, targetSocketId?: string, cardData?: object) => void
  nextPhase: (roomId: string) => void
  giveCoin: (roomId: string, receiverSocketId: string, coinType: string) => void
  submitVote: (roomId: string, suspectSocketId: string) => void
  endGame: (roomId: string) => void
  addFakePlayers: (roomId: string) => void
  nextTurn: (roomId: string) => void
  prevTurn: (roomId: string) => void
  selectCard: (roomId: string, card: object, type?: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD') => void
  sendResponse: (roomId: string, message: string) => void
  ntgVote: (roomId: string, targetSocketId: string) => void
  shareReflection: (roomId: string, message: string) => void
  updateProfile: (roomId: string, name: string, avatarIndex: number, bgIndex: number) => void
  updateRoomSettings: (roomId: string, situationGroups: string[], emotionGroups: string[]) => void
  setDebugRolePreference: (roomId: string, targetUserId: string, role: string) => void
  resumeCandidates: ResumeCandidate[]
  resumeRoom: (candidate: ResumeCandidate) => void
  dismissResumeCandidate: (roomId: string) => void
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
      item.status === 'playing' &&
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
  const [resumeCandidates, setResumeCandidates] = useState<ResumeCandidate[]>(() => loadResumeCandidates())
  const reconnectAttempted = useRef(false)
  const reconnectPending = useRef(false)
  const roomStateRef = useRef<RoomState | null>(null)
  const [currentSocketId, setCurrentSocketId] = useState<string>('')

  const persistResumeFromState = useCallback((state: RoomState) => {
    const userId = getUserId()
    const deviceId = getDeviceId()
    if (state.status !== 'playing') {
      setResumeCandidates(removeResumeCandidate(state.id))
      return
    }

    const player = state.players.find(p => p.userId === userId || p.deviceId === deviceId)
    if (!player) return

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
    }

    setResumeCandidates(upsertResumeCandidate(candidate))
  }, [])

  useEffect(() => {
    // Initialize socket
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket
    
    // Set initial socket ID if available
    if (socket.id) {
      console.log('[Socket] Initial socket.id:', socket.id)
      setCurrentSocketId(socket.id)
    }

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setIsConnected(true)
      setCurrentSocketId(socket.id || '')
      setError(null)

      // Preserve active gameplay across transient network reconnects.
      const activeRoom = roomStateRef.current
      const session = loadSession()
      if (activeRoom && session && !reconnectPending.current) {
        reconnectPending.current = true
        socket.emit('reconnect_room', {
          roomId: session.roomId,
          userId: session.userId,
          deviceId: session.deviceId,
          oldSocketId: session.oldSocketId,
          name: session.userName,
        })
        saveSession({ ...session, oldSocketId: socket.id })
      }
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setIsConnected(false)
    })

    // Room events
    socket.on('room_state', (state: RoomState) => {
      console.log('[Socket] Room state:', state)
      reconnectPending.current = false
      roomStateRef.current = state
      setRoomState(state)
      setError(null)
      persistResumeFromState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('player_joined', ({ players }: { socketId: string; name: string; players: Player[] }) => {
      console.log('[Socket] Player joined')
      setRoomState(prev => prev ? { ...prev, players } : null)
    })

    socket.on('player_reconnected', ({ room }: { socketId: string; name: string; players: Player[]; room: RoomState }) => {
      console.log('[Socket] Player reconnected')
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('players_disconnected', ({ room }: { players: Array<{ userId: string; name: string; disconnectedAt?: number | null }>; room: RoomState }) => {
      console.log('[Socket] Players disconnected')
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('player_left', ({ players, host }: { socketId: string; players: Player[]; host: string }) => {
      console.log('[Socket] Player left')
      setRoomState(prev => prev ? { ...prev, players, host } : null)
    })

    socket.on('game_started', (state: RoomState) => {
      console.log('[Socket] Game started:', state)
      roomStateRef.current = state
      setRoomState(state)
      persistResumeFromState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('night_action_completed', ({ action, room }: { action: string; room: RoomState }) => {
      console.log('[Socket] Night action completed:', action)
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('phase_changed', (state: RoomState) => {
      console.log('[Socket] Phase changed:', state.phase)
      roomStateRef.current = state
      setRoomState(state)
      persistResumeFromState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('turn_changed', (state: RoomState) => {
      console.log('[Socket] Turn changed:', state.turn, state.phase)
      roomStateRef.current = state
      setRoomState(state)
      persistResumeFromState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('coin_given', ({ giver, receiver, coinType, room }: { giver: string; receiver: string; coinType: string; room: RoomState }) => {
      console.log('[Socket] Coin given:', coinType, 'from', giver, 'to', receiver)
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('card_selected', ({ type, room }: { actorId: string; card: object; type: string; room: RoomState }) => {
      console.log('[Socket] Card selected:', type)
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('response_received', ({ actorName, message, room }: { actorId: string; actorName: string; message: string; room: RoomState }) => {
      console.log('[Socket] Response received from:', actorName, message)
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('ntg_vote_cast', ({ votedName, bonus, room }: { ntgId: string; votedId: string; votedName: string; bonus: number; room: RoomState }) => {
      console.log('[Socket] NTG voted for:', votedName, '+', bonus, 'yellow')
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('reflection_shared', ({ ntgName, message, room }: { ntgId: string; ntgName: string; message: string; bonus: number; room: RoomState }) => {
      console.log('[Socket] Reflection shared by:', ntgName, message)
      roomStateRef.current = room
      setRoomState(room)
      persistResumeFromState(room)
    })

    socket.on('vote_submitted', () => {
      console.log('[Socket] Vote submitted')
    })

    socket.on('voting_complete', ({ votes }: { votes: Record<string, string> }) => {
      console.log('[Socket] Voting complete:', votes)
    })

    socket.on('game_ended', ({ coinSummary }: { coinSummary: Array<{ userId: string; name: string; coins: { red: number; yellow: number; green: number } }> }) => {
      console.log('[Socket] Game ended. Coin summary:', coinSummary)
      // GameBoard listens to roomState.phase === 'ended' for UI
    })

    socket.on('rooms_list', (rooms: RoomListItem[]) => {
      console.log('[Socket] Rooms list:', rooms)
      setAvailableRooms(rooms)
    })

    socket.on('room_closed', ({ roomId }: { roomId: string; reason?: string }) => {
      console.log('[Socket] Room closed:', roomId)
      clearSessionStorage()
      roomStateRef.current = null
      setRoomState(null)
      setResumeCandidates(removeResumeCandidate(roomId))
    })

    socket.on('error', (err: { code: string; message: string }) => {
      console.error('[Socket] Error:', err)
      // If error arrives while reconnect is pending
      if (reconnectPending.current) {
        reconnectPending.current = false
        const session = loadSession()
        // player_not_found: room exists but player was removed (e.g. server restart)
        // → try to rejoin the room instead of going to lobby
        if (err.code === 'player_not_found' && session) {
          console.log('[Socket] player_not_found during reconnect, attempting join_room fallback')
          socket.emit('join_room', {
            roomId: session.roomId,
            name: session.userName,
            userId: session.userId,
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
      socket.disconnect()
    }
  }, [persistResumeFromState])

  const joinRoom = useCallback((roomId: string, name: string, createIfMissing = false) => {
    if (!socketRef.current) return
    const userId = getUserId()
    const deviceId = getDeviceId()
    console.log('[Socket] Emit join_room:', { roomId, name, userId, deviceId, createIfMissing })
    socketRef.current.emit('join_room', { roomId, name, userId, deviceId, createIfMissing })
    saveSession({ roomId, userName: name, userId, deviceId, oldSocketId: socketRef.current.id })
  }, [])

  const startGame = useCallback((roomId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('start_game', { roomId })
  }, [])

  const getRoomState = useCallback((roomId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('get_room_state', { roomId })
  }, [])

  const listRooms = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit('list_rooms')
  }, [])

  const nightAction = useCallback((roomId: string, action: string, targetSocketId?: string, cardData?: object) => {
    if (!socketRef.current) return
    socketRef.current.emit('night_action', { roomId, action, targetSocketId, cardData })
  }, [])

  const nextPhase = useCallback((roomId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('next_phase', { roomId })
  }, [])

  const giveCoin = useCallback((roomId: string, receiverSocketId: string, coinType: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('give_coin', { roomId, receiverSocketId, coinType })
  }, [])

  const submitVote = useCallback((roomId: string, suspectSocketId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('submit_vote', { roomId, suspectSocketId })
  }, [])

  const endGame = useCallback((roomId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('end_game', { roomId })
  }, [])

  const clearSession = useCallback(() => {
    clearSessionStorage()
    reconnectAttempted.current = false
    roomStateRef.current = null
    setRoomState(null)
    setError(null)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('leave_room', { roomId })
  }, [])

  const resumeRoom = useCallback((candidate: ResumeCandidate) => {
    if (!socketRef.current) return
    reconnectPending.current = true
    saveSession({ ...candidate, oldSocketId: socketRef.current.id })
    socketRef.current.emit('reconnect_room', {
      roomId: candidate.roomId,
      userId: candidate.userId,
      deviceId: candidate.deviceId,
      name: candidate.userName,
    })
  }, [])

  const dismissResumeCandidate = useCallback((roomId: string) => {
    setResumeCandidates(removeResumeCandidate(roomId))
  }, [])

  const addFakePlayers = useCallback((roomId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('add_fake_players', { roomId })
  }, [])

  const lastNextTurnRef = useRef<number>(0)

  const nextTurn = useCallback((roomId: string) => {
    if (!socketRef.current) return
    const now = Date.now()
    if (now - lastNextTurnRef.current < 800) return
    lastNextTurnRef.current = now
    const session = loadSession()
    socketRef.current.emit(
      'next_turn',
      {
        roomId,
        userId: session?.userId ?? getUserId(),
        deviceId: session?.deviceId ?? getDeviceId(),
      },
      (ack: RoomActionAck) => {
        if (!ack?.success) {
          setError(ack?.message ?? ack?.error ?? 'Không thể chuyển lượt.')
          return
        }
        if (ack.data) {
          roomStateRef.current = ack.data
          setRoomState(ack.data)
          persistResumeFromState(ack.data)
          if (ack.data.phase) useGameStore.getState().setGameStep(ack.data.phase)
        }
      },
    )
  }, [persistResumeFromState])

  const prevTurn = useCallback((roomId: string) => {
    if (!socketRef.current) return
    const now = Date.now()
    if (now - lastNextTurnRef.current < 800) return
    lastNextTurnRef.current = now
    const session = loadSession()
    socketRef.current.emit(
      'prev_turn',
      {
        roomId,
        userId: session?.userId ?? getUserId(),
        deviceId: session?.deviceId ?? getDeviceId(),
      },
      (ack: RoomActionAck) => {
        if (!ack?.success) {
          setError(ack?.message ?? ack?.error ?? 'Không thể quay lại phase trước.')
          return
        }
        if (ack.data) {
          roomStateRef.current = ack.data
          setRoomState(ack.data)
          persistResumeFromState(ack.data)
          if (ack.data.phase) useGameStore.getState().setGameStep(ack.data.phase)
        }
      },
    )
  }, [persistResumeFromState])

  const selectCard = useCallback((roomId: string, card: object, type: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD' = 'SELECT_CARD') => {
    if (!socketRef.current) return
    socketRef.current.emit('select_card', { roomId, card, type })
  }, [])

  const sendResponse = useCallback((roomId: string, message: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('send_response', { roomId, message })
  }, [])

  const ntgVote = useCallback((roomId: string, targetSocketId: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('ntg_vote', { roomId, targetSocketId })
  }, [])

  const shareReflection = useCallback((roomId: string, message: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('share_reflection', { roomId, message })
  }, [])

  const updateProfile = useCallback((roomId: string, name: string, avatarIndex: number, bgIndex: number) => {
    if (!socketRef.current) return
    const userId = getUserId()
    socketRef.current.emit('update_profile', { roomId, userId, name, avatarIndex, bgIndex })
  }, [])

  const updateRoomSettings = useCallback((roomId: string, situationGroups: string[], emotionGroups: string[]) => {
    if (!socketRef.current) return
    const userId = getUserId()
    socketRef.current.emit('update_room_settings', { roomId, userId, settings: { situationGroups, emotionGroups } })
  }, [])

  const setDebugRolePreference = useCallback((roomId: string, targetUserId: string, role: string) => {
    if (!socketRef.current) return
    const userId = getUserId()
    socketRef.current.emit('set_debug_role_preference', { roomId, userId, targetUserId, role })
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    roomState,
    availableRooms,
    error,
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
    shareReflection,
    updateProfile,
    updateRoomSettings,
    setDebugRolePreference,
    resumeCandidates,
    resumeRoom,
    dismissResumeCandidate,
  }
}
