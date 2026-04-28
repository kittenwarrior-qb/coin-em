import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3001'
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
  currentRound: number
  currentNTG: string | null
}

interface Session {
  roomId: string
  userName: string
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
  joinRoom: (roomId: string, name: string, createIfMissing?: boolean) => void
  startGame: (roomId: string) => void
  getRoomState: (roomId: string) => void
  listRooms: () => void
  clearSession: () => void
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

  useEffect(() => {
    // Initialize socket
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setIsConnected(true)
      setError(null)

      // Try to reconnect to previous room
      if (!reconnectAttempted.current) {
        reconnectAttempted.current = true
        const session = loadSession()
        if (session) {
          console.log('[Socket] Attempting to reconnect to room:', session.roomId)
          socket.emit('reconnect_room', {
            roomId: session.roomId,
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
    console.log('[Socket] Emit join_room:', { roomId, name, createIfMissing })
    socketRef.current.emit('join_room', { roomId, name, createIfMissing })
    // Save session
    saveSession({ roomId, userName: name, oldSocketId: socketRef.current.id })
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

  const clearSession = () => {
    clearSessionStorage()
    reconnectAttempted.current = false
  }

  return {
    socket: socketRef.current,
    isConnected,
    roomState,
    availableRooms,
    error,
    joinRoom,
    startGame,
    getRoomState,
    listRooms,
    clearSession,
  }
}
