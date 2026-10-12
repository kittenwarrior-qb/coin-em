import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WaitingRoom from '@/pages/WaitingRoom'
const players = Array.from({ length: 5 }, (_, i) => ({ userId: `u${i}`, socketId: `s${i}`, name: `QA${i}` }))
const base = { roomId: 'qa', players, hostSocketId: 'u0', mySocketId: 's0', myUserId: 'u0', onStartGame: vi.fn(), onLeave: vi.fn() }
beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('shows auto/1–N, requires saving a short-game choice and locks start/leave during pending ACK', async () => {
  let done!: (ok: boolean) => void
  const save = vi.fn(() => new Promise<boolean>(resolve => { done = resolve }))
  const view = render(<WaitingRoom {...base} onUpdateRoundLimit={save} />)
  expect(screen.getByRole('option', { name: '5 lượt' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: '6 lượt' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: 'Số lượt chơi' }), { target: { value: '1' } })
  expect(screen.getByText(/Ván ngắn/)).toBeInTheDocument()
  expect(screen.getByTestId('btn-start-game')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu số lượt' }))
  expect(screen.getByTestId('btn-leave-room')).toBeDisabled()
  expect(save).toHaveBeenCalledWith(1)
  await act(async () => { done(true) })
  view.rerender(<WaitingRoom {...base} roundLimit={1} onUpdateRoundLimit={save} />)
  expect(screen.getByTestId('btn-start-game')).toBeEnabled()
})
it('blocks out-of-range confirmed count after roster shrinks and prevents non-host edits', () => {
  const view = render(<WaitingRoom {...base} roundLimit={6} onUpdateRoundLimit={vi.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Số lượt vượt')
  expect(screen.getByTestId('btn-start-game')).toBeDisabled()
  view.rerender(<WaitingRoom {...base} myUserId="u1" roundLimit={3} onUpdateRoundLimit={vi.fn()} />)
  expect(screen.getByRole('combobox', { name: 'Số lượt chơi' })).toBeDisabled()
})
