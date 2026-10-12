import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence, type HTMLMotionProps } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { SelectedCardPreview } from '@/features/game/components/SelectedCardPreview'
import { previewNavigation } from '@/features/game/selectors/previewNavigation'
import { CARD_DATA } from '@/constants/cardCatalog'
import type { SelectedCards } from '@/stores/types'

const capture = vi.hoisted(() => ({ gestures: [] as Array<(event: unknown, info: { offset: { x: number } }) => void>,
  cards: [] as Array<Record<string, unknown>> }))
vi.mock('@/components/game/FlipCard', () => ({ FlipCard: (props: Record<string, unknown>) => {
  capture.cards.push(props)
  return <div data-testid="supplied-card">{String(props.altText)}</div>
} }))
vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  const React = await import('react')
  const Div = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>((props, ref) => {
    if (props.dragElastic === 0.15 && props.onDragEnd) {
      capture.gestures.push(props.onDragEnd as typeof capture.gestures[number])
    }
    return <actual.motion.div {...props} ref={ref} />
  })
  return { ...actual, motion: new Proxy(actual.motion, { get(target, name) {
    return name === 'div' ? Div : Reflect.get(target, name)
  } }) }
})
afterEach(async () => {
  cleanup(); capture.cards.length = 0; capture.gestures.length = 0
  await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
})
const situation = CARD_DATA.situation[0], emotion = CARD_DATA.emotion[0]
const reflections = CARD_DATA.reflection.slice(0, 3)
const selected: SelectedCards = { situation, emotion, reflections }

it('keeps reflection order, original object identity and edge navigation without changing selections', () => {
  const before = JSON.stringify(selected)
  const nav = previewNavigation({ card: reflections[1], revealed: true }, selected, 'reflection-sharing')
  expect(nav.entries.map(entry => entry.card)).toEqual(reflections)
  expect(nav.previous?.card).toBe(reflections[0]); expect(nav.next?.card).toBe(reflections[2])
  expect(nav.entries.every(entry => entry.revealed)).toBe(true)
  expect(previewNavigation({ card: reflections[0], revealed: true }, selected, 'reflection-card').previous).toBeNull()
  expect(previewNavigation({ card: reflections[2], revealed: true }, selected, 'reflection-card').next).toBeNull()
  expect(JSON.stringify(selected)).toBe(before)
})

it.each(['situation-card', 'emotion-card'] as const)('keeps authorized situation/emotion order and original reveal rule during %s', phase => {
  const nav = previewNavigation({ card: emotion, revealed: true }, selected, phase)
  expect(nav.previous).toEqual({ card: situation, revealed: phase !== 'situation-card' })
  expect(nav.entries[1]).toEqual({ card: emotion, revealed: true })
  expect(nav.next).toBeNull()
})

it('never finds extra cards in a catalog or gives unrelated/absent selections navigation', () => {
  for (const card of [CARD_DATA.roles[0], CARD_DATA.selfcare[0], CARD_DATA.reflection[3]]) {
    const nav = previewNavigation({ card, revealed: false }, selected, 'night')
    expect(nav.canNavigate).toBe(false); expect(nav.previous).toBeNull(); expect(nav.next).toBeNull()
  }
  expect(previewNavigation({ card: situation, revealed: true }, { reflections: [] }, 'emotion-card').canNavigate).toBe(false)
  expect(previewNavigation({ card: reflections[0], revealed: true }, { reflections: [reflections[0]] }, 'reflection-card').entries).toEqual([])
})

const props = () => ({ preview: { card: emotion, revealed: true }, selected, phase: 'situation-card' as const,
  scope: 'fixture-phase-1', pending: false, onChange: vi.fn(), onClose: vi.fn() })

it('passes unchanged large front/back/initial face to FlipCard and exact authorized neighbor to parent', () => {
  const p = props()
  const { rerender } = render(<SelectedCardPreview {...p} />)
  expect(capture.cards.at(-1)).toMatchObject({ frontImage: emotion.frontImage, backImage: emotion.backImage,
    altText: emotion.id, size: 'large', initialFlipped: false, allowFlip: true })
  fireEvent.click(screen.getByRole('button', { name: 'Thẻ trước' }))
  expect(p.onChange).toHaveBeenCalledWith({ card: situation, revealed: false })
  rerender(<SelectedCardPreview {...p} preview={{ card: situation, revealed: false }} />)
  expect(capture.cards.at(-1)).toMatchObject({ frontImage: situation.frontImage, backImage: situation.backImage,
    initialFlipped: true, allowFlip: false })
  expect(screen.getByRole('button', { name: 'Thẻ trước' })).toBeDisabled()
})

it('keeps original strict 60px drag threshold and blocks previously captured gestures after pending or scope replacement', () => {
  const p = props()
  const { rerender, unmount } = render(<SelectedCardPreview {...p} />)
  const old = capture.gestures.at(-1)!
  act(() => { old({}, { offset: { x: 60 } }); old({}, { offset: { x: -61 } }) })
  expect(p.onChange).not.toHaveBeenCalled()
  act(() => old({}, { offset: { x: 61 } }))
  expect(p.onChange).toHaveBeenCalledOnce()
  expect(p.onChange).toHaveBeenCalledWith({ card: situation, revealed: false })
  rerender(<SelectedCardPreview {...p} pending />)
  act(() => old({}, { offset: { x: 80 } }))
  expect(p.onChange).toHaveBeenCalledOnce()
  expect(capture.cards.at(-1)?.allowFlip).toBe(false)
  rerender(<SelectedCardPreview {...p} scope="new-phase" />)
  act(() => old({}, { offset: { x: 80 } }))
  expect(p.onChange).toHaveBeenCalledOnce()
  const current = capture.gestures.at(-1)!
  unmount(); act(() => current({}, { offset: { x: 80 } }))
  expect(p.onChange).toHaveBeenCalledOnce()
})

it('pending consumes Back/Esc and blocks close/navigation while keeping the same original card props', async () => {
  const p = props()
  render(<SelectedCardPreview {...p} pending />)
  expect(screen.getByRole('dialog', { name: 'Xem thẻ đã chọn' })).toHaveAttribute('aria-busy', 'true')
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  for (const button of screen.getAllByRole('button')) { expect(button).toBeDisabled(); fireEvent.click(button) }
  expect(p.onClose).not.toHaveBeenCalled(); expect(p.onChange).not.toHaveBeenCalled()
  expect(capture.cards.at(-1)).toMatchObject({ frontImage: emotion.frontImage, backImage: emotion.backImage })
})

it('actual AnimatePresence exit disables controls and captured gestures without suppressing original animation', async () => {
  const p = props()
  const view = (open: boolean) => <AnimatePresence>{open && <SelectedCardPreview {...p} />}</AnimatePresence>
  const { rerender } = render(view(true))
  const gesture = capture.gestures.at(-1)!
  rerender(view(false))
  const prev = screen.queryByRole('button', { name: 'Thẻ trước', hidden: true })
  if (prev) { expect(prev).toBeDisabled(); fireEvent.click(prev) }
  act(() => gesture({}, { offset: { x: 80 } }))
  expect(p.onChange).not.toHaveBeenCalled(); expect(p.onClose).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument())
})
