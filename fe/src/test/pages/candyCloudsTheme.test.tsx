import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { CartoonButton } from '@/components/cartoon/CartoonButton'
import { CartoonModal } from '@/components/cartoon/CartoonModal'
import { circleAppearance, isBrandTheme, themeBackdrop, themeLogo, themeArtUrl, DEFAULT_CONTROL_THEME } from '@/components/cartoon/controlThemes'
import { ThemePreferenceProvider } from '@/features/theme/ThemePreference'
import { ThemeChooser } from '@/features/theme/ThemeChooser'
import { initialTheme, isPublishedTheme, THEME_STORAGE_KEY } from '@/features/theme/preferenceModel'
import { handlePlatformBack } from '@/features/overlays/usePopupLifecycle'
import { BrandIcon } from '@/components/cartoon/BrandIcon'
import { BrandHome } from '@/components/lobby/BrandHome'
import { TableBoard } from '@/components/game/TableBoard'
import type { CardData, Player } from '@/stores/types'
import { CartoonAvatar } from '@/components/cartoon/CartoonAvatar'
import { PlayerLayout } from '@/components/game/PlayerLayout'
import { chooseBoardLayout } from '@/features/theme/boardLayout'

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(handlePlatformBack()).toBe(false))
  localStorage.clear(); window.history.replaceState(null, '', '/')
})
it('uses the approved no-scroll A layout without changing player order or older layouts', () => {
  chooseBoardLayout('A')
  const players = Array.from({length:10},(_,i)=>({ id:`qa-${i}`, name:`QA ${i}`, role:'QA', isMe:i===0, isNarrator:i===0, isSender:i===1, coins:{red:0,green:0,yellow:0} }))
  const props = { players, renderCenter:()=> <span>Bàn</span>, renderPlayer:({player,position}:{player:Player|null;position:string})=> <span data-qa-seat={player?.id} data-position={position}>{player?.name}</span> }
  const {container,rerender} = render(<ControlThemeProvider theme="candy-clouds"><PlayerLayout {...props}/></ControlThemeProvider>)
  const order=[...container.querySelectorAll('[data-qa-seat]')].map(e=>e.getAttribute('data-qa-seat'))
  expect(order).toEqual(['qa-0','qa-2','qa-4','qa-6','qa-8','qa-3','qa-5','qa-7','qa-9','qa-1'])
  expect(container.querySelector('.candy-stage-scroll')).toBeNull()
  expect(screen.getByTestId('kawaii-board')).toHaveAttribute('data-layout','A')
  rerender(<ControlThemeProvider theme="emotion-orbit"><PlayerLayout {...props}/></ControlThemeProvider>)
  expect(container.querySelector('.candy-stage-scroll')).toBeNull()
  expect([...container.querySelectorAll('[data-qa-seat]')].map(e=>e.getAttribute('data-qa-seat'))).toEqual(order)
})
it('uses independent Candy medallions while keeping the countdown layer and older frames', () => {
  const {container,rerender} = render(<ControlThemeProvider theme="candy-clouds"><CartoonAvatar name="QA" showCountdown countdownKey="qa" borderColor="#FFB830" /></ControlThemeProvider>)
  expect(container.querySelector('[data-ui-chrome="candy-avatar-frame"]')).not.toBeNull()
  expect(container.querySelector('[data-ui-chrome="avatar-frame"]')).toBeNull()
  expect(container.querySelector('.avatar-countdown-border')).not.toBeNull()
  rerender(<ControlThemeProvider theme="emotion-orbit"><CartoonAvatar name="QA" /></ControlThemeProvider>)
  expect(container.querySelector('[data-ui-chrome="candy-avatar-frame"]')).toBeNull()
  expect(container.querySelector('[data-ui-chrome="avatar-frame"]')).not.toBeNull()
})
it('keeps three real card faces and their click identity inside the dedicated mat', () => {
  const cards: CardData[] = [1,2,3].map(n => ({ id: `qa-${n}`, category: 'reflection', frontImage: `/qa-front-${n}.webp`, backImage: `/qa-back-${n}.webp` }))
  const preview = vi.fn()
  const { container } = render(<ControlThemeProvider theme="candy-clouds"><TableBoard phase="reflection-card" selectedCards={{ reflections: cards }} onCardClick={preview} /></ControlThemeProvider>)
  const area = container.querySelector('[data-ui-chrome="table-card-area"]')!
  const faces = area.querySelectorAll('img')
  expect([...faces].map(img => img.getAttribute('src'))).toEqual(cards.map(c => c.frontImage))
  fireEvent.click(area.querySelectorAll('button')[1])
  expect(preview).toHaveBeenCalledWith(cards[1], true)
})
it('uses the Candy icon family for Home and shared chrome without changing older themes', () => {
  const onJoin = vi.fn()
  const props = { logo: <span>EmCoin</span>, onJoin, onCreate: vi.fn(), onMenu: vi.fn(), onGuide: vi.fn(), onResume: vi.fn(), resumeCount: 0 }
  const { container, rerender } = render(<ControlThemeProvider theme="candy-clouds"><BrandHome {...props} /><BrandIcon name="lock" /></ControlThemeProvider>)
  expect(container.querySelector('[data-kawaii-icon="friends"]')).not.toBeNull()
  expect(container.querySelector('[data-kawaii-icon="plus"]')).not.toBeNull()
  expect(container.querySelector('[data-candy-icon="lock"]')).toHaveAttribute('viewBox', '0 0 24 24')
  fireEvent.click(screen.getByRole('button', { name: 'Tìm phòng' }))
  expect(onJoin).toHaveBeenCalledOnce()
  rerender(<ControlThemeProvider theme="kindness-workshop"><BrandHome {...props} /><BrandIcon name="lock" /></ControlThemeProvider>)
  expect(container.querySelector('[data-candy-icon]')).toBeNull()
  expect(container.querySelector('svg[viewBox="0 0 42 42"]')).not.toBeNull()
})
it('registers the third theme without changing defaults, card URLs or semantic Coin artwork', () => {
  expect(DEFAULT_CONTROL_THEME).toBe('candy-clouds')
  expect(isPublishedTheme('candy-clouds')).toBe(true)
  expect(isBrandTheme('candy-clouds')).toBe(true)
  expect(themeLogo('candy-clouds')).toBe('/cartoon/ui/themes/candy-clouds/coin-mark.webp')
  expect(themeBackdrop('candy-clouds', 'old')).toBe('url(/cartoon/ui/themes/candy-clouds/backdrop.webp)')
  for (const url of ['/emcoin/decks/pdf-v1/page-1.webp', '/cards/role.png', '/emcoin/coins/orbit/red.svg']) expect(themeArtUrl('candy-clouds', url)).toBe(url)
  expect(circleAppearance('candy-clouds', 'blue', 'old').src).toBe('/cartoon/ui/themes/candy-clouds/circle.svg')
  expect(themeArtUrl('candy-clouds', '/emcoin/icons/orbit/lock.svg')).toBe('/emcoin/icons/candy/lock.svg')
  expect(themeArtUrl('emotion-orbit', '/emcoin/icons/orbit/lock.svg')).toBe('/emcoin/icons/orbit/lock.svg')
})
it('keeps controls live and pending protection intact while changing to Candy Clouds', () => {
  const click = vi.fn()
  const { rerender } = render(<ControlThemeProvider theme="emotion-orbit"><CartoonButton pending onClick={click}>Gửi</CartoonButton></ControlThemeProvider>)
  const button = screen.getByRole('button', { name: 'Gửi' })
  rerender(<ControlThemeProvider theme="candy-clouds"><CartoonButton pending onClick={click}>Gửi</CartoonButton></ControlThemeProvider>)
  expect(screen.getByRole('button', { name: 'Gửi' })).toBe(button)
  expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true')
  expect(button.querySelector('img')).toHaveAttribute('src', '/cartoon/ui/themes/candy-clouds/primary.svg')
  fireEvent.click(button); expect(click).not.toHaveBeenCalled()
})
it('persists the new theme, restores it and preserves router state when selected', () => {
  window.history.replaceState({ keep: true }, '', '/?theme=emotion-orbit&keep=1')
  const view = render(<ThemePreferenceProvider><CartoonModal open title="Thử giao diện"><ThemeChooser /><p>Giữ nội dung</p></CartoonModal></ThemePreferenceProvider>)
  const dialog = screen.getByRole('dialog', { name: 'Thử giao diện' })
  const popupHistory = window.history.state
  fireEvent.click(screen.getByRole('radio', { name: /Mây Kẹo/ }))
  expect(document.documentElement.dataset.uiTheme).toBe('candy-clouds')
  expect(screen.getByRole('dialog', { name: 'Thử giao diện' })).toBe(dialog)
  expect(window.history.state).toEqual(popupHistory)
  expect(window.history.state.keep).toBe(true)
  expect(window.location.search).toBe('?keep=1')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('candy-clouds')
  view.unmount()
  expect(initialTheme('', false, localStorage)).toBe('candy-clouds')
  expect(initialTheme('?theme=candy-clouds', false, { getItem: () => null })).toBe('candy-clouds')
})
it('removes a stale preview override restored by popup Back without losing unrelated history', () => {
  window.history.replaceState({ keep: 7 }, '', '/?theme=emotion-orbit&keep=1')
  render(<ThemePreferenceProvider><ThemeChooser /></ThemePreferenceProvider>)
  fireEvent.click(screen.getByRole('radio', { name: /Mây Kẹo/ }))
  const restored = { keep: 7, __emcoinPopup: 'retained-popup' }
  window.history.replaceState(restored, '', '/?theme=emotion-orbit&keep=1')
  fireEvent.popState(window, { state: restored })
  expect(window.location.search).toBe('?keep=1')
  expect(window.history.state).toEqual(restored)
  expect(document.documentElement.dataset.uiTheme).toBe('candy-clouds')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('candy-clouds')
})
