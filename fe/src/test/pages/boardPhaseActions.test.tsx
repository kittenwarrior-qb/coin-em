import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BoardPhaseActions } from '@/features/game/phases/BoardPhaseActions'
import { PHASE_ACTION_RENDERERS, type BoardPhaseActionsProps } from '@/features/game/phases/phaseActionRenderers'
import { PHASE_LABELS, type GamePhase } from '@/stores/types'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const phases = Object.keys(PHASE_LABELS) as GamePhase[]
const props = (phase: GamePhase = 'night'): BoardPhaseActionsProps => ({
  scope: `fixture-${phase}`, phase, connected: true, pending: false,
  capabilities: { advance: true, rollback: true, heal: false, silence: false,
    selectSituation: false, selectEmotion: true, selectReflection: true, selectSelfcare: true,
    guessSilencer: false, isHealer: false, isSilencer: false },
  isNarrator: false, isSender: false, isSelfcareTurn: false, finiteCoins: true, rewardsConfirmed: false,
  emotionSelected: false, reflectionCount: 1, selfcareSelected: false,
  previous: 'role-reveal', next: 'healer-turn', nextDisabled: false, checkpointLocked: false,
  onNavigate: vi.fn(), onOpenInventory: vi.fn(), onAdvance: vi.fn(),
  onOpenGiveCoin: vi.fn(), onOpenTargetedCoin: vi.fn(), onOpenLegacyRewards: vi.fn(),
})
const callbacks = (p: BoardPhaseActionsProps) => [p.onNavigate, p.onOpenInventory, p.onAdvance,
  p.onOpenGiveCoin, p.onOpenTargetedCoin, p.onOpenLegacyRewards]

it('explicitly covers every approved phase including terminal without inventing destinations', () => {
  expect(Object.keys(PHASE_ACTION_RENDERERS).sort()).toEqual(phases.slice().sort())
})

it.each(['emotion-orbit', 'kindness-workshop'] as const)('themes %s phase arrows without changing destinations or locks', theme => {
  const p = props()
  const view = (locked: boolean) => <ControlThemeProvider theme={theme}><BoardPhaseActions {...p} isNarrator checkpointLocked={locked} nextDisabled={locked} /></ControlThemeProvider>
  const { rerender } = render(view(false))
  const prev = screen.getByTestId('btn-prev-phase'), next = screen.getByTestId('btn-next-phase')
  for (const button of [prev, next]) {
    expect(button).toHaveAttribute('data-control-theme', theme)
    expect(button.querySelector('img')).toHaveAttribute('src', `/cartoon/ui/themes/${theme}/circle.svg`)
    expect(button.querySelector('svg')).toBeInTheDocument()
  }
  fireEvent.click(prev); fireEvent.click(next)
  expect(p.onNavigate).toHaveBeenNthCalledWith(1, 'prev', 'role-reveal')
  expect(p.onNavigate).toHaveBeenNthCalledWith(2, 'next', 'healer-turn')
  rerender(view(true))
  expect(prev).toBeDisabled(); expect(next).toBeDisabled()
  fireEvent.click(prev); fireEvent.click(next)
  expect(p.onNavigate).toHaveBeenCalledTimes(2)
})

it.each(phases)('renders %s for owner/non-owner/offline/pending with no automatic command', phase => {
  const p = props(phase)
  for (const mode of ['owner', 'non-owner', 'offline', 'pending']) {
    const owner = mode !== 'non-owner'
    render(<BoardPhaseActions {...p} isSender={owner} isSelfcareTurn={owner}
      isNarrator={mode === 'offline' || mode === 'pending'}
      connected={mode !== 'offline'} pending={mode === 'pending'} />)
    for (const callback of callbacks(p)) expect(callback).not.toHaveBeenCalled()
    if (mode === 'offline' || mode === 'pending') {
      for (const button of screen.queryAllByRole('button')) {
        expect(button).toBeDisabled(); fireEvent.click(button)
      }
      for (const callback of callbacks(p)) expect(callback).not.toHaveBeenCalled()
    }
    if (mode === 'non-owner' && ['emotion-card', 'reflection-card', 'selfcare-card'].includes(phase)) {
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    }
    cleanup()
  }
})

it('retains exact narrator arrow assets, projected destinations and checkpoint explanation', () => {
  const p = props()
  const { rerender } = render(<BoardPhaseActions {...p} isNarrator />)
  const prev = screen.getByTestId('btn-prev-phase'), next = screen.getByTestId('btn-next-phase')
  expect(prev.querySelector('img')).toHaveAttribute('src', '/emcoin/icons/orbit/arrowRight.svg')
  expect(prev.querySelector('img')).toHaveClass('rotate-180')
  expect(next.querySelector('img')).toHaveAttribute('src', '/emcoin/icons/orbit/arrowRight.svg')
  fireEvent.click(prev); fireEvent.click(next)
  expect(p.onNavigate).toHaveBeenNthCalledWith(1, 'prev', 'role-reveal')
  expect(p.onNavigate).toHaveBeenNthCalledWith(2, 'next', 'healer-turn')
  rerender(<BoardPhaseActions {...p} isNarrator checkpointLocked nextDisabled />)
  expect(prev).toBeDisabled(); expect(prev).toHaveAttribute('aria-describedby', 'coin-checkpoint-note')
  expect(screen.getByText(/Không thể lùi bước sau khi đã trao hoặc thu Coin/)).toBeInTheDocument()
  fireEvent.click(prev); fireEvent.click(next)
  expect(p.onNavigate).toHaveBeenCalledTimes(2)
})

it('keeps emotion confirmed wording and capability-disabled inventory opener', () => {
  const p = props('emotion-card')
  const { rerender } = render(<BoardPhaseActions {...p} isSender />)
  fireEvent.click(screen.getByTestId('btn-select-emotion'))
  expect(p.onOpenInventory).toHaveBeenCalledWith('emotion')
  rerender(<BoardPhaseActions {...p} isSender emotionSelected capabilities={{ ...p.capabilities, selectEmotion: false }} />)
  const button = screen.getByTestId('btn-select-emotion')
  expect(button).toHaveTextContent('Đổi thẻ'); expect(button).toBeDisabled(); fireEvent.click(button)
  expect(p.onOpenInventory).toHaveBeenCalledOnce()
})

it('retains reflection zero/three boundaries and explicit server-guarded confirmation', () => {
  const p = props('reflection-card')
  const { rerender } = render(<BoardPhaseActions {...p} isSender reflectionCount={0} />)
  expect(screen.queryByTestId('btn-confirm-reflection')).not.toBeInTheDocument()
  fireEvent.click(screen.getByTestId('btn-select-reflection'))
  expect(p.onOpenInventory).toHaveBeenCalledWith('reflection')
  rerender(<BoardPhaseActions {...p} isSender reflectionCount={3} capabilities={{ ...p.capabilities, advance: false }} />)
  expect(screen.queryByTestId('btn-select-reflection')).not.toBeInTheDocument()
  const button = screen.getByTestId('btn-confirm-reflection')
  expect(button).toHaveTextContent('Xác nhận (3 thẻ)'); expect(button).toBeDisabled()
  fireEvent.click(button); expect(p.onAdvance).not.toHaveBeenCalled()
  rerender(<BoardPhaseActions {...p} isSender reflectionCount={3} />)
  fireEvent.click(button); expect(p.onAdvance).toHaveBeenCalledOnce()
})

it('separates optional finite sender gifts from already-confirmed legacy rewards', () => {
  const p = props('group-response')
  const { rerender } = render(<BoardPhaseActions {...p} isSender rewardsConfirmed />)
  const button = screen.getByTestId('btn-open-ntg-reward-picker')
  expect(button).toHaveTextContent('Trao Coin Đỏ'); fireEvent.click(button)
  expect(p.onOpenGiveCoin).toHaveBeenCalledOnce(); expect(p.onOpenLegacyRewards).not.toHaveBeenCalled()
  rerender(<BoardPhaseActions {...p} isSender finiteCoins={false} rewardsConfirmed />)
  expect(button).toHaveTextContent('Đã chọn'); expect(button).toBeDisabled(); fireEvent.click(button)
  expect(p.onOpenLegacyRewards).not.toHaveBeenCalled()
  rerender(<BoardPhaseActions {...p} isSender finiteCoins={false} />)
  fireEvent.click(button); expect(p.onOpenLegacyRewards).toHaveBeenCalledOnce()
})

it('preserves finite non-sender narrator gift access but hides that legacy-only opener', () => {
  const p = props('group-response')
  const { rerender } = render(<BoardPhaseActions {...p} isNarrator />)
  fireEvent.click(screen.getByTestId('btn-give-coin-to-ntg'))
  expect(p.onOpenTargetedCoin).toHaveBeenCalledOnce()
  rerender(<BoardPhaseActions {...p} isNarrator finiteCoins={false} />)
  expect(screen.queryByTestId('btn-give-coin-to-ntg')).not.toBeInTheDocument()
})

it('retains selfcare local opener only for the projected chooser', () => {
  const p = props('selfcare-card')
  const { rerender } = render(<BoardPhaseActions {...p} />)
  expect(screen.queryByTestId('btn-select-selfcare')).not.toBeInTheDocument()
  rerender(<BoardPhaseActions {...p} isSelfcareTurn selfcareSelected />)
  const button = screen.getByTestId('btn-select-selfcare')
  expect(button).toHaveTextContent('Đổi thẻ'); fireEvent.click(button)
  expect(p.onOpenInventory).toHaveBeenCalledWith('selfcare')
})

it('old action callbacks cannot act during new pending, phase-instance replacement or unmount', () => {
  const p = props('give-coins')
  const renderer = vi.spyOn(PHASE_ACTION_RENDERERS, 'give-coins')
  const { rerender, unmount } = render(<BoardPhaseActions {...p} />)
  const old = renderer.mock.calls[0][0].onOpenGiveCoin
  rerender(<BoardPhaseActions {...p} pending />)
  old(); expect(p.onOpenGiveCoin).not.toHaveBeenCalled()
  rerender(<BoardPhaseActions {...p} scope="new-phase-instance" />)
  old(); expect(p.onOpenGiveCoin).not.toHaveBeenCalled()
  const current = renderer.mock.calls.at(-1)![0].onOpenGiveCoin
  current(); expect(p.onOpenGiveCoin).toHaveBeenCalledOnce()
  unmount(); current(); expect(p.onOpenGiveCoin).toHaveBeenCalledOnce()
})
