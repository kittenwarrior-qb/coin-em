import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { pdfCatalogDraft } from '../fixtures/pdfCatalog'
import { RoomCatalogBoundary } from '@/features/game/catalog/RoomCatalog'
import { useRoomCatalog, fetchRoomCatalog } from '@/features/game/catalog/roomCatalogClient'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const cards = pdfCatalogDraft().map(card => ({ ...card, reviewed: true }))
const version = `catalog-${createHash('sha256').update(JSON.stringify(cards)).digest('hex')}`
function Child() { const catalog = useRoomCatalog(); return <p>First card: {catalog.data.situation[0].id}</p> }
function respond(payload = { version, cards }) { vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }))) }
it('loads the exact version and its semantic role mapping without legacy substitution', async () => {
  respond(); render(<RoomCatalogBoundary version={version} onLeave={vi.fn()}><Child /></RoomCatalogBoundary>)
  expect(screen.getByRole('status')).toHaveTextContent('Đang tải')
  expect(await screen.findByText('First card: pdf-v1-situation-1')).toBeVisible()
  const catalog = await fetchRoomCatalog(version, new AbortController().signal)
  expect(catalog.roleImages['Người Chữa Lành']).toContain('page-017.webp')
  expect(catalog.data.emotionsByType.advanced).toHaveLength(8)
  expect(catalog.data.situationByType.sensitive).toHaveLength(8)
})
it('rejects hash tampering and renders retry/leave instead of playable legacy cards', async () => {
  respond({ version, cards: cards.map(card => ({ ...card, name: 'Tampered' })) })
  const leave = vi.fn(); render(<RoomCatalogBoundary version={version} onLeave={leave}><Child /></RoomCatalogBoundary>)
  await screen.findByRole('button', { name: 'Thử lại' })
  expect(screen.queryByText(/First card/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Rời phòng' })); expect(leave).toHaveBeenCalledOnce()
  respond(); fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  await screen.findByText('First card: pdf-v1-situation-1')
})
it('does not reuse a completed fetch when switching to a different unavailable room version', async () => {
  respond(); const view = render(<RoomCatalogBoundary version={version} onLeave={vi.fn()}><Child /></RoomCatalogBoundary>)
  await screen.findByText('First card: pdf-v1-situation-1')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
  view.rerender(<RoomCatalogBoundary version={`catalog-${'f'.repeat(64)}`} onLeave={vi.fn()}><Child /></RoomCatalogBoundary>)
  await waitFor(() => expect(screen.queryByText(/First card/)).not.toBeInTheDocument())
  await screen.findByRole('button', { name: 'Thử lại' })
})
it('keeps pre-version rooms explicitly on the legacy deck with no network fetch', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  render(<RoomCatalogBoundary onLeave={vi.fn()}><Child /></RoomCatalogBoundary>)
  expect(screen.getByText('First card: situation-TH1')).toBeVisible()
  expect(fetch).not.toHaveBeenCalled()
})
