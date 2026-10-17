import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GameContainer from '../../pages/GameContainer'

const mock = vi.hoisted(() => ({ connected: true, error: null as string | null,
  status: 'playing' as 'waiting' | 'playing' | 'ended', room: true, mounts: 0, unmounts: 0, clearError: vi.fn(), retry: vi.fn(), start: vi.fn(),
  admission: null as 'pending' | 'uncertain' | 'rejected' | null,
  coinStatus: null as 'pending' | 'uncertain' | 'confirmed' | null, join: vi.fn(), settings: vi.fn(), leave: vi.fn(), clear: vi.fn(), disconnect: vi.fn(), connect: vi.fn() }))

vi.mock('../../hooks/useSocket', () => ({ useSocket: () => ({
  isConnected: mock.connected, error: mock.error, clearError: mock.clearError,
  admissionAction: mock.admission,
  roomState: mock.room ? { id: 'fixture-room', players: [], status: mock.status, host: 'guest', currentRound: 1 } : null,
  currentSocketId: 'fixture-socket', availableRooms: [], resumeCandidates: [],
  retryPendingCoin: mock.retry, coinAction: mock.coinStatus ? { status: mock.coinStatus,
    intent: { roomId: 'fixture-room', receiverUserId: 'fixture-target', coinType: 'red', amount: 2 } } : null,
  joinRoom: mock.join, updateRoomSettings: mock.settings, startGame: mock.start,
  leaveRoom: mock.leave, clearSession: mock.clear, socket: { disconnect: mock.disconnect, connect: mock.connect,
    connected: false, on: vi.fn(), off: vi.fn() },
}) }))
vi.mock('../../utils/userId', () => ({ getUserId: () => 'fixture-guest' }))
vi.mock('../../hooks/useAssetPreloader', () => ({ useAssetPreloader: () => ({}) }))
vi.mock('../../components/AssetPreloaderScreen', async () => {
  const { useEffect } = await import('react')
  function PreloaderFixture({ onExited, onFullyGone }: { onExited: (rect: object) => void; onFullyGone: () => void }) {
    useEffect(() => { onExited({ left: 0, top: 0, w: 0, h: 0 }); onFullyGone() }, [onExited, onFullyGone])
    return null
  }
  return { AssetPreloaderScreen: PreloaderFixture }
})
vi.mock('../../components/cartoon', () => ({
  CartoonScreen: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartoonButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('../../pages/Lobby', () => ({ default: ({ onCreateRoom }: { onCreateRoom: (name: string, decks: object) => void }) =>
  <button onClick={() => onCreateRoom('Fixture guest', { situation: { light: false, medium: true }, emotion: { basic: true } })}>
    Tạo phòng kiểm thử
  </button> }))
vi.mock('../../pages/WaitingRoom', () => ({ default: ({ onLeave, onStartGame, startPending, isConnected }: { onLeave: () => void; onStartGame: () => void; startPending: boolean; isConnected: boolean }) =>
  <><button onClick={onLeave}>Fixture leave</button><button disabled={startPending || !isConnected} onClick={onStartGame}>Fixture start game</button></> }))
vi.mock('../../pages/GameBoard', async () => {
  const { useEffect, useState } = await import('react')
  function BoardFixture({ onLeave, leavePending }: { onLeave: () => void; leavePending: boolean }) {
    const [draft, setDraft] = useState('')
    useEffect(() => { mock.mounts++; return () => { mock.unmounts++ } }, [])
    return <><input aria-label="Bản nháp kiểm thử" value={draft} onChange={event => setDraft(event.target.value)} /><button disabled={leavePending} onClick={onLeave}>Fixture leave</button></>
  }
  return { default: BoardFixture }
})

describe('confirmed board transport boundary', () => {
  it.each(['waiting', 'playing', 'ended'] as const)('keeps %s notice text on a full row when both recovery actions exist', status => {
    mock.status = status
    mock.coinStatus = 'uncertain'
    mock.error = 'Chưa xác nhận được lượt trao Coin. Thử lại đúng lượt trao này sẽ không trừ Coin hai lần.'
    render(<GameContainer />)
    const notice = screen.getByRole('complementary', { name: 'Trạng thái phiên chơi' })
    expect(notice.parentElement).toHaveClass('game-viewport')
    const message = screen.getByRole('alert').parentElement!
    expect(notice).toHaveClass('flex-wrap')
    expect(message).toHaveClass('basis-full')
    expect(message).not.toHaveClass('flex-1')
    expect(message).toContainElement(screen.getByRole('status'))
    const retry = screen.getByRole('button', { name: 'Kiểm tra lượt trao' })
    const dismiss = screen.getByRole('button', { name: 'Đóng thông báo' })
    expect(message).not.toContainElement(retry)
    expect(message).not.toContainElement(dismiss)
    fireEvent.click(retry)
    fireEvent.click(dismiss)
    expect(mock.retry).toHaveBeenCalledOnce()
    expect(mock.clearError).toHaveBeenCalledOnce()
  })

  beforeEach(() => {
    mock.connected = true; mock.error = null; mock.status = 'playing'; mock.room = true
    mock.admission = null
    mock.mounts = 0; mock.unmounts = 0; mock.clearError.mockReset()
    mock.coinStatus = null; mock.retry.mockReset()
    mock.join.mockReset(); mock.settings.mockReset()
    mock.start.mockReset()
    mock.leave.mockReset(); mock.clear.mockReset(); mock.disconnect.mockReset(); mock.connect.mockReset()
  })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('keeps the lobby mounted with a scoped rejected admission instead of the reload error screen', () => {
    mock.room = false; mock.admission = 'rejected'; mock.error = 'Phòng đã đủ 10 người.'
    render(<GameContainer />)
    expect(screen.getByRole('button', { name: 'Tạo phòng kiểm thử' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(mock.error)
    expect(screen.queryByRole('button', { name: /Tải lại trang/ })).not.toBeInTheDocument()
  })

  it.each(['waiting', 'playing', 'ended'] as const)('does not clear %s session or reconnect before true leave ACK', async status => {
    mock.status = status
    let ack!: (ok: boolean) => void
    mock.leave.mockImplementation(() => new Promise<boolean>(resolve => { ack = resolve }))
    render(<GameContainer />)
    fireEvent.click(screen.getByRole('button', { name: 'Fixture leave' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fixture leave' }))
    expect(mock.leave).toHaveBeenCalledOnce()
    if (status !== 'waiting') expect(screen.getByRole('button', { name: 'Fixture leave' })).toBeDisabled()
    expect(mock.clear).not.toHaveBeenCalled()
    expect(mock.disconnect).not.toHaveBeenCalled()
    await act(async () => { ack(true) })
    expect(mock.clear).toHaveBeenCalledWith({ keepStorage: status === 'playing' })
    expect(mock.disconnect).toHaveBeenCalledOnce()
    expect(mock.connect).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Tạo phòng kiểm thử' })).toBeInTheDocument()
  })

  it.each(['false', 'reject'])('keeps room/session when leave returns %s', async mode => {
    mock.leave.mockImplementation(() => mode === 'false' ? Promise.resolve(false) : Promise.reject(new Error('fixture')))
    render(<GameContainer />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Fixture leave' })) })
    expect(mock.clear).not.toHaveBeenCalled()
    expect(mock.disconnect).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Bản nháp kiểm thử')).toBeInTheDocument()
  })

  it('locks start while waiting for ACK and keeps waiting state on rejection', async () => {
    mock.status = 'waiting'
    let resolve!: (ok: boolean) => void
    mock.start.mockImplementation(() => new Promise<boolean>(yes => { resolve = yes }))
    render(<GameContainer />)
    const start = screen.getByRole('button', { name: 'Fixture start game' })
    fireEvent.click(start)
    fireEvent.click(start)
    expect(mock.start).toHaveBeenCalledOnce()
    expect(start).toBeDisabled()
    await act(async () => { resolve(false) })
    expect(start).toBeEnabled()
    expect(screen.queryByLabelText('Bản nháp kiểm thử')).not.toBeInTheDocument()
  })

  it('disables waiting-room start while disconnected', () => {
    mock.status = 'waiting'; mock.connected = false
    render(<GameContainer />)
    const start = screen.getByRole('button', { name: 'Fixture start game' })
    expect(start).toBeDisabled()
    fireEvent.click(start)
    expect(mock.start).not.toHaveBeenCalled()
  })

  it('shows scoped start uncertainty on callback failure instead of inventing a playing board', async () => {
    mock.status = 'waiting'; mock.start.mockRejectedValue(new Error('fixture'))
    render(<GameContainer />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Fixture start game' })) })
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa xác nhận')
    expect(screen.queryByLabelText('Bản nháp kiểm thử')).not.toBeInTheDocument()
  })

  it.each(['playing', 'ended'] as const)('keeps %s board and draft mounted through disconnect, action error and recovery', status => {
    mock.status = status
    const view = render(<GameContainer />)
    fireEvent.change(screen.getByLabelText('Bản nháp kiểm thử'), { target: { value: 'Nội dung chưa gửi' } })
    mock.connected = false
    view.rerender(<GameContainer />)
    expect(screen.getByRole('status')).toHaveTextContent('Mất kết nối')
    expect(screen.getByLabelText('Bản nháp kiểm thử')).toHaveValue('Nội dung chưa gửi')
    mock.error = 'Chưa xác nhận lượt trao Coin'
    view.rerender(<GameContainer />)
    expect(screen.getByRole('alert')).toHaveTextContent(mock.error)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(mock.clearError).toHaveBeenCalledOnce()
    mock.connected = true; mock.error = null
    view.rerender(<GameContainer />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Bản nháp kiểm thử')).toHaveValue('Nội dung chưa gửi')
    expect(mock.mounts).toBe(1)
    expect(mock.unmounts).toBe(0)
  })

  it('still shows initial connection loading when there is no confirmed room', () => {
    mock.connected = false; mock.room = false
    render(<GameContainer />)
    expect(screen.getByText('Đang kết nối...')).toBeInTheDocument()
    expect(screen.queryByLabelText('Bản nháp kiểm thử')).not.toBeInTheDocument()
  })

  it('offers bounded connection recovery and public guidance without offline commands or session clearing', () => {
    vi.useFakeTimers()
    mock.connected = false; mock.room = false
    const view = render(<GameContainer />)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(screen.getByText('Chưa kết nối được máy chủ')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Đọc hướng dẫn' })).toHaveAttribute('href', '/about/story')
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }))
    expect(mock.connect).toHaveBeenCalledOnce()
    expect(mock.disconnect).not.toHaveBeenCalled()
    expect(mock.clear).not.toHaveBeenCalled()
    expect(mock.join).not.toHaveBeenCalled()
    expect(mock.retry).not.toHaveBeenCalled()
    expect(screen.getByText('Đang kết nối...')).toBeInTheDocument()
    mock.connected = true
    view.rerender(<GameContainer />)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(screen.queryByText('Chưa kết nối được máy chủ')).not.toBeInTheDocument()
  })

  it('shows replacement/rejected session errors rather than an endless initial spinner after disconnect', () => {
    mock.connected = false; mock.room = false
    mock.error = 'Phiên chơi đã chuyển sang tab khác. Tab này đã ngắt kết nối.'
    render(<GameContainer />)
    expect(screen.getByRole('alert')).toHaveTextContent(mock.error)
    expect(screen.queryByText('Đang kết nối...')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bản nháp kiểm thử')).not.toBeInTheDocument()
    expect(mock.join).not.toHaveBeenCalled()
    expect(mock.retry).not.toHaveBeenCalled()
  })

  it('offers an explicit uncertain-gift check, never an offline retry or automatic emit', () => {
    mock.coinStatus = 'uncertain'; mock.connected = false
    const view = render(<GameContainer />)
    expect(screen.getAllByRole('status').at(-1)).toHaveTextContent('2 Coin Đỏ')
    const retry = screen.getByRole('button', { name: 'Kiểm tra lượt trao' })
    expect(retry).toBeDisabled()
    fireEvent.click(retry)
    expect(mock.retry).not.toHaveBeenCalled()
    mock.connected = true
    view.rerender(<GameContainer />)
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lượt trao' }))
    expect(mock.retry).toHaveBeenCalledOnce()
    mock.coinStatus = 'pending'
    view.rerender(<GameContainer />)
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác nhận')
    expect(screen.queryByRole('button', { name: 'Kiểm tra lượt trao' })).not.toBeInTheDocument()
    mock.coinStatus = 'confirmed'
    view.rerender(<GameContainer />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mock.mounts).toBe(1)
  })

  it('creates once with selected groups and has no delayed settings timer', () => {
    mock.room = false
    vi.useFakeTimers()
    try {
      render(<GameContainer />)
      fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng kiểm thử' }))
      expect(mock.join).toHaveBeenCalledWith(expect.any(String), 'Fixture guest', true,
        { situationGroups: ['medium'], emotionGroups: ['basic'] })
      act(() => vi.advanceTimersByTime(1000))
      expect(mock.join).toHaveBeenCalledOnce()
      expect(mock.settings).not.toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
})
