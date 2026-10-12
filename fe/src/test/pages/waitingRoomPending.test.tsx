import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import WaitingRoom from '@/pages/WaitingRoom'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'

beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const players = Array.from({ length: 5 }, (_, i) => ({ userId: `guest-${i}`, socketId: `socket-${i}`, name: `Fixture ${i}` }))
const base = { roomId: 'waiting-fixture', players, hostSocketId: 'guest-0', mySocketId: 'socket-0', myUserId: 'guest-0', onStartGame: vi.fn(), onLeave: vi.fn() }

it.each(['emotion-orbit', 'kindness-workshop'] as const)('%s gives the roster viewport height and a keyboard-accessible own profile', theme => {
  render(<ControlThemeProvider theme={theme}><WaitingRoom {...base} /></ControlThemeProvider>)
  expect(screen.getByTestId('player-list').parentElement?.style.height).toContain('100dvh')
  const ownRow = screen.getByRole('button', { name: 'Chỉnh hồ sơ của Fixture 0' })
  expect(ownRow).toHaveAttribute('tabindex', '0')
  expect(ownRow).toHaveTextContent('Bạn · Chủ phòng')
  fireEvent.keyDown(ownRow, { key: 'Enter' })
  expect(screen.getByPlaceholderText('Nhập tên')).toHaveValue('Fixture 0')
})

it.each(['pending', 'offline'])('existing start button blocks activation while %s', mode => {
  const start = vi.fn()
  const { rerender } = render(<WaitingRoom {...base} onStartGame={start} startPending={mode === 'pending'} isConnected={mode !== 'offline'} />)
  const button = screen.getByTestId('btn-start-game')
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(start).not.toHaveBeenCalled()
  rerender(<WaitingRoom {...base} onStartGame={start} startPending={false} isConnected />)
  fireEvent.click(screen.getByTestId('btn-start-game'))
  expect(start).toHaveBeenCalledOnce()
})

it('rejects unsupported player count instead of enabling start above 10', () => {
  render(<WaitingRoom {...base} players={Array.from({ length: 11 }, (_, i) => ({ ...players[0], userId: `guest-${i}`, socketId: `socket-${i}` }))} />)
  expect(screen.getByTestId('btn-start-game')).toBeDisabled()
})
