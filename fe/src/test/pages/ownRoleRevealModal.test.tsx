import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { OwnRoleRevealModal } from '@/features/game/components/OwnRoleRevealModal'

const flip = vi.hoisted(() => vi.fn())
vi.mock('@/components/game/FlipCard', () => ({ FlipCard: (props: { frontImage: string; backImage: string; altText: string; size: string; autoFlipDelayMs: number }) =>
  <button data-testid="original-role-card" data-size={props.size} data-auto-flip={props.autoFlipDelayMs} onClick={flip}>
    <img src={props.frontImage} alt={`${props.altText} - front`} /><img src={props.backImage} alt={`${props.altText} - back`} />
  </button> }))
afterEach(async () => {
  cleanup(); flip.mockClear()
  await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
})
const props = { role: 'Own approved role', backImage: '/original-role-back.png', roleImage: '/original-own-role.png' }

it('preserves original own-role front/back, large sizing, autoFlip450 and existing panel classes', () => {
  render(<OwnRoleRevealModal {...props} onClose={vi.fn()} />)
  const dialog = screen.getByRole('dialog', { name: 'Vai trò của bạn' })
  expect(dialog).toHaveClass('max-w-[430px]', 'max-h-[92dvh]')
  expect(screen.getByAltText(`${props.role} - front`)).toHaveAttribute('src', props.backImage)
  expect(screen.getByAltText(`${props.role} - back`)).toHaveAttribute('src', props.roleImage)
  expect(screen.getByTestId('original-role-card')).toHaveAttribute('data-size', 'large')
  expect(screen.getByTestId('original-role-card')).toHaveAttribute('data-auto-flip', '450')
  expect(screen.getByTestId('btn-close-role-reveal')).toHaveTextContent('Đã xem vai trò')
})

it('pending locks Back/Esc/close/flip; settled dismissal is local and returns actual opener focus', async () => {
  const close = vi.fn()
  function Harness({ pending }: { pending: boolean }) {
    const [open, setOpen] = useState(false)
    return <><button onClick={() => setOpen(true)}>Open own role</button>{open &&
      <OwnRoleRevealModal {...props} pending={pending} onClose={() => { close(); setOpen(false) }} />}</>
  }
  const { rerender } = render(<Harness pending />)
  const opener = screen.getByRole('button', { name: 'Open own role' })
  opener.focus(); fireEvent.click(opener)
  expect(screen.getByRole('dialog', { name: 'Vai trò của bạn' })).toHaveAttribute('aria-busy', 'true')
  fireEvent.click(screen.getByTestId('original-role-card'))
  fireEvent.click(screen.getByTestId('btn-close-role-reveal'))
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  expect(close).not.toHaveBeenCalled(); expect(flip).not.toHaveBeenCalled()
  rerender(<Harness pending={false} />)
  fireEvent.click(screen.getByTestId('original-role-card'))
  expect(flip).toHaveBeenCalledOnce()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  expect(screen.queryByRole('dialog', { name: 'Vai trò của bạn' })).not.toBeInTheDocument()
  await waitFor(() => expect(opener).toHaveFocus())
})

it('real animated exit locks stale own-role flip/dismiss callbacks', async () => {
  const close = vi.fn()
  const view = (open: boolean) => <AnimatePresence>{open && <OwnRoleRevealModal {...props} onClose={close} />}</AnimatePresence>
  const { rerender } = render(view(true))
  rerender(view(false))
  expect(screen.getByTestId('btn-close-role-reveal')).toBeDisabled()
  fireEvent.click(screen.getByTestId('original-role-card'))
  fireEvent.click(screen.getByTestId('btn-close-role-reveal'))
  expect(close).not.toHaveBeenCalled(); expect(flip).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByTestId('role-reveal-all-overlay')).not.toBeInTheDocument())
})
