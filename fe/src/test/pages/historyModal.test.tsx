import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { HistoryModal } from '@/features/game/components/HistoryModal'
import { CARD_DATA } from '@/constants/cardCatalog'
import GameBoard from '@/pages/GameBoard'
import type { RoomState } from '@/components/game/types'

afterEach(async () => { cleanup(); await waitFor(() => expect(window.history.state?.__emcoinPopup).toBeUndefined()) })
const card = CARD_DATA.situation[0]
const logs = [{ entry: { timestamp: 1, type: 'SELECT_CARD' }, item: { title: 'Thẻ đã chọn', detail: 'Nội dung đã được server cho phép hiển thị', card } }]
it('preserves exact original thumbnail, pending draft and prohibits dismissal/preview until settled', async () => {
  const close = vi.fn(), preview = vi.fn()
  const { rerender } = render(<HistoryModal currentRound={2} logs={logs} pending onClose={close} onPreview={preview} />)
  expect(screen.getByRole('img', { name: card.id })).toHaveAttribute('src', card.frontImage)
  expect(screen.getByText('Round 2')).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' }); window.history.back()
  await new Promise(resolve => setTimeout(resolve, 40))
  fireEvent.click(screen.getByTestId(`history-card-${card.id}`))
  fireEvent.click(screen.getByRole('button', { name: 'Đóng nhật ký' }))
  expect(close).not.toHaveBeenCalled(); expect(preview).not.toHaveBeenCalled()
  rerender(<HistoryModal currentRound={2} logs={logs} onClose={close} onPreview={preview} />)
  fireEvent.click(screen.getByTestId(`history-card-${card.id}`))
  expect(preview).toHaveBeenCalledWith(card)
})
it('Escape returns focus to the actual history opener and leaves underlying room route unchanged', async () => {
  function Fixture() {
    const [open, setOpen] = useState(false)
    return <><button onClick={() => setOpen(true)}>Mở nhật ký</button>{open && <HistoryModal currentRound={1} logs={[]} onClose={() => setOpen(false)} onPreview={vi.fn()} />}</>
  }
  const url = window.location.href
  render(<Fixture />)
  const opener = screen.getByRole('button', { name: 'Mở nhật ký' })
  opener.focus(); fireEvent.click(opener)
  expect(screen.getByText('Chưa có sự kiện nào trong round này.')).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() => expect(opener).toHaveFocus())
  expect(window.location.href).toBe(url)
})
it.each([
  ['red', undefined, 'coin đỏ'], ['yellow', undefined, 'coin vàng'], ['green', undefined, 'coin xanh'],
  ['red', 2, 'coin xanh'], ['unknown', undefined, 'coin'],
])('Board history displays committed %s, legacy gain %s as %s without a new gift', (coinType, receiverGainsGreen, label) => {
  const room: RoomState = { id: 'history-fixture', host: 'guest', status: 'playing', phase: 'night', currentRound: 1,
    players: [{ userId: 'guest', socketId: 'socket', name: 'Guest' }, { userId: 'receiver', socketId: 'target', name: 'Receiver' }],
    gameLog: [{ type: 'GIVE_COIN', actorId: 'guest', targetId: 'receiver', timestamp: 1, data: { coinType: String(coinType), amount: 2, ...(receiverGainsGreen !== undefined ? { receiverGainsGreen: Number(receiverGainsGreen) } : {}) } }],
    phaseView: { version: 'phase-view/v1', phase: 'night', position: 2, total: 16, next: 'healer-turn', previous: 'role-reveal', capabilities: { advance: false, rollback: false, heal: false, silence: false, selectSituation: false, selectEmotion: false, selectReflection: false, selectSelfcare: false, guessSilencer: false, isHealer: false, isSilencer: false } } }
  const gift = vi.fn().mockResolvedValue(false), noop = vi.fn()
  render(<GameBoard roomId={room.id} roomState={room} myUserId="guest" mySocketId="socket" isConnected
    onLeave={noop} nextTurn={noop} prevTurn={noop} nightAction={noop} emitSelectCard={noop} sendResponse={noop} ntgVote={noop} confirmRoleRewards={noop} shareReflection={noop}
    emitCardPreview={noop} emitSituationFanState={noop} situationPreviewCard={null} situationFanState={null} submitVote={noop} giveCoin={gift} />)
  fireEvent.click(screen.getByTestId('btn-history-log'))
  expect(screen.getByText(`Receiver nhận 2 ${label} từ lượt tặng này.`)).toBeInTheDocument()
  expect(gift).not.toHaveBeenCalled()
  expect(room.gameLog![0].data!.coinType).toBe(coinType)
})
