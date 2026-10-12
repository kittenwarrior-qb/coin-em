import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { RandomSituationFan } from '@/components/game/RandomSituationFan'
import { CARD_DATA } from '@/constants/cardCatalog'

afterEach(cleanup)
const cards = CARD_DATA.situation.slice(0, 3)
const props = () => ({ cards, selectedCard: cards[0], onPick: vi.fn(), onBrowse: vi.fn(), onConfirm: vi.fn(), onStateChange: vi.fn() })

it('nonmodal fan retains original facedown art/order and locks pick/confirm/wheel while pending', () => {
  const base = props()
  const { rerender } = render(<RandomSituationFan {...base} pending />)
  expect(screen.getByRole('group', { name: 'Chọn thẻ tình huống' })).toHaveAttribute('aria-busy', 'true')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(window.history.state?.__emcoinPopup).toBeUndefined()
  for (const button of screen.getAllByRole('button')) { expect(button).toBeDisabled(); fireEvent.click(button) }
  fireEvent.wheel(screen.getByTestId('situation-fan-browse'), { deltaY: 360 })
  expect(screen.getByText('1/3')).toBeInTheDocument()
  expect(base.onPick).not.toHaveBeenCalled(); expect(base.onConfirm).not.toHaveBeenCalled(); expect(base.onBrowse).not.toHaveBeenCalled()
  expect(screen.getByTestId('random-situation-card-2').querySelector('img')).toHaveAttribute('src', cards[1].backImage)
  rerender(<RandomSituationFan {...base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Xem thẻ tình huống 2' }))
  expect(base.onPick).toHaveBeenCalledWith(cards[1])
  fireEvent.click(screen.getByTestId('btn-confirm-situation-card'))
  expect(base.onConfirm).toHaveBeenCalledOnce()
})

it('animated exit cannot pick/confirm/browse but preserves existing ephemeral teardown notification', async () => {
  const base = props()
  const { rerender } = render(<AnimatePresence><RandomSituationFan key="fan" {...base} /></AnimatePresence>)
  base.onStateChange.mockClear()
  rerender(<AnimatePresence>{null}</AnimatePresence>)
  for (const button of screen.queryAllByRole('button', { hidden: true })) { expect(button).toBeDisabled(); fireEvent.click(button) }
  const browse = screen.queryByTestId('situation-fan-browse')
  if (browse) fireEvent.wheel(browse, { deltaY: 360 })
  expect(base.onPick).not.toHaveBeenCalled(); expect(base.onConfirm).not.toHaveBeenCalled(); expect(base.onBrowse).not.toHaveBeenCalled()
  await waitFor(() => {
    expect(screen.queryByTestId('random-situation-fan')).not.toBeInTheDocument()
    expect(base.onStateChange).toHaveBeenCalledOnce()
    expect(base.onStateChange).toHaveBeenCalledWith([], -1)
  })
})
