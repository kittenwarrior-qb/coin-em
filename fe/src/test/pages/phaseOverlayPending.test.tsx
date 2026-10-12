import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { EndedOverlay, GuessSilencerOverlay, RevealSilencerOverlay, RewardOverlay } from '@/components/game/PhaseOverlays'
import GameBoard from '@/pages/GameBoard'
import type { Player, RoomState, PhaseView } from '@/components/game/types'
import { CARD_DATA } from '@/constants/cardCatalog'

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined())
})
const players: Player[] = [
  { id: 'guest', userId: 'guest', name: 'Guest', role: 'Quản trò', isMe: true, isNarrator: true, coins: { red: 2, green: 3, yellow: 4 } },
  { id: 'partner', name: 'Partner', role: '', isMe: false, coins: { red: 0, green: 0, yellow: 0 } },
]

it('keeps summary counts and explicit confirmation while pending/capability-locked; Back/Esc cannot advance', async () => {
  const next = vi.fn()
  const props = { players, currentRound: 1, totalRounds: 2, isNarrator: true, onNext: next }
  const { rerender } = render(<RewardOverlay {...props} pending />)
  expect(screen.getByRole('dialog', { name: 'Tổng kết lượt 1/2' })).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByText('💚 3')).toBeInTheDocument()
  expect(screen.getByText('💛 4')).toBeInTheDocument()
  expect(screen.getByText('❤️ 2')).toBeInTheDocument()
  const button = screen.getByTestId('btn-next-round')
  expect(button).toBeDisabled()
  fireEvent.click(button); fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  expect(next).not.toHaveBeenCalled()
  rerender(<RewardOverlay {...props} canAdvance={false} />)
  fireEvent.click(button)
  expect(button).toBeDisabled(); expect(next).not.toHaveBeenCalled()
  rerender(<RewardOverlay {...props} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(next).not.toHaveBeenCalled()
  fireEvent.click(button)
  expect(next).toHaveBeenCalledOnce()
})

it('does not advance through outgoing summary controls during real animation', async () => {
  const next = vi.fn()
  const view = (open: boolean) => <AnimatePresence>{open && <RewardOverlay players={players} currentRound={2} totalRounds={2} isNarrator onNext={next} />}</AnimatePresence>
  const { rerender } = render(view(true))
  expect(screen.getByTestId('btn-next-round')).toHaveTextContent('Kết thúc game')
  rerender(view(false))
  const button = screen.getByTestId('btn-next-round')
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(next).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByTestId('btn-next-round')).not.toBeInTheDocument())
})

it('keeps votes nonmodal and does not emit while pending or invent a success', () => {
  const vote = vi.fn(), history = window.history.state
  const props = { players, hasVoted: false, onVote: vote }
  const { rerender } = render(<GuessSilencerOverlay {...props} pending />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(window.history.state).toEqual(history)
  expect(screen.getByRole('group', { name: 'Bình chọn Người Im Lặng' })).toHaveAttribute('aria-busy', 'true')
  const button = screen.getByTestId('btn-vote-silencer-Partner')
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(vote).not.toHaveBeenCalled()
  expect(screen.queryByText('Đã ghi nhận bình chọn')).not.toBeInTheDocument()
  rerender(<GuessSilencerOverlay {...props} />)
  fireEvent.click(button)
  expect(vote).toHaveBeenCalledOnce(); expect(vote).toHaveBeenCalledWith('partner')
})

it('blocks old vote buttons during phase exit without changing original avatar assets', async () => {
  const vote = vi.fn()
  const view = (open: boolean) => <AnimatePresence>{open && <GuessSilencerOverlay players={players} hasVoted={false} onVote={vote} />}</AnimatePresence>
  const { rerender } = render(view(true))
  const original = screen.getByTestId('btn-vote-silencer-Partner').querySelector('img')?.getAttribute('src')
  rerender(view(false))
  const button = screen.getByTestId('btn-vote-silencer-Partner')
  expect(button.querySelector('img')).toHaveAttribute('src', original)
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(vote).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByTestId('btn-vote-silencer-Partner')).not.toBeInTheDocument())
})

it('revelation pending blocks dismissal; settled Escape closes locally once and returns opener focus', async () => {
  const completed = vi.fn()
  const props = { players, votes: {}, onCloseComplete: completed }
  const { rerender } = render(<><button>Open revelation</button></>)
  const opener = screen.getByRole('button', { name: 'Open revelation' })
  opener.focus()
  rerender(<><button>Open revelation</button><RevealSilencerOverlay {...props} pending /></>)
  expect(screen.getByRole('dialog', { name: 'Tiết lộ vai trò' })).toHaveAttribute('aria-busy', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  expect(completed).not.toHaveBeenCalled()
  rerender(<><button>Open revelation</button><RevealSilencerOverlay {...props} /></>)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Đã xem' })).toBeDisabled()
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tiết lộ vai trò' })).not.toBeInTheDocument())
  expect(completed).toHaveBeenCalledOnce()
  await waitFor(() => expect(opener).toHaveFocus())
})

it('revelation cannot open a reward preview from an outgoing phase animation', async () => {
  const completed = vi.fn()
  const view = (open: boolean) => <AnimatePresence>{open && <RevealSilencerOverlay players={players} votes={{ guest: 'partner' }} onCloseComplete={completed} />}</AnimatePresence>
  const { rerender } = render(view(true))
  const button = screen.getByRole('button', { name: 'Đã xem' })
  fireEvent.click(button)
  expect(button).toBeDisabled()
  rerender(view(false))
  // Original phase removal has no exit animation: retain that behavior and
  // exercise the detached control rather than inventing an outgoing DOM node.
  expect(button).not.toBeInTheDocument(); fireEvent.click(button)
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tiết lộ vai trò', hidden: true })).not.toBeInTheDocument())
  expect(completed).not.toHaveBeenCalled()
})

it('revelation completed local animation waits for a newly pending operation before opening its preview', async () => {
  const completed = vi.fn()
  const props = { players, votes: {}, onCloseComplete: completed }
  const { rerender } = render(<RevealSilencerOverlay {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Đã xem' }))
  rerender(<RevealSilencerOverlay {...props} pending />)
  await act(async () => { await new Promise(done => setTimeout(done, 250)) })
  expect(completed).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Tiết lộ vai trò' })).toBeInTheDocument()
  rerender(<RevealSilencerOverlay {...props} />)
  await waitFor(() => expect(completed).toHaveBeenCalledOnce())
  expect(screen.queryByRole('dialog', { name: 'Tiết lộ vai trò' })).not.toBeInTheDocument()
})

const capabilities: PhaseView['capabilities'] = { advance: true, rollback: false, heal: false, silence: false,
  selectSituation: false, selectEmotion: false, selectReflection: false, selectSelfcare: false, guessSilencer: false, isHealer: false, isSilencer: false }
const room: RoomState = { id: 'summary-fixture', host: 'guest', status: 'playing', phase: 'reward', phaseInstance: 'reward-1', revision: 1,
  currentRound: 1, totalRounds: 2, players: [{ userId: 'guest', socketId: 'socket', name: 'Guest', isNarrator: true, coins: players[0].coins }],
  phaseView: { version: 'phase-view/v1', phase: 'reward', position: 16, total: 16, next: 'role-reveal', previous: 'give-coins', capabilities } }
const boardProps = () => ({ roomId: room.id, roomState: room, myUserId: 'guest', mySocketId: 'socket', isConnected: true,
  onLeave: vi.fn(), nextTurn: vi.fn(), prevTurn: vi.fn(), nightAction: vi.fn(), emitSelectCard: vi.fn(),
  sendResponse: vi.fn(), ntgVote: vi.fn(), confirmRoleRewards: vi.fn(), shareReflection: vi.fn(),
  emitCardPreview: vi.fn(), emitSituationFanState: vi.fn(), situationPreviewCard: null, situationFanState: null,
  submitVote: vi.fn(), giveCoin: vi.fn().mockResolvedValue(false) })

it('terminal panel keeps original totals and requires explicit connected nonpending leave, never Back/Esc', async () => {
  const leave = vi.fn()
  const props = { players, onLeave: leave }
  const { rerender } = render(<EndedOverlay {...props} pending />)
  expect(screen.getByRole('dialog', { name: 'Hành trình kết thúc' })).toHaveAttribute('aria-busy', 'true')
  expect(screen.getByText('Coin nhận được qua các lượt')).toBeInTheDocument()
  expect(screen.getByText('💚 3')).toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Rời phòng' })
  expect(button).toBeDisabled()
  fireEvent.click(button); fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  expect(leave).not.toHaveBeenCalled()
  rerender(<EndedOverlay {...props} canLeave={false} />)
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(leave).not.toHaveBeenCalled()
  rerender(<EndedOverlay {...props} />)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(leave).not.toHaveBeenCalled()
  fireEvent.click(button)
  expect(leave).toHaveBeenCalledOnce()
})

it('real terminal unmount keeps detached leave control inert without inventing exit animation', () => {
  const leave = vi.fn()
  const { unmount } = render(<EndedOverlay players={players} onLeave={leave} />)
  const button = screen.getByRole('button', { name: 'Rời phòng' })
  unmount()
  fireEvent.click(button)
  expect(leave).not.toHaveBeenCalled()
})

it('real board propagates parent leave pending to terminal panel and locks a still-playing summary', () => {
  const props = boardProps()
  const terminal: RoomState = { ...room, status: 'ended', phase: 'ended', phaseView: {
    ...room.phaseView!, phase: 'ended', position: null, next: null, previous: null,
    capabilities: { ...capabilities, advance: false },
  } }
  const { rerender } = render(<GameBoard {...props} roomState={terminal} leavePending />)
  const button = screen.getByRole('button', { name: 'Rời phòng' })
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(props.onLeave).not.toHaveBeenCalled()
  rerender(<GameBoard {...props} roomState={terminal} isConnected={false} />)
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(props.onLeave).not.toHaveBeenCalled()
  rerender(<GameBoard {...props} roomState={room} leavePending />)
  const advance = screen.getByTestId('btn-next-round')
  expect(advance).toBeDisabled(); fireEvent.click(advance)
  expect(props.nextTurn).not.toHaveBeenCalled()
})

it('routes real-board summary advance through bounded controller, blocks duplicates and retains rejected summary', async () => {
  let ack!: (ok: boolean) => void
  const props = { ...boardProps(), nextTurn: vi.fn(() => new Promise<boolean>(resolve => { ack = resolve })) }
  render(<GameBoard {...props} />)
  const button = screen.getByTestId('btn-next-round')
  fireEvent.click(button); fireEvent.click(button)
  expect(props.nextTurn).toHaveBeenCalledOnce(); expect(props.nextTurn).toHaveBeenCalledWith(room.id)
  expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(props.onLeave).not.toHaveBeenCalled()
  await act(async () => { ack(false) })
  expect(button).toBeEnabled()
  expect(screen.getByRole('dialog', { name: 'Tổng kết lượt 1/2' })).toBeInTheDocument()
  expect(screen.getByTestId('game-phase')).toHaveAttribute('data-phase', 'reward')
  expect(props.nextTurn).toHaveBeenCalledOnce()
})

it.each(['offline', 'capability'] as const)('real-board summary does not advance when %s', reason => {
  const props = boardProps()
  render(<GameBoard {...props} isConnected={reason !== 'offline'} roomState={reason === 'capability'
    ? { ...room, phaseView: { ...room.phaseView!, capabilities: { ...capabilities, advance: false } } } : room} />)
  const button = screen.getByTestId('btn-next-round')
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(props.nextTurn).not.toHaveBeenCalled()
})

it('old summary ACK cannot unlock a newer phase-instance summary intent', async () => {
  const acknowledgements: Array<(ok: boolean) => void> = []
  const props = { ...boardProps(), nextTurn: vi.fn(() => new Promise<boolean>(resolve => { acknowledgements.push(resolve) })) }
  const { rerender } = render(<GameBoard {...props} />)
  fireEvent.click(screen.getByTestId('btn-next-round'))
  rerender(<GameBoard {...props} roomState={{ ...room, revision: 2, phaseInstance: 'reward-2' }} />)
  fireEvent.click(screen.getByTestId('btn-next-round'))
  expect(props.nextTurn).toHaveBeenCalledTimes(2)
  await act(async () => { acknowledgements[0](true) })
  expect(screen.getByTestId('btn-next-round')).toBeDisabled()
  expect(props.onLeave).not.toHaveBeenCalled()
  await act(async () => { acknowledgements[1](false) })
  expect(screen.getByTestId('btn-next-round')).toBeEnabled()
  expect(props.nextTurn).toHaveBeenCalledTimes(2)
})

const reflectionRoom: RoomState = { ...room, phase: 'reflection-card', phaseInstance: 'reflection-1', selectedCard: CARD_DATA.reflection[0],
  players: [{ ...room.players[0], isNarrator: false, isSender: true }],
  phaseView: { ...room.phaseView!, phase: 'reflection-card', position: 9, next: 'reflection-sharing', previous: 'group-response',
    capabilities: { ...capabilities, selectReflection: true } } }

it('reflection confirm awaits its existing ACK, blocks duplicates and preserves exact selected card on rejection', async () => {
  let ack!: (ok: boolean) => void
  const props = { ...boardProps(), roomState: reflectionRoom, nextTurn: vi.fn(() => new Promise<boolean>(resolve => { ack = resolve })) }
  render(<GameBoard {...props} />)
  const button = screen.getByTestId('btn-confirm-reflection')
  expect(button).toHaveTextContent('1 thẻ')
  fireEvent.click(button); fireEvent.click(button)
  expect(props.nextTurn).toHaveBeenCalledOnce(); expect(props.nextTurn).toHaveBeenCalledWith(room.id)
  expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true')
  await act(async () => { ack(false) })
  expect(button).toBeEnabled(); expect(button).toHaveTextContent('1 thẻ')
  expect(screen.getByTestId('game-phase')).toHaveAttribute('data-phase', 'reflection-card')
  expect(props.nextTurn).toHaveBeenCalledOnce()
  expect(props.emitSelectCard).not.toHaveBeenCalled()
})

it('reflection confirm respects denied server capability without inventing a local advance', () => {
  const props = { ...boardProps(), roomState: { ...reflectionRoom, phaseView: { ...reflectionRoom.phaseView!,
    capabilities: { ...reflectionRoom.phaseView!.capabilities, advance: false } } } }
  render(<GameBoard {...props} />)
  const button = screen.getByTestId('btn-confirm-reflection')
  expect(button).toBeDisabled(); fireEvent.click(button)
  expect(props.nextTurn).not.toHaveBeenCalled()
})
