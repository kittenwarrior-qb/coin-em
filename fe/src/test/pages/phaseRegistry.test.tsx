import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PHASE_LABELS } from '@/stores/types'
import type { PhaseView } from '@/components/game/types'
import { PHASE_UI, validPhaseView, availableCapabilities, type StatusContext } from '@/features/game/phases/registry'
import GameBoard from '@/pages/GameBoard'

const capabilities: PhaseView['capabilities'] = { advance: false, rollback: false, heal: false, silence: false,
  selectSituation: false, selectEmotion: false, selectReflection: false, selectSelfcare: false, guessSilencer: false, isHealer: false, isSilencer: false }
const view: PhaseView = { version: 'phase-view/v1', phase: 'night', position: 2, total: 16, next: 'healer-turn', previous: 'role-reveal', capabilities }
const context: StatusContext = { isSender: false, isNarrator: false, isHealer: false, isSilencer: false, healerDone: false,
  silencerDone: false, emotionSelected: false, selfcareTurn: false, selfcareChooser: 'Người chọn thẻ', canGuess: false, rewardsConfirmed: false, finiteCoins: true }
afterEach(cleanup)
describe('exhaustive presentation registry and safe diagnostic', () => {
  it('covers every existing phase including terminal, never chooses navigation', () => {
    expect(Object.keys(PHASE_UI).sort()).toEqual(Object.keys(PHASE_LABELS).sort())
    for (const renderer of Object.values(PHASE_UI)) {
      expect(renderer(context).title).not.toBe('')
      expect(renderer({ ...context, isSender: true, isNarrator: true, isHealer: true, isSilencer: true, selfcareTurn: true }).title).not.toBe('')
    }
  })
  it('uses optional Coin wording and max-three reflection wording, not mandatory gifts', () => {
    expect(PHASE_UI['give-coins'](context).description).toContain('Không bắt buộc')
    expect(PHASE_UI['group-response']({ ...context, isSender: true }).title).toContain('Coin Đỏ')
    expect(PHASE_UI['reflection-card']({ ...context, isSender: true }).title).toContain('tối đa 3')
  })
  it('validates matching version/phase, position, destinations and all capability booleans', () => {
    expect(validPhaseView(view, 'night')).toBe(true)
    for (const invalid of [null, { ...view, version: 'future' }, { ...view, phase: 'unknown' }, { ...view, next: 'unknown' },
      { ...view, position: 17 }, { ...view, total: 0 }, { ...view, capabilities: {} }, { ...view, capabilities: { ...capabilities, advance: 'yes' } }]) {
      expect(validPhaseView(invalid, 'night')).toBe(false)
    }
    expect(validPhaseView(view, 'emotion-card')).toBe(false)
    expect(validPhaseView(view, '__proto__')).toBe(false)
    expect(validPhaseView({ ...view, phase: 'ended', position: null, next: null, previous: null }, 'ended')).toBe(true)
    expect(validPhaseView({ ...view, phase: 'ended', position: null, next: null, previous: null, capabilities: { ...capabilities, advance: true } }, 'ended')).toBe(false)
    expect(validPhaseView({ ...view, position: null }, 'night')).toBe(false)
  })
  it('masks every mutation hint offline without erasing the own already-visible role', () => {
    for (const phase of Object.keys(PHASE_UI)) {
      const server = { ...view, phase: phase as PhaseView['phase'], capabilities: Object.fromEntries(Object.keys(capabilities).map(key => [key, true])) as PhaseView['capabilities'] }
      const offline = availableCapabilities(server, false)
      expect(offline.isHealer).toBe(true)
      expect(offline.isSilencer).toBe(true)
      expect(Object.entries(offline).filter(([key]) => key !== 'isHealer' && key !== 'isSilencer').every(([, enabled]) => !enabled)).toBe(true)
      expect(availableCapabilities(server, true)).toBe(server.capabilities)
    }
  })
  it('keeps the real confirmed board mounted offline but disables card controls until connected', () => {
    const mutate = vi.fn()
    const props = { roomId: 'fixture', roomState: { id: 'fixture', host: 'guest', players: [{ userId: 'guest', socketId: 'socket', name: 'Guest', isSender: true }], status: 'playing',
      phase: 'emotion-card' as const, phaseView: { ...view, phase: 'emotion-card' as const, capabilities: { ...capabilities, selectEmotion: true } } },
      myUserId: 'guest', mySocketId: 'socket', onLeave: vi.fn(), nextTurn: mutate, prevTurn: mutate, nightAction: mutate,
      emitSelectCard: mutate, sendResponse: mutate, ntgVote: mutate, confirmRoleRewards: mutate, shareReflection: mutate,
      emitCardPreview: mutate, emitSituationFanState: mutate, situationPreviewCard: null, situationFanState: null,
      submitVote: mutate, giveCoin: vi.fn().mockResolvedValue(false) }
    const rendered = render(<GameBoard {...props} isConnected={false} />)
    expect(screen.getByTestId('btn-select-emotion')).toBeDisabled()
    expect(screen.getByTestId('game-phase')).toHaveAttribute('data-phase', 'emotion-card')
    fireEvent.click(screen.getByTestId('btn-select-emotion'))
    expect(mutate).not.toHaveBeenCalled()
    rendered.rerender(<GameBoard {...props} isConnected />)
    expect(screen.getByTestId('btn-select-emotion')).toBeEnabled()
  })
  it.each([undefined, 'future-phase', '__proto__'])('offers no gameplay mutation for unsupported phase %s', phase => {
    const leave = vi.fn(), mutate = vi.fn()
    render(<GameBoard roomId="fixture" roomState={{ id: 'fixture', host: 'guest', players: [], status: 'playing', phase: phase as never }}
      myUserId="guest" mySocketId="socket" onLeave={leave} nextTurn={mutate} prevTurn={mutate} nightAction={mutate}
      emitSelectCard={mutate} sendResponse={mutate} ntgVote={mutate} confirmRoleRewards={mutate} shareReflection={mutate}
      emitCardPreview={mutate} emitSituationFanState={mutate} situationPreviewCard={null} situationFanState={null}
      submitVote={mutate} giveCoin={vi.fn().mockResolvedValue(false)} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa có thông tin lượt chơi tương thích')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(mutate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Rời phòng' }))
    expect(leave).toHaveBeenCalledOnce()
  })
})
