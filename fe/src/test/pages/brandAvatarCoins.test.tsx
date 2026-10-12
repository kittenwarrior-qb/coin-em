import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { CartoonAvatar } from '@/components/cartoon/CartoonAvatar'
import { AVATAR_ICONS } from '@/components/cartoon/avatarConfig'
import { CoinDisplay } from '@/components/game/CoinDisplay'
import { CARD_IMAGES } from '@/constants/cardImages'

afterEach(cleanup)
it.each(['emotion-orbit', 'kindness-workshop'] as const)('%s wallet preserves amounts, accessible labels and original face callback pairs', theme => {
  const preview = vi.fn()
  render(<ControlThemeProvider theme={theme}><CoinDisplay coins={{ green: 4, yellow: 0, red: 20 }} onCoinClick={preview} /></ControlThemeProvider>)
  const buttons = screen.getAllByRole('button')
  expect(buttons.map(b => b.textContent)).toEqual(['4', '0', '20'])
  expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(['Xem Coin Xanh', 'Xem Coin Vàng', 'Xem Coin Đỏ'])
  expect(buttons.map(b => b.querySelector('svg')?.getAttribute('data-ui-coin-icon'))).toEqual(['green', 'yellow', 'red'])
  fireEvent.click(buttons[0]); fireEvent.click(buttons[1]); fireEvent.click(buttons[2])
  expect(preview.mock.calls).toEqual([[CARD_IMAGES.coins.green1, CARD_IMAGES.coins.green2, 'green'], [CARD_IMAGES.coins.yellow1, CARD_IMAGES.coins.yellow2, 'yellow'], [CARD_IMAGES.coins.red1, CARD_IMAGES.coins.red2, 'red']])
})
it.each(['emotion-orbit', 'kindness-workshop'] as const)('%s frame keeps the portrait, name and live countdown layer', theme => {
  const { container, rerender } = render(<ControlThemeProvider theme={theme}><CartoonAvatar name="Tên thật" avatarIndex={2} showCountdown countdownKey="round-1" countdownDurationSec={45} /></ControlThemeProvider>)
  expect(screen.getByLabelText('Tên thật')).toBeInTheDocument()
  expect(container.querySelector('img')).toHaveAttribute('src', theme === 'kindness-workshop' ? AVATAR_ICONS[2].replace('/orbit/', '/paper/') : AVATAR_ICONS[2])
  expect(container.querySelector('[data-ui-chrome="avatar-frame"]')).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('[data-ui-chrome="avatar-border"]')).toHaveClass('avatar-countdown-border')
  expect((container.querySelector('[data-ui-chrome="avatar-border"]') as HTMLElement).style.getPropertyValue('--avatar-countdown-duration')).toBe('45s')
  rerender(<ControlThemeProvider theme="legacy"><CartoonAvatar name="Tên thật" avatarIndex={2} /></ControlThemeProvider>)
  expect(container.querySelector('[data-ui-chrome="avatar-frame"]')).toBeNull()
  expect(container.querySelector('img')).toHaveAttribute('src', AVATAR_ICONS[2])
})
