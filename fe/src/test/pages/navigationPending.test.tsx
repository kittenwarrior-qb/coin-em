import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PhaseNavConfirmModal } from '@/components/game/GameModals'

afterEach(cleanup)
it('keeps navigation intent pending and blocks duplicate confirmation/cancel until resolved', () => {
  const confirm = vi.fn(), cancel = vi.fn()
  const props = { navigation: { direction: 'next' as const, targetPhase: 'night' as const }, activePhase: 'role-reveal', onConfirm: confirm, onCancel: cancel }
  const { rerender } = render(<PhaseNavConfirmModal {...props} pending />)
  const button = screen.getByRole('button', { name: 'Tiếp tục' })
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()
  fireEvent.click(button)
  fireEvent.click(screen.getByTestId('phase-nav-confirm-popup').parentElement!)
  expect(confirm).not.toHaveBeenCalled()
  expect(cancel).not.toHaveBeenCalled()
  rerender(<PhaseNavConfirmModal {...props} />)
  fireEvent.click(button)
  expect(confirm).toHaveBeenCalledWith('next')
})
