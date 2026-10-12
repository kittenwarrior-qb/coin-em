import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CARD_IMAGES } from '../../constants/cardImages'
import CardShowcase from '../../pages/CardShowcase'
import { pdfCatalogDraft } from '../fixtures/pdfCatalog'
import { createHash, webcrypto } from 'node:crypto'

vi.mock('three', async importOriginal => {
  const original = await importOriginal<typeof import('three')>()
  return { ...original, WebGLRenderer: vi.fn(function () { throw new Error('WebGL unsupported') }) }
})
afterEach(() => { vi.unstubAllGlobals() })
describe('unchanged artwork fallback without WebGL', () => {
  it('uses the published PDF role faces in2D fallback and never fetches the old card manifest', async () => {
    const cards = pdfCatalogDraft().map(card => ({ ...card, reviewed: true }))
    const version = `catalog-${createHash('sha256').update(JSON.stringify(cards)).digest('hex')}`
    vi.stubGlobal('crypto', webcrypto)
    const fetch = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/active') ? { version } : { version, cards }), { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    render(<CardShowcase />)
    expect(await screen.findByRole('img', { name: 'Người Quản trò — mặt trước' })).toHaveAttribute('src', '/emcoin/decks/pdf-v1/page-008.webp')
    expect(screen.getByRole('img', { name: 'Người Quản trò — mặt sau' })).toHaveAttribute('src', '/emcoin/decks/pdf-v1/page-007.webp')
    expect(fetch.mock.calls.some(([url]) => url.includes('/card-showcase/manifest.json'))).toBe(false)
  })
  it('shows exact original front/back and keeps deck navigation available', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/api/catalog/active')
      ? new Response(JSON.stringify({ version: 'web-card-baseline/v1' }), { headers: { 'Content-Type': 'application/json' } })
      : { json: async () => [{ id: 'role', label: 'Vai trò', count: 1,
        cards: [{ title: 'Người Quản trò', group: 'role', front: CARD_IMAGES.roles.VT1, back: CARD_IMAGES.roles.back }] }] }))
    render(<CardShowcase />)
    expect(await screen.findByRole('img', { name: 'Người Quản trò — mặt trước' })).toHaveAttribute('src', CARD_IMAGES.roles.VT1)
    expect(screen.getByRole('img', { name: 'Người Quản trò — mặt sau' })).toHaveAttribute('src', CARD_IMAGES.roles.back)
    expect(screen.getByRole('status')).toHaveTextContent('Không thể hiển thị 3D')
    await waitFor(() => expect(screen.queryByText('Đang tải thẻ...')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Bộ thẻ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nhân vật 3D' }))
    expect(await screen.findByText('Chưa có hình thay thế được duyệt cho nhân vật này.')).toBeVisible()
    expect(screen.queryByRole('img', { name: /mặt sau/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bộ thẻ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sticker' }))
    expect(await screen.findByRole('img', { name: 'Giận dữ — mặt trước' })).toHaveAttribute('src', '/stickers/gian-du.webp')
    expect(screen.queryByRole('img', { name: /mặt sau/ })).not.toBeInTheDocument()
  })
})
