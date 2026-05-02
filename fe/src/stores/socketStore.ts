import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { RoomState } from './types'

interface SocketState {
  // Connection state
  isConnected: boolean
  currentSocketId: string
  error: string | null

  // Room state
  roomState: RoomState | null

  // Actions
  setConnected: (connected: boolean) => void
  setCurrentSocketId: (socketId: string) => void
  setError: (error: string | null) => void
  setRoomState: (roomState: RoomState | null) => void
  updateRoomState: (updates: Partial<RoomState>) => void
  clearError: () => void
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set) => ({
      // Initial state
      isConnected: false,
      currentSocketId: '',
      error: null,
      roomState: null,

      // Actions
      setConnected: (connected) => set({ isConnected: connected }),

      setCurrentSocketId: (socketId) => set({ currentSocketId: socketId }),

      setError: (error) => set({ error }),

      setRoomState: (roomState) => set({ roomState }),

      updateRoomState: (updates) =>
        set((state) => ({
          roomState: state.roomState ? { ...state.roomState, ...updates } : null,
        })),

      clearError: () => set({ error: null }),
    }),
    { name: 'SocketStore' }
  )
)
