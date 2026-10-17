import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import About from '@/pages/About'
import { CoinRulesGuide } from '@/components/game/CoinRulesGuide'
import { GuideBook } from '@/components/game/GuideBook'
import { APPROVED_GAME_INFO } from '@/content/approvedGameInfo'
import { heroFacts } from '@/pages/siteContent'

vi.mock('@/components/site/AboutFlowPath', () => ({ default: () => null }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('owner-approved public facts and finite Coin guide', () => {
  it('shares the current audience/support/version instead of the former audience', () => {
    expect(APPROVED_GAME_INFO).toEqual({ audience: '6–18', supportEmail: 'emcoincloud@gmail.com', rulesVersion: 'web-16-coin60/v1', playerCount: '5–10' })
    expect(heroFacts).toContain('Dành cho người chơi 6–18 tuổi')
    expect(heroFacts.join(' ')).not.toContain('10-15')
  })
  it('distinguishes physical conversation from Internet-required web play', () => {
    expect(heroFacts).toContain('Chơi trực tiếp; web app cần Internet')
    expect(heroFacts.join(' ')).not.toContain('Chơi offline cùng điện thoại')
  })
  it('renders the approved five-to-ten web range instead of the former table claim', () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
    render(<MemoryRouter><About /></MemoryRouter>)
    expect(screen.getByText('5–10')).toBeInTheDocument()
    expect(screen.getByText('người chơi trên web')).toBeInTheDocument()
    expect(screen.queryByText('4-8')).not.toBeInTheDocument()
    expect(screen.getByText(/Web app cần Internet để chơi; phần offline chỉ hỗ trợ hướng dẫn công khai/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /emcoincloud@gmail.com/ })).toHaveAttribute('href', 'mailto:emcoincloud@gmail.com')
  })
  it('describes allocation, three meanings, remainder, optional gifting and collection without role bonuses', () => {
    render(<CoinRulesGuide />)
    const text = screen.getByTestId('coin-rules-guide').textContent!
    for (const phrase of ['60 Coin', '20 Coin Đỏ', '20 Coin Xanh', '20 Coin Vàng', 'số Coin dư không sử dụng', 'không bắt buộc phải sử dụng hết', 'thu về', 'chia lại từ đầu', 'không dùng để trao lại', 'Lòng tốt vô hạn', 'Được yêu thương', 'Trao yêu thương', 'web-16-coin60/v1']) expect(text).toContain(phrase)
    expect(text).not.toMatch(/\+5|\+3|thắng thua/)
  })
  it('opens readable rules first and keeps original illustration assets reachable unchanged', () => {
    render(<GuideBook onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'Hướng dẫn' })
    expect(dialog).toHaveClass('absolute')
    expect(dialog.firstElementChild).toHaveStyle({ maxWidth: '100%', maxHeight: '100%' })
    expect(screen.getByTestId('coin-rules-guide')).toBeInTheDocument()
    expect(document.querySelector('img[src="/tutorial/1.webp"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Minh họa gốc' }))
    expect(document.querySelector('img[src="/tutorial/1.webp"]')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Luật Coin' }))
    expect(screen.getByTestId('coin-rules-guide')).toBeInTheDocument()
  })
})
