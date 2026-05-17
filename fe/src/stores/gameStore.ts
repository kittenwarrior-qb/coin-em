import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Player, GameStep, SelectedCards, CardData, CardCategory } from './types'
import { NIGHT_PHASES, SENDER_PHASES } from './types'

interface GameState {
  // Game data
  gameStep: GameStep
  selectedCards: SelectedCards
  players: Player[]
  mySocketId: string
  myUserId: string

  // UI state
  expandedPlayer: Player | null
  showInventory: boolean
  inventoryMode: {
    category?: CardCategory
    showConfirm: boolean
  }

  // Actions - Game
  setGameStep: (step: GameStep) => void
  setPlayers: (players: Player[]) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  setMyIds: (socketId: string, userId: string) => void

  // Actions - Cards
  selectCard: (card: CardData, category: CardCategory | 'situation') => void
  clearSelectedCards: () => void
  clearSelectedCard: (category: CardCategory) => void

  // Actions - UI
  setExpandedPlayer: (player: Player | null) => void
  setShowInventory: (show: boolean) => void
  setInventoryMode: (mode: { category?: CardCategory; showConfirm: boolean }) => void

  // Computed
  myPlayer: () => Player | undefined
  isNarrator: () => boolean
  isSender: () => boolean
  isNightPhase: () => boolean
  isSenderPhase: () => boolean
  canSelectCard: (category: CardCategory) => boolean
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      gameStep: 'role-reveal',
      selectedCards: { reflections: [] },
      players: [],
      mySocketId: '',
      myUserId: '',
      expandedPlayer: null,
      showInventory: false,
      inventoryMode: { showConfirm: false },

      // Game actions
      setGameStep: (step) => set({ gameStep: step }),
      setPlayers: (players) => set({ players }),
      updatePlayer: (playerId, updates) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p
          ),
        })),
      setMyIds: (socketId, userId) => set({ mySocketId: socketId, myUserId: userId }),

      // Card actions
      selectCard: (card, category) =>
        set((state) => {
          if (category === 'reflection') {
            if (state.selectedCards.reflections.some((c) => c.id === card.id)) {
              return { selectedCards: state.selectedCards }
            }
            return {
              selectedCards: {
                ...state.selectedCards,
                reflections: [...state.selectedCards.reflections, card].slice(0, 3),
              },
            }
          }
          if (category === 'situation') {
            return { selectedCards: { ...state.selectedCards, situation: card } }
          }
          return { selectedCards: { ...state.selectedCards, [category]: card } }
        }),

      clearSelectedCards: () => set({ selectedCards: { reflections: [] } }),
      clearSelectedCard: (category) =>
        set((state) => {
          if (category === 'reflection') {
            return { selectedCards: { ...state.selectedCards, reflections: [] } }
          }
          if (category === 'role') {
            return { selectedCards: state.selectedCards }
          }

          const selectedCards = { ...state.selectedCards }
          delete selectedCards[category]
          return { selectedCards }
        }),

      // UI actions
      setExpandedPlayer: (player) => set({ expandedPlayer: player }),
      setShowInventory: (show) => set({ showInventory: show }),
      setInventoryMode: (mode) => set({ inventoryMode: mode }),

      // Computed
      myPlayer: () => get().players.find((p) => p.isMe),

      isNarrator: () => get().myPlayer()?.isNarrator || false,

      isSender: () => get().myPlayer()?.isSender || false,

      isNightPhase: () => NIGHT_PHASES.includes(get().gameStep),

      isSenderPhase: () => SENDER_PHASES.includes(get().gameStep),

      canSelectCard: (category) => {
        const { gameStep, isSender } = get()
        if (!isSender()) return false
        if (category === 'emotion')     return gameStep === 'emotion-card'
        if (category === 'reflection')  return gameStep === 'reflection-card'
        if (category === 'selfcare')    return gameStep === 'selfcare-card'
        return false
      },
    }),
    { name: 'GameStore' }
  )
)
