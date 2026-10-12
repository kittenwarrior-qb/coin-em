import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { afterEach, expect, it, vi } from 'vitest'
import { CoinCarousel } from '@/components/game/CoinCarousel'
import { CoinDisplay } from '@/components/game/CoinDisplay'
import { GiveCoinPicker } from '@/components/game/GiveCoinPicker'
import { CARD_IMAGES } from '@/constants/cardImages'
import type { Player } from '@/components/game/types'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'

afterEach(async () => { cleanup(); await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined()) })
const players: Player[] = [
  { id: 'me', name: 'Mình', role: '', isMe: true, coins: { red: 0, green: 5, yellow: 5 } },
  { id: 'sender', name: 'Người kể', role: 'Người Trao Gửi', isMe: false, isSender: true, coins: { red: 20, green: 0, yellow: 0 } },
  { id: 'friend', name: 'Bạn khác', role: '', isMe: false, coins: { red: 0, green: 5, yellow: 5 } },
]
const props = () => ({ players, myPlayer: players[0], finiteCycle: true, onClose: vi.fn(), onGiveCoin: vi.fn().mockResolvedValue(false) })

it.each(['emotion-orbit', 'kindness-workshop'] as const)('%s uses a full-width single denomination and explicit quantity for the sender', theme => {
  render(<ControlThemeProvider theme={theme}><GiveCoinPicker {...props()} myPlayer={players[1]} /></ControlThemeProvider>)
  const types = document.querySelector('.brand-coin-types') as HTMLElement
  expect(types.style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))')
  expect(types.querySelectorAll('button')).toHaveLength(1)
  expect(screen.getByText('Số lượng')).toBeInTheDocument()
  const red = screen.getByRole('button', { name: 'Đỏ · 20' })
  expect(red).toHaveAttribute('aria-pressed', 'true')
  expect(red).toHaveTextContent('Đỏ · 20 còn lại')
  expect(screen.getByRole('button', { name: 'Mình' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Người kể' })).not.toBeInTheDocument()
})

it.each(['emotion-orbit', 'kindness-workshop'] as const)('%s keeps the compact recipient summary, exact command and selection after error', async theme => {
  const base = { ...props(), onGiveCoin: vi.fn().mockRejectedValue(new Error('QA offline')) }
  render(<ControlThemeProvider theme={theme}><GiveCoinPicker {...base} /></ControlThemeProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Người kể' }))
  const summary = screen.getByRole('button', { name: /Tặng cho Người kể/ })
  expect(summary).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('button', { name: 'Người kể' })).not.toBeInTheDocument()
  fireEvent.click(summary)
  expect(summary).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('button', { name: 'Người kể' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(summary)
  fireEvent.click(screen.getByRole('button', { name: 'Tặng 1 coin xanh cho Người kể' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Chưa xác nhận được'))
  expect(base.onGiveCoin).toHaveBeenCalledWith('sender', 'green', 1)
  expect(summary).toHaveTextContent('Người kể')
  expect(screen.getByRole('button', { name: 'Tặng 1 coin xanh cho Người kể' })).toBeEnabled()
  expect(players[0].coins).toEqual({ red: 0, green: 5, yellow: 5 })
})

it('names existing Coin openers without changing count/art/order or callback pairs', () => {
  const preview = vi.fn(), coins = { green: 5, yellow: 2, red: 9 }
  render(<CoinDisplay coins={coins} onCoinClick={preview} />)
  const buttons = screen.getAllByRole('button')
  expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(['Xem Coin Xanh', 'Xem Coin Vàng', 'Xem Coin Đỏ'])
  expect(buttons.map(button => button.textContent)).toEqual(['5', '2', '9'])
  fireEvent.click(buttons[0])
  expect(preview).toHaveBeenCalledWith(CARD_IMAGES.coins.green1, CARD_IMAGES.coins.green2, 'green')
  expect(screen.getByRole('img', { name: 'green' })).toHaveAttribute('src', '/coins/xanh.png')
})

it('locks every gift control/backdrop/Back/Esc and duplicates until exact callback settles', async () => {
  let resolve!: (value: boolean) => void
  const base = { ...props(), onGiveCoin: vi.fn(() => new Promise<boolean>(ack => { resolve = ack })) }
  render(<GiveCoinPicker {...base} />)
  expect(screen.queryByRole('button', { name: 'Bạn khác' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Người kể' }))
  const confirm = screen.getByRole('button', { name: 'Tặng 1 coin xanh cho Người kể' })
  fireEvent.click(confirm); fireEvent.click(confirm)
  expect(base.onGiveCoin).toHaveBeenCalledOnce()
  expect(base.onGiveCoin).toHaveBeenCalledWith('sender', 'green', 1)
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  fireEvent.click(screen.getByTestId('give-coin-dialog').parentElement!)
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  expect(base.onClose).not.toHaveBeenCalled()
  await act(async () => { resolve(false) })
  expect(screen.queryByText('Tặng coin thành công!')).not.toBeInTheDocument()
  expect(confirm).toBeEnabled()
  expect(players[0].coins).toEqual({ red: 0, green: 5, yellow: 5 })
})

it('success is a topmost popup: Escape returns to picker rather than submitting or closing it', async () => {
  const base = { ...props(), onGiveCoin: vi.fn().mockResolvedValue(true) }
  render(<GiveCoinPicker {...base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Người kể' }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tặng 1 coin xanh cho Người kể' })) })
  expect(screen.getByRole('dialog', { name: 'Trao Coin thành công' })).toHaveAttribute('aria-modal', 'true')
  expect(screen.queryByRole('button', { name: 'Người kể' })).not.toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Trao Coin thành công' })).not.toBeInTheDocument())
  expect(screen.getByRole('dialog', { name: 'Trao Coin' })).toBeInTheDocument()
  expect(base.onClose).not.toHaveBeenCalled(); expect(base.onGiveCoin).toHaveBeenCalledOnce()
})

it('keeps the gift draft and truthful error on unexpected rejection without retry/success', async () => {
  const base = { ...props(), onGiveCoin: vi.fn().mockRejectedValue(new Error('fixture')) }
  render(<GiveCoinPicker {...base} />)
  fireEvent.click(screen.getByRole('button', { name: 'Người kể' }))
  fireEvent.click(screen.getByRole('button', { name: 'Tăng số Coin' }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tặng 2 coin xanh cho Người kể' })) })
  expect(screen.getByRole('alert')).toHaveTextContent('Chưa xác nhận được')
  expect(screen.getByRole('button', { name: 'Tặng 2 coin xanh cho Người kể' })).toBeEnabled()
  expect(screen.queryByText('Tặng coin thành công!')).not.toBeInTheDocument()
  expect(base.onGiveCoin).toHaveBeenCalledOnce(); expect(base.onClose).not.toHaveBeenCalled()
})

it('exiting picker blocks controls and a late receipt cannot decorate the old instance', async () => {
  let resolve!: (value: boolean) => void
  const base = { ...props(), onGiveCoin: vi.fn(() => new Promise<boolean>(ack => { resolve = ack })) }
  const { rerender } = render(<AnimatePresence><GiveCoinPicker key="picker" {...base} /></AnimatePresence>)
  fireEvent.click(screen.getByRole('button', { name: 'Người kể' }))
  fireEvent.click(screen.getByRole('button', { name: 'Tặng 1 coin xanh cho Người kể' }))
  rerender(<AnimatePresence>{null}</AnimatePresence>)
  for (const button of screen.queryAllByRole('button', { hidden: true })) expect(button).toBeDisabled()
  await act(async () => { resolve(true) })
  expect(screen.queryByText('Tặng coin thành công!')).not.toBeInTheDocument()
  await waitFor(() => expect(screen.queryByTestId('give-coin-dialog')).not.toBeInTheDocument())
})

it('Coin viewer retains exact original faces/counts/order and locks pending navigation/close', async () => {
  const close = vi.fn(), coins = { red: 4, green: 6, yellow: 3 }
  const { rerender } = render(<CoinCarousel coins={coins} pending onClose={close} />)
  expect(screen.getByRole('img', { name: 'coin vàng - front' })).toHaveAttribute('src', CARD_IMAGES.coins.yellow1)
  expect(screen.getByRole('img', { name: 'coin vàng - back' })).toHaveAttribute('src', CARD_IMAGES.coins.yellow2)
  expect(screen.getByText('3 coin vàng')).toBeInTheDocument()
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(done => setTimeout(done, 40))
  fireEvent.click(screen.getByRole('dialog'))
  expect(close).not.toHaveBeenCalled()
  rerender(<CoinCarousel coins={coins} onClose={close} />)
  fireEvent.click(screen.getByRole('button', { name: 'Coin tiếp' }))
  expect(screen.getByText('4 coin đỏ')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'coin đỏ - front' })).toHaveAttribute('src', CARD_IMAGES.coins.red1)
  fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce()
})
