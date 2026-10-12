import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CartoonButton, CartoonCircleButton } from '@/components/cartoon/CartoonButton'
import { createRef } from 'react'
import { CONTROL_HEIGHTS, CONTROL_MOTION, CONTROL_SPRITE_SHADOW, controlState } from '@/components/cartoon/controlTokens'

afterEach(cleanup)
describe('existing-art button primitive states', () => {
  it.each(['pill', 'circle'] as const)('keeps %s pending authoritative over caller busy=false', kind => {
    const Button = kind === 'pill' ? CartoonButton : CartoonCircleButton
    const { rerender } = render(<Button pending aria-busy={false} aria-label="Xác nhận" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button')).toBeDisabled()
    rerender(<Button disabled aria-busy={false} aria-label="Xác nhận" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByRole('button')).toBeDisabled()
    rerender(<Button aria-busy="true" aria-label="Xác nhận" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button')).toBeEnabled()
  })
  it.each(['pill', 'circle'] as const)('forwards the %s ref to the real native button', kind => {
    const Button = kind === 'pill' ? CartoonButton : CartoonCircleButton
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref} aria-label="Tiếp tục" />)
    expect(ref.current).toBe(screen.getByRole('button'))
  })
  it('preserves every existing size, original shadow and spring values', () => {
    expect(CONTROL_HEIGHTS).toEqual({ pill: { sm: 'h-10', md: 'h-14', lg: 'h-16' }, circle: { sm: 'h-10', md: 'h-14', lg: 'h-16', xl: 'h-20' } })
    expect(CONTROL_MOTION).toEqual({
      pill: { press: { scaleX: 1.09, scaleY: 0.87, transition: { type: 'spring', stiffness: 700, damping: 22 } }, hover: { scaleX: 1.04, scaleY: 0.97, transition: { type: 'spring', stiffness: 350, damping: 18 } }, return: { type: 'spring', stiffness: 420, damping: 9 } },
      circle: { press: { scaleX: 1.14, scaleY: 0.86, transition: { type: 'spring', stiffness: 700, damping: 22 } }, hover: { scaleX: 1.06, scaleY: 0.96, transition: { type: 'spring', stiffness: 350, damping: 18 } }, return: { type: 'spring', stiffness: 360, damping: 8 } },
    })
    const { rerender } = render(<CartoonButton size="sm">Tiếp tục</CartoonButton>)
    for (const size of ['sm', 'md', 'lg'] as const) {
      rerender(<CartoonButton size={size}>Tiếp tục</CartoonButton>)
      expect(document.querySelector('img')).toHaveClass(CONTROL_HEIGHTS.pill[size])
      expect(document.querySelector('img')?.style.filter).toBe(CONTROL_SPRITE_SHADOW)
    }
    for (const size of ['sm', 'md', 'lg', 'xl'] as const) {
      rerender(<CartoonCircleButton size={size} aria-label="Nhật ký" />)
      expect(document.querySelector('img')).toHaveClass(CONTROL_HEIGHTS.circle[size])
      expect(document.querySelector('img')?.style.filter).toBe(CONTROL_SPRITE_SHADOW)
    }
  })
  it('retains all original pill and circle sprite paths', () => {
    const { rerender } = render(<CartoonButton>Tiếp tục</CartoonButton>)
    for (const color of ['green', 'orange', 'pink', 'purple', 'teal']) {
      rerender(<CartoonButton color={color}>Tiếp tục</CartoonButton>)
      expect(document.querySelector('img')).toHaveAttribute('src', `/cartoon/buttons/pill/${color[0].toUpperCase() + color.slice(1)}.png`)
    }
    for (const [color, filename] of Object.entries({ blue: 'Blue', 'blue-teal': 'Blue-Teal', red: 'Red', yellow: 'Yellow', violet: 'Violet', purple: 'Purple', gray: 'Gray', dark: 'Dark', brown: 'Brown', bordeaux: 'Bordeaux', light: 'Light', neutral: 'Neutral', white: 'White', transparent: 'Transparent' })) {
      rerender(<CartoonCircleButton color={color} aria-label="Nhật ký" />)
      expect(document.querySelector('img')).toHaveAttribute('src', `/cartoon/buttons/circle/${filename}.png`)
    }
  })
  it('blocks motion for disabled, pending or reduced-motion without blocking reduced-motion clicks', () => {
    expect(controlState(undefined, false, null)).toEqual({ blocked: false, animate: true })
    expect(controlState(false, false, true)).toEqual({ blocked: false, animate: false })
    for (const [disabled, pending] of [[true, false], [false, true], [true, true]]) expect(controlState(disabled, pending, false)).toEqual({ blocked: true, animate: false })
  })
  it('defaults to non-submit and retains the existing sprite', () => {
    render(<CartoonButton>Tiếp tục</CartoonButton>)
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toHaveAttribute('type', 'button')
    expect(document.querySelector('img')).toHaveAttribute('src', '/cartoon/buttons/pill/Green.png')
  })
  it('allows explicit submit type', () => {
    render(<CartoonButton type="submit">Gửi</CartoonButton>)
    expect(screen.getByRole('button', { name: 'Gửi' })).toHaveAttribute('type', 'submit')
  })
  it('blocks duplicate activation while pending and announces busy', () => {
    const click = vi.fn()
    const { rerender } = render(<CartoonButton pending onClick={click}>Xác nhận</CartoonButton>)
    const button = screen.getByRole('button', { name: 'Xác nhận' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(click).not.toHaveBeenCalled()
    rerender(<CartoonButton onClick={click}>Xác nhận</CartoonButton>)
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
    fireEvent.click(button)
    expect(click).toHaveBeenCalledOnce()
  })
  it('retains disabled semantics without fabricating pending', () => {
    render(<CartoonButton disabled>Không khả dụng</CartoonButton>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('button')).toHaveClass('cartoon-control')
  })
  it('anchors the decorative badge to the sprite, not full-width button', () => {
    render(<CartoonButton badge="MỚI" className="w-full">Bộ thẻ 3d</CartoonButton>)
    expect(screen.getByText('MỚI').parentElement).toHaveAttribute('data-cartoon-surface', 'pill')
    expect(screen.getByText('MỚI')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Bộ thẻ 3d' })).toBeEnabled()
  })
  it('shares pending semantics with circles and retains meaningful counts', () => {
    const click = vi.fn()
    render(<CartoonCircleButton aria-label="Nhật ký" badge={0} pending onClick={click} />)
    const button = screen.getByRole('button', { name: 'Nhật ký' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('0')).not.toHaveAttribute('aria-hidden')
    fireEvent.click(button)
    expect(click).not.toHaveBeenCalled()
  })
})
