import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface FlyingCoin {
  id: number
  emoji: string
  x: number
  y: number
}

interface UIState {
  // Flying coins animation
  flyCoins: FlyingCoin[]

  // Loading states
  isLoading: boolean
  loadingMessage: string

  // Toast/notification
  toast: {
    message: string
    type: 'success' | 'error' | 'info'
  } | null

  // Actions
  addFlyingCoin: (emoji: string) => void
  removeFlyingCoin: (id: number) => void
  setLoading: (loading: boolean, message?: string) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      flyCoins: [],
      isLoading: false,
      loadingMessage: '',
      toast: null,

      // Actions
      addFlyingCoin: (emoji) => {
        const id = Date.now()
        const x = Math.random() * 200 - 100

        set((state) => ({
          flyCoins: [...state.flyCoins, { id, emoji, x, y: 0 }],
        }))

        // Auto-remove after animation
        setTimeout(() => {
          set((state) => ({
            flyCoins: state.flyCoins.filter((c) => c.id !== id),
          }))
        }, 900)
      },

      removeFlyingCoin: (id) =>
        set((state) => ({
          flyCoins: state.flyCoins.filter((c) => c.id !== id),
        })),

      setLoading: (loading, message = '') =>
        set({ isLoading: loading, loadingMessage: message }),

      showToast: (message, type) => set({ toast: { message, type } }),

      clearToast: () => set({ toast: null }),
    }),
    { name: 'UIStore' }
  )
)
