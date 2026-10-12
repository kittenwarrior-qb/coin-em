import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ImgHTMLAttributes } from 'react'
import { FlyingActionIconEffect } from '@/features/game/components/FlyingActionIconEffect'

const observed = vi.hoisted(() => ({ initial: {} as { x?: number; y?: number }, animate: {} as { x?: number; y?: number }, finish: undefined as (() => void) | undefined }))
vi.mock('framer-motion', () => ({ motion: { img: function MotionImageFixture({ initial, animate, onAnimationComplete, transition: _transition, ...props }:
  ImgHTMLAttributes<HTMLImageElement> & { initial: { x: number; y: number }; animate: { x: number; y: number }; onAnimationComplete: () => void; transition: unknown }) {
  observed.initial = initial; observed.animate = animate; observed.finish = onAnimationComplete
  void _transition
  return <img {...props} />
} } }))

function anchor(id: string, kind: 'avatar' | 'token', left: number, top: number) {
  const element = document.createElement('div')
  element.setAttribute(`data-player-${kind}-id`, id)
  element.setAttribute('data-fixture-anchor', '')
  element.getBoundingClientRect = () => ({ left, top, width: 40, height: 40, right: left + 40, bottom: top + 40, x: left, y: top, toJSON: () => ({}) })
  document.body.append(element)
}
afterEach(() => { cleanup(); document.querySelectorAll('[data-fixture-anchor]').forEach(element => element.remove()); observed.finish = undefined })

describe('extracted existing flying-icon component', () => {
  it('finishes safely when either current token is absent', () => {
    const done = vi.fn()
    const { container } = render(<FlyingActionIconEffect fromId="absent" toId="absent-target" iconSrc="/fixture.svg" nonce={1} onDone={done} />)
    expect(done).toHaveBeenCalledOnce()
    expect(container.querySelector('img')).toBeNull()
  })
  it('prefers avatar anchor and falls back to token anchor without changing motion/asset', () => {
    anchor('from', 'token', 500, 500); anchor('from', 'avatar', 10, 20); anchor('to', 'token', 70, 80)
    const done = vi.fn()
    const { container } = render(<FlyingActionIconEffect fromId="from" toId="to" iconSrc="/emcoin/icons/orbit/heal.svg" nonce={2} onDone={done} />)
    expect(observed.initial).toMatchObject({ x: 12, y: 22 })
    expect(observed.animate).toMatchObject({ x: 72, y: 82 })
    expect(container.querySelector('img')).toHaveAttribute('src', '/emcoin/icons/orbit/heal.svg')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
    expect(done).not.toHaveBeenCalled()
    observed.finish?.()
    expect(done).toHaveBeenCalledOnce()
  })
  it('handles IDs with selector punctuation by exact data comparison', () => {
    anchor('socket[quote"x]', 'avatar', 10, 20); anchor('target#[]', 'avatar', 70, 80)
    const done = vi.fn()
    const { container } = render(<FlyingActionIconEffect fromId={'socket[quote"x]'} toId="target#[]" iconSrc="/fixture.svg" nonce={3} onDone={done} />)
    expect(container.querySelector('img')).not.toBeNull()
    expect(done).not.toHaveBeenCalled()
  })
})
