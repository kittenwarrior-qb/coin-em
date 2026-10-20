import { useEffect, useId, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { MessageCircle, Send, ShieldCheck, Flag, RefreshCw } from 'lucide-react'
import { CartoonButton, CartoonModal } from '@/components/cartoon'
import { usePendingNavigationGuard } from '@/features/overlays/usePopupLifecycle'
import { subscribeNativeForeground } from '@/features/platform/nativeEvents'
import { chatRequest, invitationCode, parseChatMessage, parseChatView, uuid, type ChatIntent, type ChatView } from './chatClient'
import './roomChat.css'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { KawaiiChat } from './KawaiiChat'

type Operation = { event: 'chat_command' | 'report_chat_message'; payload: Record<string, unknown> }
const errorCopy = (error: unknown) => {
  const code = error instanceof Error ? error.message : ''
  if (code === 'CHAT_RATE_LIMITED' || code === 'REPORT_RATE_LIMITED') return 'Bạn thao tác hơi nhanh. Chờ một chút rồi thử lại.'
  if (code === 'INVALID_CHAT_INVITATION') return 'Mã mời chưa đúng hoặc quản trò đã đổi mã.'
  if (code === 'CHAT_REVISION_CONFLICT') return 'Chat vừa thay đổi. Đã tải lại; hãy kiểm tra rồi thao tác lại.'
  if (code === 'SAFETY_MUTED') return 'Quản trò đang tắt quyền gửi tin của bạn.'
  if (code === 'CHAT_CONTACT_NOT_ALLOWED') return 'Tin chưa được gửi. Hãy bỏ email hoặc số điện thoại rồi gửi lại.'
  if (code === 'CHAT_LINK_NOT_ALLOWED') return 'Tin chưa được gửi. Chat phòng không nhận đường dẫn; hãy bỏ link rồi gửi lại.'
  if (code === 'CHAT_PROFANITY_NOT_ALLOWED') return 'Tin chưa được gửi. Có từ ngữ không phù hợp; hãy sửa nội dung để tiếp tục chia sẻ.'
  if (code === 'CHAT_TEXT_FORMAT_NOT_ALLOWED') return 'Tin chưa được gửi do ký tự đổi hướng chữ. Hãy nhập lại nội dung bằng chữ thông thường.'
  if (code === 'CHAT_SAFETY_UNAVAILABLE' || code === 'REPORT_UNAVAILABLE') return 'Kho báo cáo chưa sẵn sàng. Chưa thể gửi tin mới.'
  return 'Yêu cầu bị từ chối. Kiểm tra trạng thái phòng trước khi thử lại.'
}
export function RoomChatPanel({ socket, roomId, userId, connected, players, onBusy }: {
  socket: Socket; roomId: string; userId: string; connected: boolean
  players: { userId?: string; name: string; isFake?: boolean }[]; onBusy: (busy: boolean) => void
}) {
  const textId = useId()
  const theme=useControlTheme()
  const [view, setView] = useState<ChatView | null>(null), [open, setOpen] = useState(false)
  const [text, setText] = useState(''), [invite, setInvite] = useState(''), [hostInvite, setHostInvite] = useState('')
  const [error, setError] = useState(''), [pending, setPending] = useState(false), [retry, setRetry] = useState<Operation | null>(null)
  const [reportId, setReportId] = useState(''), [reason, setReason] = useState('harassment')
  const alive = useRef(false), currentView = useRef<ChatView | null>(null), active = useRef(false), hydration = useRef(0)
  const connection = useRef(0)
  usePendingNavigationGuard(pending)
  useEffect(() => { onBusy(pending || !!retry); return () => onBusy(false) }, [pending, retry, onBusy])
  useEffect(() => {
    alive.current = true
    const requests = hydration, epochRef = connection
    const accept = (value: ChatView) => {
      if (currentView.current && value.revision < currentView.current.revision) return
      currentView.current = value; setView(value)
      if (!value.enabled || !value.admitted) { setText(''); setReportId('') }
    }
    let scheduled: ReturnType<typeof setTimeout> | undefined
    async function hydrate() {
      if (!socket.connected) return
      const ticket = ++hydration.current, epoch = connection.current
      try {
        const response = await chatRequest(socket, 'get_chat_state', { roomId })
        if (alive.current && ticket === hydration.current && epoch === connection.current && socket.connected) accept(parseChatView(response.data, roomId))
      } catch (failure) {
        if (!alive.current || ticket !== hydration.current || epoch !== connection.current) return
        // Read-only hydration may be coalesced/retried; mutations are never auto-replayed.
        if (failure instanceof Error && failure.message === 'CHAT_RATE_LIMITED') { schedule(); return }
        if (failure instanceof Error && ['CHAT_DISABLED', 'NOT_ROOM_MEMBER', 'STALE_SESSION', 'GAME_ENDED', 'ROOM_EXPIRED'].includes(failure.message)) {
          currentView.current = null; setView(null); setOpen(false); setText(''); setInvite(''); setHostInvite(''); setRetry(null)
        }
      }
    }
    const schedule = () => { clearTimeout(scheduled); scheduled = setTimeout(() => void hydrate(), 150) }
    const state = (value: unknown) => { if (!socket.connected) return; try { accept(parseChatView(value, roomId)) } catch { schedule() } }
    const update = (value: unknown) => {
      if (!socket.connected || !value || typeof value !== 'object') return
      const v = value as Record<string, unknown>, old = currentView.current
      if (v.roomId !== roomId) return
      if (!old || v.version !== 'room-chat/v1' || !Number.isSafeInteger(v.revision)) { schedule(); return }
      if ((v.revision as number) <= old.revision) return
      if (v.revision !== old.revision + 1) { schedule(); return }
      try {
        const message = v.message === undefined ? null : parseChatMessage(v.message)
        if (message && (!old.admitted || old.blocked.includes(message.senderId))) { schedule(); return }
        accept({ ...old, revision: v.revision as number, messages: message ? [...old.messages.filter(m => m.id !== message.id), message].slice(-100) : old.messages })
      } catch { schedule() }
    }
    const disconnect = () => { connection.current++; hydration.current++; currentView.current = null; setView(null); setHostInvite('') }
    const visible = () => { if (document.visibilityState === 'visible') schedule() }
    socket.on('chat_state', state); socket.on('chat_update', update); socket.on('connect', schedule); socket.on('disconnect', disconnect)
    document.addEventListener('visibilitychange', visible)
    const unsubscribe = subscribeNativeForeground(schedule)
    // Coalesce StrictMode mount/cleanup and reconnect signals before the bounded read.
    schedule()
    return () => {
      alive.current = false; requests.current++; epochRef.current++; clearTimeout(scheduled); unsubscribe()
      socket.off('chat_state', state); socket.off('chat_update', update); socket.off('connect', schedule); socket.off('disconnect', disconnect)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [socket, roomId, userId])
  async function execute(operation: Operation) {
    if (active.current || !socket.connected) return
    active.current = true; setPending(true); setError('')
    const epoch = connection.current
    try {
      const response = await chatRequest(socket, operation.event, operation.payload)
      if (!alive.current) return
      if (epoch !== connection.current || !socket.connected) throw Error('CHAT_UNCERTAIN')
      if (operation.event === 'chat_command') {
        if (typeof response.replayed !== 'boolean') throw Error('CHAT_UNCERTAIN')
        const next = parseChatView(response.data, roomId)
        if (!currentView.current || next.revision >= currentView.current.revision) { currentView.current = next; setView(next) }
        if (operation.payload.kind === 'enable') setHostInvite(operation.payload.invitation as string)
        if (operation.payload.kind === 'disable') setHostInvite('')
        if (operation.payload.kind === 'send') setText('')
        if (operation.payload.kind === 'join') setInvite('')
      } else {
        if (!uuid(response.id) || typeof response.replayed !== 'boolean') throw Error('CHAT_UNCERTAIN')
        setReportId(''); setError('Đã gửi báo cáo. Quản trị viên chỉ nhận tin nhắn bạn vừa chọn.')
      }
      setRetry(null)
    } catch (failure) {
      if (!alive.current) return
      const code = failure instanceof Error ? failure.message : ''
      if (['NOT_ROOM_MEMBER', 'STALE_SESSION', 'GAME_ENDED', 'ROOM_EXPIRED', 'CHAT_DISABLED'].includes(code)) {
        currentView.current = null; setView(null); setOpen(false); setText(''); setInvite(''); setHostInvite(''); setRetry(null); return
      }
      // Transport failures and malformed success cannot prove that a write was rolled back.
      const definitive = code === 'CHAT_PROFANITY_NOT_ALLOWED' || /^(CHAT_RATE_LIMITED|REPORT_RATE_LIMITED|INVALID_CHAT_[A-Z_]+|INVALID_REPORT_[A-Z_]+|CHAT_REVISION_CONFLICT|CHAT_REQUEST_CONFLICT|SAFETY_MUTED|NOT_HOST|NOT_ROOM_MEMBER|ROOM_EXPIRED|GAME_ENDED|CHAT_DISABLED|CHAT_INVITATION_REQUIRED|CHAT_SAFETY_UNAVAILABLE|CHAT_LINK_NOT_ALLOWED|CHAT_CONTACT_NOT_ALLOWED|CHAT_TEXT_FORMAT_NOT_ALLOWED|REPORT_EXPIRED|REPORT_REQUEST_CONFLICT|REPORT_CAPACITY_REACHED)$/.test(code)
      if (!definitive) { setRetry(operation); setError('Chưa xác nhận được kết quả. Kiểm tra lại đúng yêu cầu này trước khi gửi thao tác mới.') }
      else {
        setRetry(null); setError(errorCopy(failure))
        try {
          const response = await chatRequest(socket, 'get_chat_state', { roomId })
          if (alive.current && socket.connected && epoch === connection.current) {
            const next = parseChatView(response.data, roomId); currentView.current = next; setView(next)
          }
        } catch { /* Do not infer success from a failed refresh. */ }
      }
    } finally { active.current = false; if (alive.current) setPending(false) }
  }
  const command = (intent: ChatIntent) => {
    if (!view || retry || pending) return
    void execute({ event: 'chat_command', payload: { roomId, ...intent, requestId: crypto.randomUUID(), expectedRevision: view.revision } })
  }
  const blocked = pending || !!retry || !connected || !view
  if (!view && !open && !retry) return null
  return <>
    <button type="button" className="room-chat-launch" aria-label="Mở chat phòng" disabled={pending} onClick={() => setOpen(true)}><MessageCircle aria-hidden="true" /><span>Chat</span></button>
    {theme==='candy-clouds'?<KawaiiChat open={open} close={()=>{if(!pending&&!retry)setOpen(false)}} view={view} userId={userId} players={players} blocked={blocked} pending={pending} connected={connected} retry={!!retry} onRetry={()=>{if(retry)void execute(retry)}} error={error} text={text} setText={setText} invite={invite} setInvite={setInvite} hostInvite={hostInvite} command={command} reportId={reportId} setReportId={setReportId} reason={reason} setReason={setReason} report={()=>void execute({event:'report_chat_message',payload:{roomId,messageId:reportId,reason,requestId:crypto.randomUUID()}})}/>:<CartoonModal open={open} title="Chat phòng" persistent={pending || !!retry} hideClose={pending || !!retry} onClose={() => { if (!pending && !retry) setOpen(false) }} className="room-chat-modal">
      <div className="room-chat-content">
        <p className="room-chat-note"><ShieldCheck aria-hidden="true" />Chỉ người được mời. Không gửi link, email, số điện thoại hay thông tin riêng tư. Bạn có thể chặn hoặc báo cáo tin nhắn.</p>
        {!connected && <p role="status">Mất kết nối. Chat sẽ tải lại khi mạng ổn định.</p>}
        {error && <p role="status" className="room-chat-notice">{error}</p>}
        {retry && <CartoonButton color="blue" disabled={pending || !connected} onClick={() => void execute(retry)}><RefreshCw aria-hidden="true" />Kiểm tra lại yêu cầu</CartoonButton>}
        {view?.isHost && <details><summary>Quản lý chat</summary><p>Tạo mã mới sẽ yêu cầu mọi người nhập lại mã mời. Hạn chế an toàn vẫn được giữ.</p>
          <CartoonButton color="blue" disabled={blocked || !view.safetyAvailable} onClick={() => command({ kind: 'enable', invitation: invitationCode() })}>{view.enabled ? 'Đổi mã mời' : 'Mở chat & tạo mã mời'}</CartoonButton>
          {hostInvite && <label>Mã mời (gửi riêng cho người chơi)<input readOnly value={hostInvite} onFocus={e => e.target.select()} /></label>}
          {view.enabled && <CartoonButton color="pink" disabled={blocked} onClick={() => command({ kind: 'disable' })}>Tắt chat phòng</CartoonButton>}</details>}
        {view?.enabled && !view.admitted && <form onSubmit={event => { event.preventDefault(); command({ kind: 'join', invitation: invite.trim() }) }}>
          <label>Mã mời từ quản trò<input autoComplete="off" maxLength={43} value={invite} disabled={blocked} onChange={e => setInvite(e.target.value)} /></label>
          <CartoonButton type="submit" color="blue" disabled={blocked || !/^[A-Za-z0-9_-]{43}$/.test(invite.trim())}>Tham gia chat</CartoonButton></form>}
        {view && !view.enabled && <p>Quản trò chưa mở chat phòng.</p>}
        {view?.admitted && <>
          <ol className="room-chat-messages" aria-label="Tin nhắn gần đây">{view.messages.map(m => <li key={m.id} className={m.senderId === userId ? 'is-self' : ''}>
            <div><strong>{m.senderName}</strong><time dateTime={new Date(m.sentAt).toISOString()}>{new Date(m.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time></div>
            <p>{m.text}</p>{m.senderId !== userId && <button disabled={blocked || !view.safetyAvailable} onClick={() => { setReportId(m.id); setReason('harassment') }}><Flag aria-hidden="true" />Báo cáo</button>}</li>)}</ol>
          {!view.messages.length && <p>Chưa có tin nhắn.</p>}
          {!view.canSend && <p role="status">{view.safetyAvailable ? 'Bạn đang bị quản trò tắt quyền gửi tin.' : 'Kho báo cáo chưa sẵn sàng. Tạm dừng gửi tin mới.'}</p>}
          {reportId ? <form onSubmit={event => { event.preventDefault(); void execute({ event: 'report_chat_message', payload: { roomId, messageId: reportId, reason, requestId: crypto.randomUUID() } }) }}>
            <label>Lý do báo cáo<select disabled={blocked} value={reason} onChange={e => setReason(e.target.value)}><option value="harassment">Quấy rối</option><option value="unsafe">Không an toàn</option><option value="privacy">Thông tin riêng tư</option><option value="other">Khác</option></select></label>
            <p>Tin nhắn này sẽ được lưu cho quản trị viên, tối đa 7 ngày kể từ lúc gửi.</p>
            <CartoonButton type="submit" color="pink" disabled={blocked || !view.safetyAvailable}>Gửi báo cáo</CartoonButton><button disabled={pending || !!retry} onClick={() => setReportId('')} type="button">Hủy</button>
          </form> : <form onSubmit={event => { event.preventDefault(); if (text.trim()) command({ kind: 'send', text: text.trim() }) }}>
            <label htmlFor={textId}>Tin nhắn</label><textarea id={textId} value={text} maxLength={500} rows={2} disabled={blocked || !view.canSend} onChange={event => setText(event.target.value)} />
            <div className="room-chat-compose"><small>{text.length}/500</small><CartoonButton type="submit" color="blue" disabled={blocked || !view.canSend || !text.trim()}><Send aria-hidden="true" />Gửi</CartoonButton></div>
          </form>}
          <details><summary>Người chơi & an toàn</summary>{players.filter(p => p.userId && p.userId !== userId && !p.isFake).map(p => <div className="room-chat-member" key={p.userId}><strong>{p.name}</strong>
            <button disabled={blocked} onClick={() => command({ kind: 'block', targetId: p.userId!, value: !view.blocked.includes(p.userId!) })}>{view.blocked.includes(p.userId!) ? 'Bỏ chặn' : 'Chặn với tôi'}</button>
            {view.isHost && <button disabled={blocked} onClick={() => command({ kind: 'mute', targetId: p.userId!, value: !view.safetyMuted?.includes(p.userId!) })}>{view.safetyMuted?.includes(p.userId!) ? 'Cho gửi tin' : 'Tắt gửi tin'}</button>}</div>)}</details>
        </>}
      </div>
    </CartoonModal>}
  </>
}
