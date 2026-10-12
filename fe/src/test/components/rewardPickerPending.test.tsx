import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { NtgRewardPicker } from '@/components/game/NtgRewardPicker'
import { RoleRewardPicker } from '@/components/game/RoleRewardPicker'
import type { Player } from '@/components/game/types'

afterEach(async () => { cleanup(); await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined()) })
const players: Player[] = [{ id: 'partner', name: 'Partner', role: 'Người Kết Nối', isMe: false, coins: { red: 0, yellow: 0, green: 0 } }]
const kinds = ['ntg', 'role'] as const
const fixture = (kind: typeof kinds[number], pending: boolean, confirm: (...args: unknown[]) => void, close: () => void, toggle: (id: string) => void) => kind === 'ntg'
  ? <NtgRewardPicker pending={pending} players={players} pendingIds={new Set(['partner'])} rewardedIds={new Set()} onTogglePending={toggle} onConfirm={confirm} onClose={close} />
  : <RoleRewardPicker pending={pending} players={players} ntgPlayer={players[0]} ntgVotedIds={new Set()} onConfirm={confirm} onClose={close} />

it.each(kinds)('%s picker blocks every control and backdrop while waiting for ACK', kind => {
  const confirm = vi.fn(), close = vi.fn(), toggle = vi.fn()
  const { rerender } = render(fixture(kind, true, confirm, close, toggle))
  for (const button of screen.getAllByRole('button', { hidden: true })) { expect(button).toBeDisabled(); fireEvent.click(button) }
  fireEvent.click(screen.getByTestId(`${kind}-reward-picker`))
  expect(confirm).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
  expect(toggle).not.toHaveBeenCalled()
  rerender(fixture(kind, false, confirm, close, toggle))
  const buttons = screen.getAllByRole('button')
  fireEvent.click(buttons[buttons.length - 1])
  expect(confirm).toHaveBeenCalledOnce()
})

it.each(kinds)('%s picker cannot emit from its animated exit', async kind => {
  const confirm = vi.fn(), close = vi.fn(), toggle = vi.fn()
  const view = (open: boolean) => <AnimatePresence>{open && fixture(kind, false, confirm, close, toggle)}</AnimatePresence>
  const { rerender } = render(view(true))
  rerender(view(false))
  for (const button of screen.getAllByRole('button', { hidden: true })) { expect(button).toBeDisabled(); fireEvent.click(button) }
  fireEvent.click(screen.getByTestId(`${kind}-reward-picker`))
  expect(confirm).not.toHaveBeenCalled()
  expect(close).not.toHaveBeenCalled()
  expect(toggle).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByTestId(`${kind}-reward-picker`)).not.toBeInTheDocument())
})

it.each(kinds)('%s Back/Esc never implicitly submits or advances a mandatory decision', async kind => {
  const confirm = vi.fn(), close = vi.fn(), toggle = vi.fn()
  const { rerender } = render(fixture(kind, true, confirm, close, toggle))
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  expect(close).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled()
  rerender(fixture(kind, false, confirm, close, toggle))
  fireEvent.keyDown(document, { key: 'Escape' })
  if (kind === 'ntg') expect(close).toHaveBeenCalledOnce()
  else expect(close).not.toHaveBeenCalled()
  expect(confirm).not.toHaveBeenCalled(); expect(toggle).not.toHaveBeenCalled()
})
