import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { CartoonBadge } from '@/components/cartoon/CartoonBadge'
import { CartoonDropdown } from '@/components/cartoon/CartoonDropdown'
import { RoomCard } from '@/components/lobby/RoomCard'
import { Button } from '@/components/ui/button'
import { MiniPlayerToken } from '@/components/game/MiniPlayerToken'
import { ProfileModal } from '@/components/cartoon/ProfileModal'

afterEach(cleanup)
describe('A1 shared non-card chrome', () => {
  it('marks only player name ink, not role identity colors, for brand styling', () => {
    render(<ControlThemeProvider theme="mint-blush"><MiniPlayerToken player={{ id: 'qa', name: 'QA', role: 'Người Chữa Lành', isMe: false, coins: { red: 0, green: 0, yellow: 0 } }} index={0} showRoleLabel /></ControlThemeProvider>)
    expect(screen.getByText('QA')).toHaveAttribute('data-ui-ink', 'primary')
    expect(screen.getByText('Người chữa lành')).toHaveStyle({ color: '#62C76D' })
    expect(screen.getByText('Người chữa lành')).not.toHaveAttribute('data-ui-ink')
  })
  it('marks profile labels without changing selected avatar palette', () => {
    render(<ControlThemeProvider theme="mint-blush"><ProfileModal open currentName="QA" currentAvatarIndex={0} currentBgIndex={0} onClose={() => {}} onSave={() => {}} /></ControlThemeProvider>)
    expect(screen.getByText('Chọn avatar')).toHaveAttribute('data-ui-ink', 'primary')
    expect(screen.getByText('Màu nền')).toHaveAttribute('data-ui-ink', 'primary')
  })
  it.each([['blue', 'mint'], ['pink', 'blush'], ['yellow', 'cream']] as const)('gives %s badge an explicit %s brand surface', (color, surface) => {
    render(<ControlThemeProvider theme="mint-blush"><CartoonBadge color={color}>3/10</CartoonBadge></ControlThemeProvider>)
    expect(screen.getByText('3/10')).toHaveAttribute('data-ui-badge', surface)
  })
  it('keeps room selection functional and uses blush for selected rooms', () => {
    const select = vi.fn()
    render(<ControlThemeProvider theme="mint-blush"><RoomCard room={{ id: 'QA-room', hostName: 'QA host', playerCount: 3 }} selected onSelect={select} /></ControlThemeProvider>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-ui-surface', 'room')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.style.background).toContain('--brand-blush')
    fireEvent.click(button)
    expect(select).toHaveBeenCalledTimes(1)
  })
  it('leaves legacy badge and room styling unmodified', () => {
    render(<ControlThemeProvider theme="legacy"><RoomCard room={{ id: 'QA-room', hostName: 'QA host', playerCount: 3 }} selected onSelect={() => {}} /></ControlThemeProvider>)
    expect(screen.getByRole('button')).not.toHaveAttribute('data-ui-surface')
    expect(document.querySelector('[data-ui-badge]')).toBeNull()
  })
  it('keeps dropdown choices functional with explicit selected state', () => {
    const change = vi.fn()
    render(<ControlThemeProvider theme="mint-blush"><CartoonDropdown options={[{ value: 'on', label: 'Bật' }, { value: 'off', label: 'Tắt' }]} value="off" onChange={change} /></ControlThemeProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Tắt' }))
    expect(document.querySelector('button[aria-pressed="true"]')).toHaveTextContent('Tắt')
    fireEvent.click(screen.getByRole('button', { name: 'Bật' }))
    expect(change).toHaveBeenCalledWith('on')
  })
  it('retains native Button disabled semantics with explicit skin hooks', () => {
    render(<Button variant="destructive" size="icon" disabled aria-label="Xóa" />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveAttribute('data-ui-variant', 'destructive')
    expect(screen.getByRole('button')).toHaveAttribute('data-ui-size', 'icon')
  })
})
