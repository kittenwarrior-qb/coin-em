import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { AssetPreloaderScreen } from '@/components/AssetPreloaderScreen'
import { HistoryModal } from '@/features/game/components/HistoryModal'
import { BoardPreviewModal } from '@/features/game/components/BoardPreviewModal'
import { OwnRoleRevealModal } from '@/features/game/components/OwnRoleRevealModal'
import { EndedOverlay, RevealSilencerOverlay } from '@/components/game/PhaseOverlays'

afterEach(cleanup)
const state = { loaded: 1, total: 2, progress: 50, done: false, currentFile: 'QA', bgLoaded: 0, bgTotal: 0, bgDone: false }
it('skins loading without replacing the logo or progress data', () => {
  const { container } = render(<ControlThemeProvider theme="mint-blush"><AssetPreloaderScreen state={state} /></ControlThemeProvider>)
  expect(container.querySelector('[style*="backdrop.webp"]')).not.toBeNull()
  expect(screen.getByText('1/2')).toBeInTheDocument()
  expect(container.querySelector('img')).toHaveAttribute('src', '/emcoin_logo.png')
})
it('keeps legacy loading artwork available', () => {
  const { container } = render(<ControlThemeProvider theme="legacy"><AssetPreloaderScreen state={state} /></ControlThemeProvider>)
  expect(container.querySelector('[style*="home-bg.webp"]')).not.toBeNull()
})
it('marks history chrome separately from protected card content', () => {
  render(<HistoryModal currentRound={1} logs={[]} onClose={() => {}} onPreview={() => {}} />)
  expect(screen.getByRole('dialog')).toHaveAttribute('data-ui-panel', 'a1')
  expect(document.querySelector('[data-ui-chrome="header"]')).not.toBeNull()
})
it('keeps preview dimmer separate from cream popup styling', () => {
  render(<BoardPreviewModal label="QA preview" onClose={() => {}}>{() => <img src="/protected-qa.png" alt="QA card" />}</BoardPreviewModal>)
  expect(screen.getByRole('dialog')).toHaveAttribute('data-ui-chrome', 'preview')
  expect(screen.getByRole('dialog')).not.toHaveAttribute('data-ui-panel')
  expect(screen.getByAltText('QA card')).toHaveAttribute('src', '/protected-qa.png')
})
it('keeps role face URLs and explicit readable role-label chrome', () => {
  render(<OwnRoleRevealModal role="QA role" backImage="/qa-back.png" roleImage="/qa-role.png" onClose={() => {}} />)
  expect(screen.getByRole('dialog')).toHaveAttribute('data-ui-panel', 'a1')
  expect(document.querySelector('[data-ui-chrome="role-label"]')).toHaveTextContent('QA role')
  expect(document.querySelector('img[src="/qa-role.png"]')).not.toBeNull()
})
it('keeps long ending content uncompressed and top-aligned when it overflows', () => {
  render(<EndedOverlay players={[]} onLeave={() => {}} />)
  const panel = screen.getByRole('dialog')
  expect(panel).toHaveClass('overflow-hidden')
  const content = screen.getByTestId('ended-content')
  expect(content).toHaveClass('overflow-y-auto', '[&>*]:shrink-0')
  expect(content).not.toContainElement(screen.getByRole('button', { name: 'Rời phòng' }))
  expect(panel).not.toHaveClass('justify-center')
  expect(panel).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Rời phòng' })).toBeInTheDocument()
})
it('bounds the role reveal panel and allows its long roster to scroll', () => {
  render(<RevealSilencerOverlay players={[]} votes={{}} />)
  expect(screen.getByRole('dialog')).toHaveClass('max-h-[calc(100%-32px)]', 'overflow-y-auto')
})
it('lets history rows shrink into remaining space without shrinking its header', () => {
  render(<HistoryModal currentRound={1} logs={[]} onClose={() => {}} onPreview={() => {}} />)
  expect(screen.getByRole('dialog')).toHaveClass('flex', 'flex-col')
  expect(screen.getByTestId('history-log-scroll')).toHaveClass('min-h-0', 'overflow-y-auto')
  expect(document.querySelector('[data-ui-chrome="header"]')).toHaveClass('shrink-0')
})
