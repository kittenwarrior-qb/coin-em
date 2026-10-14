import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Socket } from 'socket.io-client'
import { RoomChatPanel } from '@/features/communication/RoomChatPanel'
import { ControlThemeProvider } from '@/components/cartoon/ControlThemeProvider'
import { StrictMode } from 'react'

const id = 'a1234567-1234-4123-8123-123456789abc'
const view = (changes = {}) => ({ version: 'room-chat/v1', roomId: 'fixture', revision: 1, enabled: true, admitted: true,
  isHost: false, canSend: true, safetyAvailable: true, blocked: [], messages: [{ id, senderId: 'other', senderName: 'Người thử nghiệm', text: '<img onerror=alert(1)>', sentAt: 1000 }], ...changes })
function setup(initial = view()) {
  const listeners = new Map<string, Set<(data?: unknown) => void>>()
  const emitWithAck = vi.fn().mockResolvedValue({ success: true, data: initial })
  const fake = { connected: true, timeout: () => ({ emitWithAck }),
    on: (event: string, fn: (data?: unknown) => void) => { const set = listeners.get(event) ?? new Set(); set.add(fn); listeners.set(event, set) },
    off: (event: string, fn: (data?: unknown) => void) => listeners.get(event)?.delete(fn) }
  const busy = vi.fn(), props = { socket: fake as unknown as Socket, roomId: 'fixture', userId: 'self', connected: true,
    players: [{ userId: 'self', name: 'Tôi' }, { userId: 'other', name: 'Người thử nghiệm' }], onBusy: busy }
  const emit = (event: string, value?: unknown) => { for (const fn of listeners.get(event) ?? []) fn(value) }
  return { ...fake, fake, props, emit, emitWithAck, busy, listeners }
}
afterEach(cleanup)
describe('room chat UI', () => {
  it('coalesces StrictMode hydration instead of hiding chat after a duplicate rate-limited read', async () => {
    const s = setup()
    render(<StrictMode><RoomChatPanel {...s.props} /></StrictMode>)
    await screen.findByRole('button', { name: 'Mở chat phòng' })
    expect(s.emitWithAck.mock.calls.filter(([event]) => event === 'get_chat_state')).toHaveLength(1)
  })
  it.each(['emotion-orbit', 'kindness-workshop'] as const)('uses %s and literal text with no persistent history', async theme => {
    const s = setup(); localStorage.clear(); sessionStorage.clear()
    render(<ControlThemeProvider theme={theme}><RoomChatPanel {...s.props} /></ControlThemeProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    expect(await screen.findByText('<img onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('.room-chat-messages img')).toBeNull()
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0)
  })
  it('keeps identical send payload on uncertain retry without automatic send', async () => {
    const s = setup(); render(<RoomChatPanel {...s.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    s.emitWithAck.mockRejectedValueOnce(Error('operation timed out'))
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Xin chào' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }))
    await screen.findByText(/Chưa xác nhận được kết quả/)
    const call = s.emitWithAck.mock.calls.find(([event]) => event === 'chat_command')!
    expect(call[1]).toMatchObject({ roomId: 'fixture', kind: 'send', text: 'Xin chào', expectedRevision: 1 })
    expect(s.emitWithAck.mock.calls.filter(([event]) => event === 'chat_command')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeInTheDocument()
    s.emitWithAck.mockResolvedValueOnce({ success: true, replayed: true, data: view({ revision: 2 }) })
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại yêu cầu' }))
    await waitFor(() => expect(screen.getByLabelText('Tin nhắn')).toHaveValue(''))
    expect(s.emitWithAck.mock.calls.filter(([event]) => event === 'chat_command')[1]).toEqual(call)
  })
  it('applies incremental messages, ignores stale revisions and hydrates gaps', async () => {
    const s = setup(); render(<RoomChatPanel {...s.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    const message = { id: 'b1234567-1234-4123-8123-123456789abc', senderId: 'other', senderName: 'Bạn', text: 'Tin mới', sentAt: 2000 }
    act(() => s.emit('chat_update', { version: 'room-chat/v1', roomId: 'fixture', revision: 2, message }))
    expect(screen.getByText('Tin mới')).toBeInTheDocument()
    act(() => s.emit('chat_state', view()))
    expect(screen.getByText('Tin mới')).toBeInTheDocument()
    act(() => s.emit('chat_update', { version: 'room-chat/v1', roomId: 'fixture', revision: 4 }))
    await waitFor(() => expect(s.emitWithAck.mock.calls.filter(([event]) => event === 'get_chat_state')).toHaveLength(2))
  })
  it('shows host invitation controls, sends secure token and hides them from members', async () => {
    const s = setup(view({ isHost: true, safetyMuted: [] })); render(<RoomChatPanel {...s.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    s.emitWithAck.mockResolvedValueOnce({ success: true, replayed: false, data: view({ isHost: true, safetyMuted: [], revision: 2 }) })
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mã mời' }))
    const input = await screen.findByLabelText('Mã mời (gửi riêng cho người chơi)')
    expect((input as HTMLInputElement).value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(s.emitWithAck.mock.calls.find(([event]) => event === 'chat_command')![1].invitation).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
  it('selects report evidence by ID only and supports block/mute separately', async () => {
    const s = setup(view({ isHost: true, safetyMuted: [] })); render(<RoomChatPanel {...s.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }))
    s.emitWithAck.mockResolvedValueOnce({ success: true, id, replayed: false })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }))
    await screen.findByText(/Đã gửi báo cáo/)
    const payload = s.emitWithAck.mock.calls.find(([event]) => event === 'report_chat_message')![1]
    expect(Object.keys(payload).sort()).toEqual(['messageId', 'reason', 'requestId', 'roomId'])
    s.emitWithAck.mockResolvedValueOnce({ success: true, replayed: false, data: view({ isHost: true, safetyMuted: [], blocked: ['other'], messages: [], revision: 2 }) })
    fireEvent.click(screen.getByRole('button', { name: 'Chặn với tôi' }))
    await screen.findByRole('button', { name: 'Bỏ chặn' })
    expect(screen.queryByText('<img onerror=alert(1)>')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tắt gửi tin' })).toBeInTheDocument()
  })
  it('hides feature-off and removes socket listeners on unmount', async () => {
    const s = setup(); s.emitWithAck.mockResolvedValue({ success: false, error: 'CHAT_DISABLED' })
    const ui = render(<RoomChatPanel {...s.props} />)
    await waitFor(() => expect(s.emitWithAck).toHaveBeenCalledOnce())
    expect(screen.queryByRole('button', { name: 'Mở chat phòng' })).not.toBeInTheDocument()
    ui.unmount(); expect([...s.listeners.values()].every(set => set.size === 0)).toBe(true)
  })
  it('does not trust an old ACK after disconnect and does not auto send on reconnect', async () => {
    const s = setup(); render(<RoomChatPanel {...s.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    let finish!: (value: unknown) => void
    s.emitWithAck.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Tin chưa xác nhận' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }))
    act(() => { s.fake.connected = false; s.emit('disconnect') })
    await act(async () => finish({ success: true, replayed: false, data: view({ revision: 2 }) }))
    await screen.findByText(/Chưa xác nhận được kết quả/)
    expect(screen.queryByText('<img onerror=alert(1)>')).not.toBeInTheDocument()
    s.emitWithAck.mockResolvedValue({ success: true, data: view({ revision: 2 }) })
    act(() => { s.fake.connected = true; s.emit('connect') })
    await screen.findByLabelText('Tin nhắn')
    expect(s.emitWithAck.mock.calls.filter(([event]) => event === 'chat_command')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Kiểm tra lại yêu cầu' })).toBeInTheDocument()
  })
  it('removes selected chat and controls when a read reports a replaced seat', async () => {
    const s = setup(); render(<RoomChatPanel {...s.props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mở chat phòng' }))
    s.emitWithAck.mockResolvedValue({ success: false, error: 'STALE_SESSION' })
    act(() => s.emit('connect'))
    await waitFor(() => expect(screen.queryByText('<img onerror=alert(1)>')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Mở chat phòng' })).not.toBeInTheDocument()
  })
})
