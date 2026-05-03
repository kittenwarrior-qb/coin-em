import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getUserId } from '../utils/userId'
import { useGameStore } from '../stores/gameStore'
import type { GamePhase } from '../stores/types'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? window.location.origin
const SESSION_KEY = 'emcoin_session'

interface Player {
  socketId: string
  name: string
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
  selectedCard?: object | null
}

interface Session {
  roomId: string
  userName: string
  userId: string
  oldSocketId?: string
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
  nightAction: (roomId: string, action: string, targetSocketId?: string, cardData?: object) => void
  nextPhase: (roomId: string) => void
  giveCoin: (roomId: string, receiverSocketId: string, coinType: string) => void
  submitVote: (roomId: string, suspectSocketId: string) => void
  endGame: (roomId: string) => void
  addFakePlayers: (roomId: string) => void
  nextTurn: (roomId: string) => void
  selectCard: (roomId: string, card: object, type?: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD') => void
  sendResponse: (roomId: string, message: string) => void
  ntgVote: (roomId: string, targetSocketId: string) => void
  shareReflection: (roomId: string, message: string) => void
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

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [availableRooms, setAvailableRooms] = useState<RoomListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const reconnectAttempted = useRef(false)
  const [currentSocketId, setCurrentSocketId] = useState<string>('')

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

      // Try to reconnect to previous room
      if (!reconnectAttempted.current) {
        reconnectAttempted.current = true
        const session = loadSession()
        if (session) {
          console.log('[Socket] Attempting to reconnect to room:', session.roomId, 'with userId:', session.userId, 'new socket.id:', socket.id)
          socket.emit('reconnect_room', {
            roomId: session.roomId,
            userId: session.userId,
            oldSocketId: session.oldSocketId,
            name: session.userName,
          })
          // Update session with new socket ID
          saveSession({ ...session, oldSocketId: socket.id })
        }
      }
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setIsConnected(false)
    })

    // Room events
    socket.on('room_state', (state: RoomState) => {
      console.log('[Socket] Room state:', state)
      setRoomState(state)
      setError(null)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('player_joined', ({ players }: { socketId: string; name: string; players: Player[] }) => {
      console.log('[Socket] Player joined')
      setRoomState(prev => prev ? { ...prev, players } : null)
    })

    socket.on('player_left', ({ players, host }: { socketId: string; players: Player[]; host: string }) => {
      console.log('[Socket] Player left')
      setRoomState(prev => prev ? { ...prev, players, host } : null)
    })

    socket.on('game_started', (state: RoomState) => {
      console.log('[Socket] Game started:', state)
      setRoomState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('night_action_completed', ({ action, room }: { action: string; room: RoomState }) => {
      console.log('[Socket] Night action completed:', action)
      setRoomState(room)
    })

    socket.on('phase_changed', (state: RoomState) => {
      console.log('[Socket] Phase changed:', state.phase)
      setRoomState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('turn_changed', (state: RoomState) => {
      console.log('[Socket] Turn changed:', state.turn, state.phase)
      setRoomState(state)
      
      // Sync gameStep with server phase
      if (state.phase) {
        useGameStore.getState().setGameStep(state.phase)
      }
    })

    socket.on('coin_given', ({ giver, receiver, coinType, room }: { giver: string; receiver: string; coinType: string; room: RoomState }) => {
      console.log('[Socket] Coin given:', coinType, 'from', giver, 'to', receiver)
      setRoomState(room)
    })

    socket.on('card_selected', ({ type, room }: { actorId: string; card: object; type: string; room: RoomState }) => {
      console.log('[Socket] Card selected:', type)
      setRoomState(room)
    })

    socket.on('response_received', ({ actorName, message, room }: { actorId: string; actorName: string; message: string; room: RoomState }) => {
      console.log('[Socket] Response received from:', actorName, message)
      setRoomState(room)
    })

    socket.on('ntg_vote_cast', ({ votedName, bonus, room }: { ntgId: string; votedId: string; votedName: string; bonus: number; room: RoomState }) => {
      console.log('[Socket] NTG voted for:', votedName, '+', bonus, 'yellow')
      setRoomState(room)
    })

    socket.on('reflection_shared', ({ ntgName, message, room }: { ntgId: string; ntgName: string; message: string; bonus: number; room: RoomState }) => {
      console.log('[Socket] Reflection shared by:', ntgName, message)
      setRoomState(room)
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

    socket.on('error', (err: { code: string; message: string }) => {
      console.error('[Socket] Error:', err)
      setError(err.message)
      // Clear session if room not found
      if (err.code === 'room_not_found') {
        clearSessionStorage()
      }
    })

    // Cleanup
    return () => {
      socket.disconnect()
    }
  }, [])

  const joinRoom = (roomId: string, name: string, createIfMissing = false) => {
    if (!socketRef.current) return
    const userId = getUserId()
    console.log('[Socket] Emit join_room:', { roomId, name, userId, createIfMissing })
    socketRef.current.emit('join_room', { roomId, name, userId, createIfMissing })
    // Save session
    saveSession({ roomId, userName: name, userId, oldSocketId: socketRef.current.id })
  }

  const startGame = (roomId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit start_game:', { roomId })
    socketRef.current.emit('start_game', { roomId })
  }

  const getRoomState = (roomId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit get_room_state:', { roomId })
    socketRef.current.emit('get_room_state', { roomId })
  }

  const listRooms = () => {
    if (!socketRef.current) return
    console.log('[Socket] Emit list_rooms')
    socketRef.current.emit('list_rooms')
  }

  const nightAction = (roomId: string, action: string, targetSocketId?: string, cardData?: object) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit night_action:', action)
    socketRef.current.emit('night_action', { roomId, action, targetSocketId, cardData })
  }

  const nextPhase = (roomId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit next_phase')
    socketRef.current.emit('next_phase', { roomId })
  }

  const giveCoin = (roomId: string, receiverSocketId: string, coinType: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit give_coin:', coinType)
    socketRef.current.emit('give_coin', { roomId, receiverSocketId, coinType })
  }

  const submitVote = (roomId: string, suspectSocketId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit submit_vote')
    socketRef.current.emit('submit_vote', { roomId, suspectSocketId })
  }

  const endGame = (roomId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit end_game')
    socketRef.current.emit('end_game', { roomId })
  }

  const clearSession = () => {
    clearSessionStorage()
    reconnectAttempted.current = false
  }

  const addFakePlayers = (roomId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit add_fake_players')
    socketRef.current.emit('add_fake_players', { roomId })
  }

  const nextTurn = (roomId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit next_turn')
    socketRef.current.emit('next_turn', { roomId })
  }

  const selectCard = (roomId: string, card: object, type: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD' = 'SELECT_CARD') => {
    if (!socketRef.current) return
    console.log('[Socket] Emit select_card:', type)
    socketRef.current.emit('select_card', { roomId, card, type })
  }

  const sendResponse = (roomId: string, message: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit send_response')
    socketRef.current.emit('send_response', { roomId, message })
  }

  const ntgVote = (roomId: string, targetSocketId: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit ntg_vote')
    socketRef.current.emit('ntg_vote', { roomId, targetSocketId })
  }

  const shareReflection = (roomId: string, message: string) => {
    if (!socketRef.current) return
    console.log('[Socket] Emit share_reflection')
    socketRef.current.emit('share_reflection', { roomId, message })
  }

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
    nightAction,
    nextPhase,
    giveCoin,
    submitVote,
    endGame,
    addFakePlayers,
    nextTurn,
    selectCard,
    sendResponse,
    ntgVote,
    shareReflection,
  }
}
