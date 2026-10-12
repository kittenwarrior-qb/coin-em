import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { EmcoinImage } from '@/components/cartoon/EmcoinImage'

afterEach(cleanup)
it.each(['emotion-orbit', 'kindness-workshop'] as const)('%s switches only new-art materials, never card/photo URLs', theme => {
  render(<ControlThemeProvider theme={theme}>
    <EmcoinImage src="/emcoin/avatars/orbit/02.webp" alt="Avatar" />
    <EmcoinImage src="/emcoin/icons/orbit/lock.svg" alt="Im lặng" />
    <EmcoinImage src="/cards/vai-tro/VT1.webp" alt="Thẻ gốc" />
    <EmcoinImage src="https://example.invalid/owned-photo.png" alt="Ảnh gốc" />
  </ControlThemeProvider>)
  const material = theme === 'kindness-workshop' ? 'paper' : 'orbit'
  expect(screen.getByAltText('Avatar')).toHaveAttribute('src', `/emcoin/avatars/${material}/02.webp`)
  expect(screen.getByAltText('Im lặng')).toHaveAttribute('src', `/emcoin/icons/${material}/lock.svg`)
  expect(screen.getByAltText('Thẻ gốc')).toHaveAttribute('src', '/cards/vai-tro/VT1.webp')
  expect(screen.getByAltText('Ảnh gốc')).toHaveAttribute('src', 'https://example.invalid/owned-photo.png')
})
