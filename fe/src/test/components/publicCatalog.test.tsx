import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { MemoryRouter } from 'react-router-dom'
import { pdfCatalogDraft } from '../fixtures/pdfCatalog'
import { PublicCatalogBoundary } from '@/features/game/catalog/PublicCatalog'
import { RoomCatalogBoundary } from '@/features/game/catalog/RoomCatalog'
import { useRoomCatalog } from '@/features/game/catalog/roomCatalogClient'
import AboutCards2D from '@/pages/AboutCards2D'
import { publishedShowcaseDecks } from '@/features/showcase/publishedDecks'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const cards = pdfCatalogDraft().map(card => ({ ...card, reviewed: true }))
const version = `catalog-${createHash('sha256').update(JSON.stringify(cards)).digest('hex')}`
function serve(legacy = false) {
  vi.stubGlobal('crypto', webcrypto)
  const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/active')
    ? { version: legacy ? 'web-card-baseline/v1' : version } : { version, cards }), { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch); return fetch
}
function Child() { const catalog = useRoomCatalog(); return <p>Card: {catalog.data.situation[0].id}</p> }
it('follows the fresh public pointer but leaves an explicitly legacy room on its own catalog', async () => {
  const fetch = serve()
  render(<PublicCatalogBoundary onClose={vi.fn()}><Child /><RoomCatalogBoundary onLeave={vi.fn()}><Child /></RoomCatalogBoundary></PublicCatalogBoundary>)
  await screen.findByText('Card: pdf-v1-situation-1')
  expect(screen.getByText('Card: situation-TH1')).toBeVisible()
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch.mock.calls[0][0]).toContain('/api/catalog/active')
  expect(vi.mocked(globalThis.fetch).mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' })
})
it('does not render stale legacy cards after a public pointer failure and supports explicit retry', async () => {
  serve(); vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  render(<PublicCatalogBoundary onClose={vi.fn()}><Child /></PublicCatalogBoundary>)
  await screen.findByRole('button', { name: 'Thử lại' })
  expect(screen.queryByText(/Card:/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  await screen.findByText('Card: pdf-v1-situation-1')
})
it('renders legacy only when the server explicitly selected legacy, not when it failed', async () => {
  const fetch = serve(true)
  render(<PublicCatalogBoundary onClose={vi.fn()}><Child /></PublicCatalogBoundary>)
  await screen.findByText('Card: situation-TH1')
  expect(fetch).toHaveBeenCalledOnce()
})
it('uses the published names/counts/two faces in the gallery and returns focus after Escape', async () => {
  serve(); render(<MemoryRouter><AboutCards2D /></MemoryRouter>)
  const opener = await screen.findByRole('button', { name: 'Xem thẻ CX-017: Yêu mến' })
  expect(document.querySelectorAll('.catalog-card')).toHaveLength(103)
  opener.focus(); fireEvent.click(opener)
  expect(screen.getByRole('img', { name: 'Yêu mến · Mặt trước' })).toHaveAttribute('src', '/emcoin/decks/pdf-v1/page-083.webp')
  fireEvent.click(screen.getByRole('button', { name: 'Xem mặt sau' }))
  expect(screen.getByRole('img', { name: 'Yêu mến · Mặt sau' })).toHaveAttribute('src', '/emcoin/decks/pdf-v1/page-084.webp')
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(opener).toHaveFocus())
  expect(document.body.style.overflow).not.toBe('hidden')
})
it('maps all five 3D card decks from the same published identities without modifying either face', () => {
  const decks = publishedShowcaseDecks(cards)
  expect(decks.map(deck => deck.count)).toEqual([7,32,32,14,15])
  expect(decks.flatMap(deck => deck.cards)).toHaveLength(100)
  expect(decks[2].cards.find(card => card.title === 'Yêu mến')).toMatchObject({ front: '/emcoin/decks/pdf-v1/page-083.webp', back: '/emcoin/decks/pdf-v1/page-084.webp' })
})
