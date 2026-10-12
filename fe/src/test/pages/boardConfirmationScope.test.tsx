import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import GameBoard from '@/pages/GameBoard'
import type { RoomState, PhaseView } from '@/components/game/types'

afterEach(cleanup)
const capabilities: PhaseView['capabilities'] = { advance: true, rollback: true, heal: false, silence: false,
  selectSituation: false, selectEmotion: false, selectReflection: false, selectSelfcare: false, guessSilencer: false, isHealer: false, isSilencer: false }
const room: RoomState = { id: 'scope-fixture', host: 'guest', status: 'playing', phase: 'night', phaseInstance: 'night-1', revision: 1, currentRound: 1,
  players: [{ userId: 'guest', socketId: 'socket', name: 'Guest', isNarrator: true }],
  phaseView: { version: 'phase-view/v1', phase: 'night', position: 2, total: 16, next: 'healer-turn', previous: 'role-reveal', capabilities } }
const props = () => ({ roomId: room.id, roomState: room, myUserId: 'guest', mySocketId: 'socket', isConnected: true,
  onLeave: vi.fn(), nextTurn: vi.fn(), prevTurn: vi.fn(), nightAction: vi.fn(), emitSelectCard: vi.fn(),
  sendResponse: vi.fn(), ntgVote: vi.fn(), confirmRoleRewards: vi.fn(), shareReflection: vi.fn(),
  emitCardPreview: vi.fn(), emitSituationFanState: vi.fn(), situationPreviewCard: null, situationFanState: null,
  submitVote: vi.fn(), giveCoin: vi.fn().mockResolvedValue(false) })

const reflectionRoom: RoomState = { ...room, phase: 'reflection-sharing', phaseInstance: 'reflection-1', currentNTG: 'sender',
  players: [...room.players, { userId: 'sender', socketId: 'sender', name: 'Sender', role: 'Người Trao Gửi', isSender: true },
    { userId: 'partner', socketId: 'partner', name: 'Partner', role: 'Người Kết Nối' }],
  phaseView: { ...room.phaseView!, phase: 'reflection-sharing', position: 10, next: 'selfcare-card', previous: 'reflection-card' } }

it('waits for each legacy reward ACK before advancing, with no duplicate submission', async () => {
  let reflectionAck!: (ok: boolean) => void, roleAck!: (ok: boolean) => void, nextAck!: (ok: boolean) => void
  const base = { ...props(), roomState: reflectionRoom,
    shareReflection: vi.fn(() => new Promise<boolean>(resolve => { reflectionAck = resolve })),
    confirmRoleRewards: vi.fn(() => new Promise<boolean>(resolve => { roleAck = resolve })),
    nextTurn: vi.fn(() => new Promise<boolean>(resolve => { nextAck = resolve })) }
  render(<GameBoard {...base} />)
  fireEvent.click(screen.getByRole('button', { name: /Partner.*Người Kết Nối/ }))
  const confirm = screen.getByRole('button', { name: /^Xác nhận/ })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  expect(base.shareReflection).toHaveBeenCalledOnce()
  expect(base.confirmRoleRewards).not.toHaveBeenCalled()
  expect(confirm).toBeDisabled()
  await act(async () => { reflectionAck(true) })
  expect(base.confirmRoleRewards).toHaveBeenCalledOnce()
  expect(base.nextTurn).not.toHaveBeenCalled()
  await act(async () => { roleAck(true) })
  expect(base.nextTurn).toHaveBeenCalledOnce()
  expect(screen.getByTestId('role-reward-picker')).toBeInTheDocument()
  await act(async () => { nextAck(true) })
  await waitFor(() => expect(screen.queryByTestId('role-reward-picker')).not.toBeInTheDocument())
})

it.each(['reflection', 'roles'])('does not advance or discard selections after rejected %s ACK', async failure => {
  const base = { ...props(), roomState: reflectionRoom,
    shareReflection: vi.fn().mockResolvedValue(failure !== 'reflection'), confirmRoleRewards: vi.fn().mockResolvedValue(false), nextTurn: vi.fn() }
  render(<GameBoard {...base} />)
  fireEvent.click(screen.getByRole('button', { name: /Partner.*Người Kết Nối/ }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Xác nhận/ })) })
  expect(base.nextTurn).not.toHaveBeenCalled()
  expect(base.confirmRoleRewards).toHaveBeenCalledTimes(failure === 'reflection' ? 0 : 1)
  expect(screen.getByTestId('role-reward-picker')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Xác nhận/ })).toHaveTextContent('2')
})

it('stops an old multi-step reward continuation when its phase instance changes', async () => {
  let ack!: (ok: boolean) => void
  const base = { ...props(), roomState: reflectionRoom, shareReflection: vi.fn(() => new Promise<boolean>(resolve => { ack = resolve })), confirmRoleRewards: vi.fn(), nextTurn: vi.fn() }
  const { rerender } = render(<GameBoard {...base} />)
  fireEvent.click(screen.getByRole('button', { name: /^Xác nhận/ }))
  rerender(<GameBoard {...base} roomState={{ ...reflectionRoom, phaseInstance: 'reflection-2', revision: 2 }} />)
  await act(async () => { ack(true) })
  expect(base.confirmRoleRewards).not.toHaveBeenCalled()
  expect(base.nextTurn).not.toHaveBeenCalled()
})

it('does not mount legacy automatic rewards in a finite 60-Coin round', () => {
  const base = { ...props(), roomState: { ...reflectionRoom, coinCycle: { version: 'coin-cycle/v1', closed: false, received: {}, history: [] } } }
  render(<GameBoard {...base} />)
  expect(screen.queryByTestId('role-reward-picker')).not.toBeInTheDocument()
  expect(base.shareReflection).not.toHaveBeenCalled()
  expect(base.confirmRoleRewards).not.toHaveBeenCalled()
})

it('preserves navigation intent on same-phase revisions, but clears it on same-phase reentry', async () => {
  const base = props()
  const { rerender } = render(<GameBoard {...base} />)
  fireEvent.click(screen.getByTestId('btn-next-phase'))
  expect(screen.getByTestId('phase-nav-confirm-popup')).toBeInTheDocument()
  rerender(<GameBoard {...base} roomState={{ ...room, revision: 2 }} />)
  expect(screen.getByTestId('phase-nav-confirm-popup')).toBeInTheDocument()
  rerender(<GameBoard {...base} roomState={{ ...room, revision: 3, phaseInstance: 'night-2' }} />)
  // Exit animation remains mounted but is now inert/hidden from the accessible tree.
  const exitingConfirm = screen.getByRole('button', { name: /^Tiếp tục$/, hidden: true })
  expect(exitingConfirm).toBeDisabled()
  fireEvent.click(exitingConfirm)
  expect(base.nextTurn).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByTestId('phase-nav-confirm-popup')).not.toBeInTheDocument())
})

it('does not let old navigation completion close or unlock a newly pending confirmation', async () => {
  let oldAck!: (success: boolean) => void, newAck!: (success: boolean) => void
  const next = vi.fn().mockImplementationOnce(() => new Promise<boolean>(resolve => { oldAck = resolve }))
    .mockImplementationOnce(() => new Promise<boolean>(resolve => { newAck = resolve }))
  const base = { ...props(), nextTurn: next }
  const { rerender } = render(<GameBoard {...base} />)
  fireEvent.click(screen.getByTestId('btn-next-phase'))
  fireEvent.click(screen.getByRole('button', { name: /^Tiếp tục$/ }))
  expect(next).toHaveBeenCalledOnce()
  rerender(<GameBoard {...base} roomState={{ ...room, revision: 2, phaseInstance: 'night-2' }} />)
  fireEvent.click(screen.getByTestId('btn-next-phase'))
  fireEvent.click(screen.getByRole('button', { name: /^Tiếp tục$/ }))
  expect(next).toHaveBeenCalledTimes(2)
  await act(async () => { oldAck(true) })
  expect(screen.getByRole('button', { name: /^Tiếp tục$/ })).toBeDisabled()
  await act(async () => { newAck(true) })
  await waitFor(() => expect(screen.queryByTestId('phase-nav-confirm-popup')).not.toBeInTheDocument())
})

it('keeps the confirmed board and intent with a truthful inline alert on unexpected callback rejection', async () => {
  const base = { ...props(), nextTurn: vi.fn().mockRejectedValue(new Error('fixture')) }
  render(<GameBoard {...base} />)
  fireEvent.click(screen.getByTestId('btn-next-phase'))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Tiếp tục$/ })) })
  expect(screen.getByRole('alert')).toHaveTextContent('Chưa xác nhận được thao tác')
  expect(screen.getByTestId('game-phase')).toHaveAttribute('data-phase', 'night')
  expect(screen.getByTestId('phase-nav-confirm-popup')).toBeInTheDocument()
  expect(base.nextTurn).toHaveBeenCalledOnce()
})
