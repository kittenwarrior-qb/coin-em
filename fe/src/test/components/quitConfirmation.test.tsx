import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { QuitConfirmModal } from '@/components/cartoon/QuitConfirmModal'
afterEach(cleanup)
it('keeps quit intent and disables confirmation/cancel/backdrop until ACK', async () => {
  let ack!: (ok: boolean) => void
  const confirm = vi.fn(() => new Promise<boolean>(resolve => { ack = resolve })), cancel = vi.fn()
  render(<QuitConfirmModal open onConfirm={confirm} onCancel={cancel} confirmLabel="Rời" cancelLabel="Ở lại" />)
  fireEvent.click(screen.getByRole('button', { name: 'Rời' }))
  for (const button of screen.getAllByRole('button')) { expect(button).toBeDisabled(); fireEvent.click(button) }
  fireEvent.click(screen.getByTestId('cartoon-modal-overlay'))
  expect(confirm).toHaveBeenCalledOnce()
  expect(cancel).not.toHaveBeenCalled()
  await act(async () => { ack(false) })
  expect(screen.getByRole('button', { name: 'Rời' })).toBeEnabled()
  expect(cancel).not.toHaveBeenCalled()
})
