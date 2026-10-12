import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PUBLIC_SITE_PAGES, publicSitePath } from '../../content/siteNavigation'
import { sitePages } from '../../pages/siteContent'
import SiteHeader from '../../components/site/SiteHeader'
import Router from '../../Router'
import AboutStory from '../../pages/AboutStory'

vi.mock('../../pages/About', () => ({ default: () => <h1>Registered about</h1> }))
vi.mock('../../pages/AboutCards2D', () => ({ default: () => <h1>Registered cards</h1> }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('one current public navigation map', () => {
  it('keeps the exact three existing public destinations; no legacy content is newly published', () => {
    expect(sitePages).toBe(PUBLIC_SITE_PAGES)
    expect(PUBLIC_SITE_PAGES.map(item => item.href)).toEqual(['/about', '/about/cards', '/about/story'])
    expect(new Set(PUBLIC_SITE_PAGES.map(item => item.id)).size).toBe(3)
    expect(publicSitePath('/about/cards///')).toBe('/about/cards')
    expect(publicSitePath('/')).toBe('/')
  })
  it.each(PUBLIC_SITE_PAGES)('announces only $label current, including trailing-slash paths', ({ label, href }) => {
    render(<MemoryRouter initialEntries={[`${href}/`]}><SiteHeader /></MemoryRouter>)
    const current = screen.getByRole('link', { name: label })
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Mở menu chuyển trang' })).toHaveTextContent(label)
    for (const other of PUBLIC_SITE_PAGES.filter(item => item.href !== href)) {
      expect(screen.getByRole('link', { name: other.label })).not.toHaveAttribute('aria-current')
    }
  })
  it('dropdown navigation keeps destination/current semantics without inventing routes', async () => {
    render(<MemoryRouter initialEntries={['/about/story/']}><SiteHeader /></MemoryRouter>)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mở menu chuyển trang' }), { key: 'Enter' })
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument())
    const items = screen.getAllByRole('menuitem')
    expect(items.map(item => item.getAttribute('href'))).toEqual(PUBLIC_SITE_PAGES.map(item => item.href))
    expect(items[2]).toHaveAttribute('aria-current', 'page')
  })
  it.each([['/about', 'Registered about'], ['/about/cards', 'Registered cards']])('Router binds %s from the shared map', async (href, heading) => {
    render(<MemoryRouter initialEntries={[href]}><Router /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })
  it('registered guide renders approved web rules before all unchanged tutorial illustrations', async () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
    render(<MemoryRouter initialEntries={['/about/story']}><Router /></MemoryRouter>)
    const guide = await screen.findByRole('region', { name: 'Luật Coin trên web' })
    expect(guide).toHaveTextContent('20 Coin Đỏ')
    expect(guide).toHaveTextContent('20 Coin Xanh')
    expect(guide).toHaveTextContent('20 Coin Vàng')
    expect(guide).toHaveTextContent('web-16-coin60/v1')
    expect(guide).toHaveTextContent('không bắt buộc phải sử dụng hết')
    expect(guide.querySelector('a')).toHaveAttribute('href', 'mailto:emcoincloud@gmail.com')
    expect(document.querySelector('.tutorial-grid')!.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    const images = Array.from(document.querySelectorAll('.tutorial-grid img'))
    expect(images.map(image => image.getAttribute('src'))).toEqual(Array.from({ length: 9 }, (_, i) => `/tutorial/${i + 1}.webp`))
    expect(screen.queryByText('Offline-first')).not.toBeInTheDocument()
  })
  it('actual guide distinguishes conversation from offline web play', () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
    render(<MemoryRouter><AboutStory /></MemoryRouter>)
    expect(screen.getAllByText(/Web app cần Internet để chơi; phần offline chỉ hỗ trợ hướng dẫn công khai/)).toHaveLength(2)
  })
})
