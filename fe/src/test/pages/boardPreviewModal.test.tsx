import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { BoardPreviewModal } from '@/features/game/components/BoardPreviewModal'
import { HistoryModal } from '@/features/game/components/HistoryModal'
import { FlipCard } from '@/components/game/FlipCard'
import { CARD_DATA } from '@/constants/cardCatalog'

afterEach(async () => { cleanup(); await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined()) })
const card = CARD_DATA.situation[0]

it('preserves original faces and blocks Back/Esc, backdrop, close and child actions while pending', async () => {
  const close = vi.fn(), child = vi.fn()
  const { rerender } = render(<BoardPreviewModal label="Xem thẻ" pending onClose={close}>{locked => <>
    <button disabled={locked} onClick={child}>Thẻ sau</button>
    <FlipCard frontImage={card.frontImage} backImage={card.backImage} altText={card.id} allowFlip={!locked} />
  </>}</BoardPreviewModal>)
  expect(screen.getByRole('img', { name: `${card.id} - front` })).toHaveAttribute('src', card.frontImage)
  expect(screen.getByRole('img', { name: `${card.id} - back` })).toHaveAttribute('src', card.backImage)
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(resolve => setTimeout(resolve, 40))
  fireEvent.click(screen.getByRole('dialog')); fireEvent.click(screen.getByRole('button', { name: 'Đóng xem thẻ' }))
  fireEvent.click(screen.getByRole('button', { name: 'Thẻ sau' }))
  expect(close).not.toHaveBeenCalled(); expect(child).not.toHaveBeenCalled()
  rerender(<BoardPreviewModal label="Xem thẻ" onClose={close}>{() => <button onClick={child}>Thẻ sau</button>}</BoardPreviewModal>)
  fireEvent.click(screen.getByRole('button', { name: 'Thẻ sau' }))
  expect(child).toHaveBeenCalledOnce()
})

it('returns focus to the connected page opener after replacing History and navigating inside preview', async () => {
  function Fixture() {
    const [history, setHistory] = useState(false), [preview, setPreview] = useState(false), [page, setPage] = useState(1)
    return <><button onClick={() => setHistory(true)}>Mở nhật ký</button>
      <AnimatePresence>{history && <HistoryModal currentRound={1}
        logs={[{ entry: { type: 'SELECT_CARD', timestamp: 1 }, item: { title: 'Thẻ', detail: 'Đã chọn', card } }]}
        onClose={() => setHistory(false)} onPreview={() => { setHistory(false); setPreview(true) }} />}</AnimatePresence>
      <AnimatePresence>{preview && <BoardPreviewModal label="Xem thẻ" onClose={() => setPreview(false)}>
        {() => <button onClick={event => { event.stopPropagation(); setPage(page + 1) }}>Thẻ sau {page}</button>}
      </BoardPreviewModal>}</AnimatePresence>
    </>
  }
  const url = window.location.href
  render(<Fixture />)
  const opener = screen.getByRole('button', { name: 'Mở nhật ký' })
  opener.focus(); fireEvent.click(opener)
  const thumbnail = screen.getByTestId(`history-card-${card.id}`)
  thumbnail.focus(); fireEvent.click(thumbnail)
  await waitFor(() => expect(screen.queryByTestId('history-log-panel')).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'Thẻ sau 1' }))
  expect(screen.getByRole('button', { name: 'Thẻ sau 2' })).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(opener).toHaveFocus())
  expect(window.location.href).toBe(url)
})

it('makes exiting preview controls non-actionable without suppressing animation', async () => {
  const close = vi.fn(), child = vi.fn()
  const { rerender } = render(<AnimatePresence><BoardPreviewModal key="preview" label="Xem thẻ" onClose={close}>
    {locked => <button disabled={locked} onClick={child}>Thẻ sau</button>}
  </BoardPreviewModal></AnimatePresence>)
  rerender(<AnimatePresence>{null}</AnimatePresence>)
  const control = screen.queryByRole('button', { name: 'Thẻ sau', hidden: true })
  if (control) { expect(control).toBeDisabled(); fireEvent.click(control) }
  expect(child).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument())
})
