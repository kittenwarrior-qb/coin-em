import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBoardController } from '@/features/game/controllers/useBoardController'
import type { GameBoardProps } from '@/features/game/controllers/boardTypes'
import type { RoomState } from '@/components/game/types'
import { GAME_ROLES } from '@/stores/types'
import { CARD_DATA } from '@/constants/cardCatalog'

afterEach(cleanup)
const deferred = () => {
  let resolve!: (value: boolean) => void
  const promise = new Promise<boolean>(done => { resolve = done })
  return { promise, resolve }
}
function fixture(): GameBoardProps {
  const roomState: RoomState = {
    id: 'synthetic-controller-room', host: 'narrator-user', status: 'playing',
    phase: 'healer-turn', phaseInstance: 'synthetic-phase-1', revision: 1,
    currentRound: 1, totalRounds: 5, currentNarrator: 'narrator-user', currentNTG: 'sender-user',
    players: [
      { userId: 'healer-user', socketId: 'me', name: 'Healer fixture', role: GAME_ROLES.healer, coins: { red: 0, green: 5, yellow: 5 } },
      { userId: 'target-user', socketId: 'target', name: 'Target fixture', coins: { red: 0, green: 5, yellow: 5 } },
      { userId: 'other-user', socketId: 'other', name: 'Other fixture', coins: { red: 0, green: 5, yellow: 5 } },
      { userId: 'narrator-user', socketId: 'narrator', name: 'Narrator fixture', isNarrator: true },
      { userId: 'sender-user', socketId: 'sender', name: 'Sender fixture', isSender: true },
    ], gameLog: [], nightActions: { healed: false, silenced: false, cardSelected: false },
    phaseView: { version: 'phase-view/v1', phase: 'healer-turn', position: 3, total: 16,
      previous: 'night', next: 'silencer-turn', capabilities: { advance: false, rollback: false,
        heal: true, silence: false, selectSituation: false, selectEmotion: false,
        selectReflection: false, selectSelfcare: false, guessSilencer: false,
        isHealer: true, isSilencer: false } },
  }
  return { roomId: roomState.id, roomState, mySocketId: 'me', myUserId: 'healer-user',
    isConnected: true, onLeave: vi.fn(async () => true), nextTurn: vi.fn(async () => true),
    prevTurn: vi.fn(async () => true), nightAction: vi.fn(async () => true),
    emitSelectCard: vi.fn(async () => true), sendResponse: vi.fn(async () => true),
    ntgVote: vi.fn(async () => true), confirmRoleRewards: vi.fn(async () => true),
    shareReflection: vi.fn(async () => true), emitCardPreview: vi.fn(),
    emitSituationFanState: vi.fn(), situationPreviewCard: null, situationFanState: null,
    submitVote: vi.fn(async () => true), giveCoin: vi.fn(async () => true) }
}

describe('board controller uses one admitted projection and scoped local intent', () => {
  const projectPhase = (props: GameBoardProps, phase: 'role-reveal' | 'night', position: number | null, round = props.roomState.currentRound): GameBoardProps => ({
    ...props, roomState: { ...props.roomState, phase, currentRound: round,
      phaseView: { ...props.roomState.phaseView!, phase, position,
        previous: phase === 'role-reveal' ? null : 'role-reveal', next: phase === 'role-reveal' ? 'night' : 'healer-turn' } },
  })
  it('does not celebrate rollback into an already passed phase', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    rerender(projectPhase(props, 'role-reveal', 1))
    expect(result.current.celebrationRun).toBe(0)
    rerender(projectPhase(props, 'night', 2))
    rerender(projectPhase(props, 'role-reveal', 1))
    expect(result.current.celebrationRun).toBe(0)
  })
  it('baselines a new room/viewer and an invalid phase position without motion', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    const newRoom = projectPhase(props, 'role-reveal', 1)
    rerender({ ...newRoom, roomId: 'other-fixture-room', roomState: { ...newRoom.roomState, id: 'other-fixture-room' } })
    expect(result.current.celebrationRun).toBe(0)
    rerender(props)
    rerender({ ...projectPhase(props, 'role-reveal', 1), myUserId: 'other-user' })
    expect(result.current.celebrationRun).toBe(0)
    rerender(props)
    rerender(projectPhase(props, 'role-reveal', null))
    expect(result.current.celebrationRun).toBe(0)
    const missingRound = projectPhase(props, 'role-reveal', 1)
    delete missingRound.roomState.currentRound
    rerender(missingRound)
    expect(result.current.celebrationRun).toBe(0)
  })
  it('celebrates an uninterrupted next round once, not its later rollback/reentry', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    const nextRound = projectPhase(props, 'role-reveal', 1, 2)
    rerender(nextRound)
    expect(result.current.celebrationRun).toBe(1)
    rerender(projectPhase(props, 'night', 2, 2))
    rerender(nextRound)
    expect(result.current.celebrationRun).toBe(1)
  })
  it('does not replay reconnect or skipped-round hydration', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    rerender({ ...props, isConnected: false })
    rerender(projectPhase(props, 'role-reveal', 1, 2))
    expect(result.current.celebrationRun).toBe(0)
    rerender(projectPhase(props, 'night', 2, 2))
    rerender(projectPhase(props, 'role-reveal', 1, 4))
    expect(result.current.celebrationRun).toBe(0)
  })
  it('cancels old-scope/offline motion while keeping fresh run IDs monotonic', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    const nextRound = projectPhase(props, 'role-reveal', 1, 2)
    rerender(nextRound)
    expect(result.current.celebrationRun).toBe(1)
    rerender({ ...nextRound, isConnected: false })
    expect(result.current.celebrationRun).toBe(0)
    rerender(nextRound)
    expect(result.current.celebrationRun).toBe(0)
    rerender(projectPhase(props, 'night', 2, 2))
    rerender(projectPhase(props, 'role-reveal', 1, 3))
    expect(result.current.celebrationRun).toBe(2)
    const otherRoom = projectPhase(props, 'night', 2, 3)
    rerender({ ...otherRoom, roomId: 'other-motion-scope', roomState: { ...otherRoom.roomState, id: 'other-motion-scope' } })
    expect(result.current.celebrationRun).toBe(0)
  })
  it('keeps navigation intent until confirmed and uses only the admitted capability', async () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.setPhaseNavigation({ direction: 'next', targetPhase: 'silencer-turn' }))
    await act(async () => result.current.handleConfirmPhaseNavigation('next'))
    expect(props.nextTurn).not.toHaveBeenCalled()
    const admitted = { ...props, roomState: { ...props.roomState,
      phaseView: { ...props.roomState.phaseView!, capabilities: { ...props.roomState.phaseView!.capabilities, advance: true } } } }
    rerender(admitted)
    vi.mocked(props.nextTurn).mockResolvedValueOnce(false)
    await act(async () => result.current.handleConfirmPhaseNavigation('next'))
    expect(result.current.phaseNavigation).toEqual({ direction: 'next', targetPhase: 'silencer-turn' })
    await act(async () => result.current.handleConfirmPhaseNavigation('next'))
    expect(result.current.phaseNavigation).toBeNull()
    expect(props.nextTurn).toHaveBeenCalledTimes(2)
    expect(props.prevTurn).not.toHaveBeenCalled()
  })
  it('only closes the menu after positive leave confirmation', async () => {
    const props = fixture()
    vi.mocked(props.onLeave).mockResolvedValueOnce(false)
    const { result } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.setShowMenu(true))
    await act(async () => { expect(await result.current.handleMenuQuit()).toBe(false) })
    expect(result.current.showMenu).toBe(true)
    await act(async () => { expect(await result.current.handleMenuQuit()).toBe(true) })
    expect(result.current.showMenu).toBe(false)
    expect(props.onLeave).toHaveBeenCalledTimes(2)
  })
  it('preserves original fan card identities and the empty-list undefined relay shape', () => {
    const props = fixture()
    const { result } = renderHook(useBoardController, { initialProps: props })
    const cards = [CARD_DATA.situation[0]]
    act(() => result.current.handleSituationFanState(cards, 0))
    expect(props.emitSituationFanState).toHaveBeenLastCalledWith(props.roomState.id, 0, cards)
    expect(vi.mocked(props.emitSituationFanState).mock.calls[0][2]).toBe(cards)
    act(() => result.current.handleSituationFanState([], 0))
    expect(props.emitSituationFanState).toHaveBeenLastCalledWith(props.roomState.id, 0, undefined)
  })
  it('keeps same-scope drafts across revisions but resets on same-phase reentry', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.handleHealTarget('target'))
    expect(result.current.selectedNightAction).toMatchObject({ targetId: 'target', confirmed: false })
    rerender({ ...props, roomState: { ...props.roomState, revision: 2 } })
    expect(result.current.selectedNightAction?.targetId).toBe('target')
    rerender({ ...props, roomState: { ...props.roomState, phaseInstance: 'synthetic-phase-2' } })
    expect(result.current.selectedNightAction).toBeNull()
    expect(props.nightAction).not.toHaveBeenCalled()
  })
  it('blocks duplicate confirmation and preserves an uncertain draft without speculative feedback', async () => {
    const props = fixture(), pending = deferred()
    vi.mocked(props.nightAction).mockReturnValueOnce(pending.promise)
    const { result } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.handleHealTarget('target'))
    let request!: Promise<void>
    act(() => { request = result.current.confirmHealTarget('target') })
    expect(result.current.phaseActionPending).toBe(true)
    await act(async () => result.current.confirmHealTarget('target'))
    expect(props.nightAction).toHaveBeenCalledExactlyOnceWith(props.roomState.id, 'heal', 'target')
    expect(result.current.healerActionDone).toBe(false)
    expect(result.current.flyingActionEffect).toBeNull()
    await act(async () => { pending.resolve(false); await request })
    expect(result.current.selectedNightAction).toMatchObject({ targetId: 'target', confirmed: false })
    expect(result.current.phaseActionPending).toBe(false)
    await act(async () => result.current.confirmHealTarget('target'))
    expect(result.current.selectedNightAction?.confirmed).toBe(true)
    expect(result.current.healerActionDone).toBe(true)
    expect(result.current.flyingActionEffect).toBeNull()
  })
  it('does not let an old ACK complete or release a newer phase intent', async () => {
    const props = fixture(), first = deferred(), second = deferred()
    vi.mocked(props.nightAction).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.handleHealTarget('target'))
    let oldRequest!: Promise<void>, newRequest!: Promise<void>
    act(() => { oldRequest = result.current.confirmHealTarget('target') })
    rerender({ ...props, roomState: { ...props.roomState, phaseInstance: 'synthetic-phase-2' } })
    act(() => result.current.handleHealTarget('other'))
    act(() => { newRequest = result.current.confirmHealTarget('other') })
    await act(async () => { first.resolve(true); await oldRequest })
    expect(result.current.phaseActionPending).toBe(true)
    expect(result.current.selectedNightAction).toMatchObject({ targetId: 'other', confirmed: false })
    expect(result.current.healerActionDone).toBe(false)
    await act(async () => { second.resolve(true); await newRequest })
    expect(result.current.selectedNightAction).toMatchObject({ targetId: 'other', confirmed: true })
    expect(result.current.phaseActionPending).toBe(false)
  })
  it('resolves focused players from the latest stable-identity projection rather than retaining a copy', () => {
    const props = fixture()
    const { result, rerender } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.setExpandedPlayer(result.current.players.find(player => player.id === 'target')!))
    const updated = { ...props.roomState, revision: 2,
      players: props.roomState.players.map(player => player.userId === 'target-user'
        ? { ...player, socketId: 'replacement-target', name: 'Updated synthetic target', coins: { red: 2, green: 1, yellow: 3 } } : player) }
    rerender({ ...props, roomState: updated })
    expect(result.current.expandedPlayer).toMatchObject({ id: 'replacement-target',
      name: 'Updated synthetic target', coins: { red: 2, green: 1, yellow: 3 } })
    expect(result.current.roomState).toBe(updated)
  })
  it('does not send domain commands offline', async () => {
    const props = fixture()
    const { result } = renderHook(useBoardController, { initialProps: { ...props, isConnected: false } })
    await act(async () => result.current.confirmHealTarget('target'))
    act(() => result.current.handleAdvance())
    await act(async () => { expect(await result.current.handleGiveCoin('target', 'yellow')).toBe(false) })
    expect(props.nightAction).not.toHaveBeenCalled()
    expect(props.nextTurn).not.toHaveBeenCalled()
    expect(props.giveCoin).not.toHaveBeenCalled()
  })
  it('makes late pending completion inert after unmount', async () => {
    const props = fixture(), pending = deferred()
    vi.mocked(props.nightAction).mockReturnValueOnce(pending.promise)
    const { result, unmount } = renderHook(useBoardController, { initialProps: props })
    act(() => result.current.handleHealTarget('target'))
    let request!: Promise<void>
    act(() => { request = result.current.confirmHealTarget('target') })
    unmount()
    await act(async () => { pending.resolve(true); await request })
    expect(props.nightAction).toHaveBeenCalledTimes(1)
    expect(props.nextTurn).not.toHaveBeenCalled()
  })
})
