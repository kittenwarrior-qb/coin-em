import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CardData } from '@/stores/types'
import type { RoomState, GameLogEntry } from '@/components/game/types'
import { projectGame } from '@/utils/gameProjection'
import { useProjectedGameState, useGameUI } from '@/hooks/useGameState'
import { useGameStore } from '@/stores/gameStore'

const card = (id: string, category: CardData['category']): CardData => ({ id, category, frontImage: 'fixture-front', backImage: 'fixture-back' })
const situation = card('situation-TH1', 'situation')
const emotion = card('emotion-nhe1', 'emotion')
const reflection = card('reflection-PT1', 'reflection')
const entry = (selected: CardData, round = 1): GameLogEntry => ({ type: 'SELECT_CARD', actorId: 'guest', timestamp: 1, data: { card: selected, round } })
const room = (patch: Partial<RoomState> = {}): RoomState => ({
  id: 'fixture', host: 'guest', status: 'playing', phase: 'reflection-sharing', currentRound: 1,
  players: [{ userId: 'guest', socketId: 'new-socket', name: 'Guest', isSender: true, coins: { red: 20, green: 0, yellow: 0 } }],
  gameLog: [entry(situation), entry(emotion), entry(reflection)], selectedCard: reflection, ...patch,
})

afterEach(cleanup)
describe('read-only accepted projection boundary', () => {
  it('does not resurrect downstream selections after rollback and forward navigation', () => {
    const selected = card('emotion-nhe2', 'emotion')
    const snapshot = room({ phase: 'story-telling', selectedCard: selected, gameLog: [
      entry(situation), entry(emotion), entry(reflection),
      { type: 'PHASE_CHANGED', actorId: 'host', timestamp: 2, data: { phase: 'emotion-card', direction: 'previous' } },
      entry(selected),
      { type: 'PHASE_CHANGED', actorId: 'host', timestamp: 3, data: { phase: 'story-telling', direction: 'next' } },
    ] })
    expect(projectGame(snapshot, 'guest', '').selectedCards).toEqual({ situation, emotion: selected, reflections: [] })
  })
  it('focuses by seat identity and never retains old private role or coin data', () => {
    const initial = projectGame(room(), 'guest', '').players
    const { result, rerender } = renderHook(({ players }) => useGameUI(players), { initialProps: { players: initial } })
    act(() => result.current.setExpandedPlayer(initial[0]))
    const refreshed = [{ ...initial[0], id: 'reconnected', role: 'New visible role', coins: { red: 0, green: 2, yellow: 0 } }]
    rerender({ players: refreshed })
    expect(result.current.expandedPlayer).toBe(refreshed[0])
    rerender({ players: [] })
    expect(result.current.expandedPlayer).toBeNull()
  })
  it('does not share modal/inventory state between mounted room scopes', () => {
    const first = renderHook(() => useGameUI([]))
    act(() => { first.result.current.setShowInventory(true); first.result.current.setInventoryMode({ category: 'emotion', showConfirm: true }) })
    const second = renderHook(() => useGameUI([]))
    expect(first.result.current.showInventory).toBe(true)
    expect(second.result.current.showInventory).toBe(false)
    expect(second.result.current.inventoryMode).toEqual({ showConfirm: false })
  })
  it('restores every category on cold resume, not just selectedCard', () => {
    const projected = projectGame(room(), 'guest', 'old-socket')
    expect(projected.selectedCards).toEqual({ situation, emotion, reflections: [reflection] })
    expect(projected.myPlayer?.id).toBe('new-socket')
    expect(projected.playersByUserId.get('guest')).toBe(projected.myPlayer)
  })
  it('does not carry selections or player authority into another room', () => {
    const { result, rerender } = renderHook(({ snapshot }) => useProjectedGameState(snapshot, 'guest', 'old-socket'), { initialProps: { snapshot: room() } })
    expect(result.current.myPlayer?.isSender).toBe(true)
    rerender({ snapshot: room({ id: 'next', status: 'waiting', phase: undefined, players: [], selectedCard: null, gameLog: [] }) })
    expect(result.current.selectedCards).toEqual({ reflections: [] })
    expect(result.current.myPlayer).toBeUndefined()
  })
  it('isolates rounds with and without a round-start marker', () => {
    const logs = [entry(situation), { type: 'ROUND_STARTED', actorId: '', timestamp: 2, data: { round: 2 } }, entry(emotion, 2)]
    for (const gameLog of [logs, [entry(situation), entry(emotion, 2)]]) {
      expect(projectGame(room({ currentRound: 2, gameLog, selectedCard: emotion }), 'guest', '').selectedCards).toEqual({ emotion, reflections: [] })
    }
  })
  it.each(['emotion-card', 'reflection-card', 'selfcare-card', 'situation-card'] as const)('respects cleared rollback selection in %s without mutating logs', phase => {
    const snapshot = room({ phase, selectedCard: null })
    const before = JSON.stringify(snapshot)
    const projected = projectGame(snapshot, 'guest', '')
    if (phase === 'emotion-card') expect(projected.selectedCards.emotion).toBeUndefined()
    if (phase === 'reflection-card') expect(projected.selectedCards.reflections).toEqual([])
    if (phase === 'selfcare-card') expect(projected.selectedCards.selfcare).toBeUndefined()
    if (phase === 'situation-card') expect(projected.selectedCards).toEqual({ reflections: [] })
    expect(JSON.stringify(snapshot)).toBe(before)
  })
  it('updates an emotion replacement, and deduplicates the latest reflection', () => {
    const replacement = card('emotion-nhe2', 'emotion')
    expect(projectGame(room({ selectedCard: replacement }), 'guest', '').selectedCards.emotion).toBe(replacement)
    expect(projectGame(room(), 'guest', '').selectedCards.reflections).toEqual([reflection])
  })
  it('does not read locally optimistic legacy card/player/phase state', () => {
    const before = useGameStore.getState()
    useGameStore.setState({ selectedCards: { emotion: card('local-only', 'emotion'), reflections: [] }, players: [], gameStep: 'ended' })
    try {
      const result = projectGame(room(), 'guest', '')
      expect(result.selectedCards.emotion).toEqual(emotion)
      expect(result.players).toHaveLength(1)
    } finally { useGameStore.setState(before) }
  })
  it('preserves red holdings in play, shows received at reward and totals at ended', () => {
    const coinCycle = { version: 'coin-cycle/v1', closed: false, received: { guest: { red: 2, green: 3, yellow: 4 } }, history: [{ round: 0, received: { guest: { red: 1, green: 1, yellow: 1 } } }] }
    expect(projectGame(room({ coinCycle }), 'guest', '').myPlayer?.coins.red).toBe(20)
    expect(projectGame(room({ coinCycle, phase: 'reward' }), 'guest', '').myPlayer?.coins).toEqual({ red: 2, green: 3, yellow: 4 })
    expect(projectGame(room({ coinCycle, status: 'ended' }), 'guest', '').myPlayer?.coins).toEqual({ red: 3, green: 4, yellow: 5 })
  })
  it('keeps memo identity across local-only renders and derives again for a new snapshot', () => {
    const snapshot = room()
    const { result, rerender } = renderHook(({ value }) => useProjectedGameState(value, 'guest', ''), { initialProps: { value: snapshot } })
    const previous = result.current
    rerender({ value: snapshot })
    expect(result.current).toBe(previous)
    rerender({ value: { ...snapshot, players: snapshot.players.map(p => ({ ...p, name: 'Changed' })) } })
    expect(result.current).not.toBe(previous)
    expect(result.current.myPlayer?.name).toBe('Changed')
  })
  it('retains legacy socket fallback without treating another stable seat as me', () => {
    expect(projectGame(room({ players: [{ socketId: 'legacy', name: 'Legacy' }] }), 'guest', 'legacy').myPlayer?.name).toBe('Legacy')
    expect(projectGame(room(), 'other-user', 'new-socket').myPlayer).toBeUndefined()
  })
})
