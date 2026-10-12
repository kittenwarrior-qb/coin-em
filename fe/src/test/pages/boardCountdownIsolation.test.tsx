import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GameBoard from '@/pages/GameBoard'
import * as table from '@/components/game/TableBoard'
import type { PhaseView, RoomState } from '@/components/game/types'

const capabilities: PhaseView['capabilities'] = { advance: true, rollback: true, heal: false, silence: false,
  selectSituation: false, selectEmotion: false, selectReflection: false, selectSelfcare: false, guessSilencer: false, isHealer: false, isSilencer: false }
const room: RoomState = { id: 'countdown-fixture', host: 'guest', status: 'playing', phase: 'night',
  phaseInstance: 'night-1', revision: 1, currentRound: 1,
  players: [{ userId: 'guest', socketId: 'socket', name: 'Guest', isNarrator: true }],
  phaseView: { version: 'phase-view/v1', phase: 'night', position: 2, total: 16,
    next: 'healer-turn', previous: 'role-reveal', capabilities } }

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

it('real GameBoard does not re-render TableBoard or send commands for display ticks; new projections still render', () => {
  const tableRender = vi.spyOn(table, 'TableBoard') // Calls the original, not a replacement component.
  const nextTurn = vi.fn(), prevTurn = vi.fn(), nightAction = vi.fn(), emitSelectCard = vi.fn()
  const props = { roomId: room.id, roomState: room, myUserId: 'guest', mySocketId: 'socket', isConnected: true,
    onLeave: vi.fn(), nextTurn, prevTurn, nightAction, emitSelectCard, sendResponse: vi.fn(),
    ntgVote: vi.fn(), confirmRoleRewards: vi.fn(), shareReflection: vi.fn(), emitCardPreview: vi.fn(),
    emitSituationFanState: vi.fn(), situationPreviewCard: null, situationFanState: null,
    submitVote: vi.fn(), giveCoin: vi.fn().mockResolvedValue(false) }
  const { rerender } = render(<GameBoard {...props} />)
  const initialRenders = tableRender.mock.calls.length
  expect(initialRenders).toBeGreaterThan(0)
  expect(screen.getByTestId('turn-countdown-popup')).toHaveTextContent('30')
  for (let n = 0; n < 5; n++) act(() => { vi.advanceTimersByTime(1000) })
  expect(screen.getByTestId('turn-countdown-popup')).toHaveTextContent('25')
  expect(tableRender).toHaveBeenCalledTimes(initialRenders)
  for (const command of [nextTurn, prevTurn, nightAction, emitSelectCard]) expect(command).not.toHaveBeenCalled()
  rerender(<GameBoard {...props} roomState={{ ...room, revision: 2,
    players: [{ ...room.players[0], name: 'Updated fixture' }] }} />)
  expect(tableRender.mock.calls.length).toBeGreaterThan(initialRenders)
  expect(screen.getByTestId('turn-countdown-popup')).toHaveTextContent('25')
})
