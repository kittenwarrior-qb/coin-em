import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../stores/gameStore'
import type { Player } from '../../stores/types'

// Helper to reset store between tests
const resetStore = () => {
  useGameStore.setState({
    gameStep: 'role-reveal',
    selectedCards: { reflections: [] },
    players: [],
    mySocketId: '',
    myUserId: '',
    expandedPlayer: null,
    showInventory: false,
    inventoryMode: { showConfirm: false },
  })
}

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'socket-1',
  name: 'Alice',
  role: 'Người Quản trò',
  isMe: false,
  isNarrator: false,
  isSender: false,
  coins: { red: 3, yellow: 7, green: 0 },
  ...overrides,
})

describe('gameStore — phase', () => {
  beforeEach(resetStore)

  it('initial phase is role-reveal', () => {
    expect(useGameStore.getState().gameStep).toBe('role-reveal')
  })

  it('setGameStep updates phase', () => {
    useGameStore.getState().setGameStep('night')
    expect(useGameStore.getState().gameStep).toBe('night')
  })

  it('isNightPhase returns true for night sub-phases', () => {
    for (const phase of ['night', 'healer-turn', 'silencer-turn'] as const) {
      useGameStore.getState().setGameStep(phase)
      expect(useGameStore.getState().isNightPhase()).toBe(true)
    }
  })

  it('isNightPhase returns false for day phases', () => {
    useGameStore.getState().setGameStep('situation-card')
    expect(useGameStore.getState().isNightPhase()).toBe(false)
  })

  it('isSenderPhase returns true for sender phases', () => {
    for (const phase of ['situation-card', 'emotion-card', 'story-telling', 'reflection-card', 'selfcare-card'] as const) {
      useGameStore.getState().setGameStep(phase)
      expect(useGameStore.getState().isSenderPhase()).toBe(true)
    }
  })

  it('isSenderPhase returns false for night phase', () => {
    useGameStore.getState().setGameStep('night')
    expect(useGameStore.getState().isSenderPhase()).toBe(false)
  })
})

describe('gameStore — players', () => {
  beforeEach(resetStore)

  it('setPlayers replaces player list', () => {
    const players = [makePlayer({ id: 's1', name: 'Alice' }), makePlayer({ id: 's2', name: 'Bob' })]
    useGameStore.getState().setPlayers(players)
    expect(useGameStore.getState().players).toHaveLength(2)
  })

  it('updatePlayer patches a single player', () => {
    useGameStore.getState().setPlayers([makePlayer({ id: 's1', coins: { red: 3, yellow: 7, green: 0 } })])
    useGameStore.getState().updatePlayer('s1', { coins: { red: 2, yellow: 7, green: 1 } })
    const p = useGameStore.getState().players[0]
    expect(p.coins.red).toBe(2)
    expect(p.coins.green).toBe(1)
  })

  it('updatePlayer does not affect other players', () => {
    useGameStore.getState().setPlayers([
      makePlayer({ id: 's1', name: 'Alice' }),
      makePlayer({ id: 's2', name: 'Bob' }),
    ])
    useGameStore.getState().updatePlayer('s1', { name: 'Alice Updated' })
    expect(useGameStore.getState().players[1].name).toBe('Bob')
  })

  it('myPlayer returns the player with isMe=true', () => {
    useGameStore.getState().setPlayers([
      makePlayer({ id: 's1', name: 'Alice', isMe: false }),
      makePlayer({ id: 's2', name: 'Bob', isMe: true }),
    ])
    expect(useGameStore.getState().myPlayer()?.name).toBe('Bob')
  })

  it('myPlayer returns undefined when no player is me', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: false })])
    expect(useGameStore.getState().myPlayer()).toBeUndefined()
  })
})

describe('gameStore — role computed', () => {
  beforeEach(resetStore)

  it('isNarrator returns true when my player is narrator', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isNarrator: true })])
    expect(useGameStore.getState().isNarrator()).toBe(true)
  })

  it('isNarrator returns false when my player is not narrator', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isNarrator: false })])
    expect(useGameStore.getState().isNarrator()).toBe(false)
  })

  it('isSender returns true when my player is sender', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isSender: true })])
    expect(useGameStore.getState().isSender()).toBe(true)
  })
})

describe('gameStore — card selection', () => {
  beforeEach(resetStore)

  const card = { id: 'c1', frontImage: 'f.jpg', backImage: 'b.jpg', category: 'emotion' as const }

  it('selectCard sets emotion card', () => {
    useGameStore.getState().selectCard(card, 'emotion')
    expect(useGameStore.getState().selectedCards.emotion?.id).toBe('c1')
  })

  it('selectCard sets situation card', () => {
    const s = { ...card, id: 's1', category: 'situation' as const }
    useGameStore.getState().selectCard(s, 'situation')
    expect(useGameStore.getState().selectedCards.situation?.id).toBe('s1')
  })

  it('selectCard appends reflection cards up to 3', () => {
    const r = { ...card, category: 'reflection' as const }
    useGameStore.getState().selectCard({ ...r, id: 'r1' }, 'reflection')
    useGameStore.getState().selectCard({ ...r, id: 'r2' }, 'reflection')
    useGameStore.getState().selectCard({ ...r, id: 'r3' }, 'reflection')
    useGameStore.getState().selectCard({ ...r, id: 'r4' }, 'reflection') // should be ignored
    expect(useGameStore.getState().selectedCards.reflections).toHaveLength(3)
    expect(useGameStore.getState().selectedCards.reflections[2].id).toBe('r3')
  })

  it('clearSelectedCards resets all cards', () => {
    useGameStore.getState().selectCard(card, 'emotion')
    useGameStore.getState().clearSelectedCards()
    expect(useGameStore.getState().selectedCards.emotion).toBeUndefined()
    expect(useGameStore.getState().selectedCards.reflections).toHaveLength(0)
  })
})

describe('gameStore — canSelectCard', () => {
  beforeEach(resetStore)

  it('returns false when not sender', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isSender: false })])
    useGameStore.getState().setGameStep('emotion-card')
    expect(useGameStore.getState().canSelectCard('emotion')).toBe(false)
  })

  it('returns true for emotion in emotion-card phase', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isSender: true })])
    useGameStore.getState().setGameStep('emotion-card')
    expect(useGameStore.getState().canSelectCard('emotion')).toBe(true)
  })

  it('returns false for emotion in wrong phase', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isSender: true })])
    useGameStore.getState().setGameStep('reflection-card')
    expect(useGameStore.getState().canSelectCard('emotion')).toBe(false)
  })

  it('returns true for reflection in reflection-card phase', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isSender: true })])
    useGameStore.getState().setGameStep('reflection-card')
    expect(useGameStore.getState().canSelectCard('reflection')).toBe(true)
  })

  it('returns true for selfcare in selfcare-card phase', () => {
    useGameStore.getState().setPlayers([makePlayer({ isMe: true, isSender: true })])
    useGameStore.getState().setGameStep('selfcare-card')
    expect(useGameStore.getState().canSelectCard('selfcare')).toBe(true)
  })
})
