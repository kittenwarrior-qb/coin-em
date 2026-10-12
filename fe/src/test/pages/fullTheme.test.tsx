import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { CartoonButton, CartoonCircleButton } from '@/components/cartoon/CartoonButton'
import { CartoonSwitch } from '@/components/cartoon/CartoonSwitch'
import { CartoonToggle } from '@/components/cartoon/CartoonToggle'
import { CartoonCheckbox } from '@/components/cartoon/CartoonCheckbox'
import { CartoonSlider } from '@/components/cartoon/CartoonSlider'
import { CartoonProgress } from '@/components/cartoon/CartoonProgress'
import { CartoonRadial } from '@/components/cartoon/CartoonRadial'
import { CartoonSpinner } from '@/components/cartoon/CartoonSpinner'
import { legacyStandaloneCircle } from '@/components/cartoon/controlThemes'
import fs from 'node:fs'
import path from 'node:path'

afterEach(cleanup)
describe('full A control coverage', () => {
  it('keeps legacy standalone control fallback paths resolvable', () => {
    for (const color of ['gray', 'blue', 'red', 'pink', 'purple', 'yellow', 'green', 'teal']) {
      expect(fs.existsSync(path.resolve(process.cwd(), 'public', legacyStandaloneCircle(color).slice(1)))).toBe(true)
    }
  })
  it.each(['green', 'pink', 'orange', 'purple', 'teal'])('migrates %s pill without a legacy sprite fallback', color => {
    render(<ControlThemeProvider theme="mint-blush"><CartoonButton color={color}>Tiếp tục</CartoonButton></ControlThemeProvider>)
    expect(screen.getByRole('button')).toHaveAttribute('data-control-theme', 'mint-blush')
    expect(document.querySelector('img')?.getAttribute('src')).toMatch(/\/themes\/(sky-pink-a1|mint-blush-v2)\/pill-/)
  })
  it.each(['blue', 'blue-teal', 'red', 'yellow', 'violet', 'purple', 'gray', 'dark', 'brown', 'bordeaux', 'light', 'neutral', 'white', 'transparent'])('migrates %s circle with a dark UI icon', color => {
    render(<ControlThemeProvider theme="mint-blush"><CartoonCircleButton color={color} iconSrc="/emcoin/icons/orbit/settings.svg" aria-label="Menu" /></ControlThemeProvider>)
    expect(screen.getByRole('button')).toHaveAttribute('data-control-theme', 'mint-blush')
    expect(document.querySelector('img')?.getAttribute('src')).toMatch(/\/themes\/(sky-pink-a1|mint-blush-v2)\/circle-/)
    expect(document.querySelector('svg')).not.toBeNull()
    expect(document.querySelector('img[src="/emcoin/icons/orbit/settings.svg"]')).toBeNull()
  })
  it('keeps switch/checkbox/toggle interactions while replacing standalone legacy sprites', () => {
    const change = vi.fn()
    render(<ControlThemeProvider theme="mint-blush"><CartoonSwitch label="Âm thanh" checked={false} onChange={change} /><CartoonToggle label="Thông báo" /><CartoonCheckbox label="Tình huống" checked onChange={change} /></ControlThemeProvider>)
    fireEvent.click(screen.getByLabelText('Âm thanh'))
    expect(change).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tình huống' }))
    expect(change).toHaveBeenCalledWith(false)
    expect(document.querySelector('img[src="/cartoon/buttons/circle/Blue-Teal.png"]')).toBeNull()
    const backgroundImages = [...document.querySelectorAll<HTMLElement>('[style]')].map(node => node.style.backgroundImage).filter(value => value.includes('url('))
    expect(backgroundImages.length).toBeGreaterThan(0)
    expect(backgroundImages.every(value => /mint-blush-v2|sky-pink-a1/.test(value))).toBe(true)
  })
  it('retains disabled range semantics and provides themed progress/radial/spinner', () => {
    render(<ControlThemeProvider theme="mint-blush"><CartoonSlider value={35} disabled /><CartoonProgress value={35} /><CartoonRadial value={35} /><CartoonSpinner /></ControlThemeProvider>)
    expect(screen.getByRole('slider')).toBeDisabled()
    expect(screen.getByRole('slider')).toHaveValue('35')
    expect(screen.getByLabelText('Loading').tagName.toLowerCase()).toBe('svg')
    expect(document.querySelector('img[src="/emcoin/icons/orbit/spinner.svg"]')).toBeNull()
    expect(screen.getByText('35%').style.color).toContain('--brand-ink')
  })
})
