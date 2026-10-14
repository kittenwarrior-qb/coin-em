import type { Server, Socket } from 'socket.io'
import { roomRepository } from '../../modules/room'
import { applyChatCommand, chatView, type ChatRoom } from '../../communication/RoomChat'
import { emitRoomView } from '../emitRoomView'
import { rateLimitAction } from '../middleware/rateLimiter'
import { operationDiagnostic } from '../../telemetry/operationalDiagnostics'
import { CHAT_REPORT_REASONS, type ChatReportStore } from '../../communication/ChatReportStore'

const errors = new Set(['NOT_ROOM_MEMBER', 'ROOM_EXPIRED', 'GAME_ENDED', 'INVALID_CHAT_COMMAND',
  'CHAT_REQUEST_CONFLICT', 'CHAT_REVISION_CONFLICT', 'CHAT_REVISION_EXHAUSTED', 'NOT_HOST', 'CHAT_DISABLED',
  'CHAT_INVITATION_REQUIRED', 'INVALID_CHAT_INVITATION', 'SAFETY_MUTED', 'CHAT_RATE_LIMITED', 'INVALID_CHAT_TARGET'])
type Ack = (result: object) => void
const enabled = () => process.env.EMCOIN_ROOM_CHAT_ENABLED === 'true'
const reject = (callback: Ack | undefined, code: string) => { if (typeof callback === 'function') callback({ success: false, error: code }) }
type Reports = () => ChatReportStore | undefined
const safetyReady = (reports: Reports) => reports()?.isAvailable() === true
function runtimeView(room: ChatRoom, socketId: string, reports: Reports) {
  const view = chatView(room, socketId), safetyAvailable = safetyReady(reports)
  return { ...view, safetyAvailable, canSend: view.canSend && safetyAvailable }
}

/** Only register through the existing guarded socket: queue, seat/generation and primary checks. */
export function registerChatHandlers(io: Server, socket: Socket, reports: Reports = () => undefined): void {
  socket.on('get_chat_state', async (payload: unknown, callback?: Ack) => {
    if (!enabled()) { reject(callback, 'CHAT_DISABLED'); return }
    if (typeof callback !== 'function') { socket.emit('error', { code: 'CHAT_ACK_REQUIRED' }); return }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).join('|') !== 'roomId') {
      reject(callback, 'INVALID_CHAT_COMMAND'); return
    }
    if (!rateLimitAction(socket, 'get_chat_state', 100)) { reject(callback, 'CHAT_RATE_LIMITED'); return }
    try {
      const room = await roomRepository.findByIdFresh((payload as { roomId: string }).roomId)
      if (!room) { reject(callback, 'NOT_ROOM_MEMBER'); return }
      callback?.({ success: true, data: runtimeView(room, socket.id, reports) })
    } catch (error) { reject(callback, error instanceof Error && errors.has(error.message) ? error.message : 'CHAT_UNAVAILABLE') }
  })

  socket.on('chat_command', async (payload: unknown, callback?: Ack) => {
    if (!enabled()) { reject(callback, 'CHAT_DISABLED'); return }
    if (typeof callback !== 'function') { socket.emit('error', { code: 'CHAT_ACK_REQUIRED' }); return }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { reject(callback, 'INVALID_CHAT_COMMAND'); return }
    const { roomId, ...command } = payload as Record<string, unknown>
    try {
      const room = await roomRepository.findByIdFresh(roomId as string)
      if (!room) { reject(callback, 'NOT_ROOM_MEMBER'); return }
      const next = applyChatCommand(room, socket.id, command)
      const replayed = next === room
      // Keep controls and committed retries available if safety storage is down.
      if (!replayed && ['enable', 'join', 'send'].includes(command.kind as string) && !safetyReady(reports)) {
        reject(callback, 'CHAT_SAFETY_UNAVAILABLE'); return
      }
      // Committed same-ID retries are not rejected by the new-action throttle.
      if (!replayed) {
        if (!rateLimitAction(socket, 'chat_mutation', 250)) { reject(callback, 'CHAT_RATE_LIMITED'); return }
        await roomRepository.saveAndWait(next)
      }
      // Primary commit is the success boundary; a failed adapter cannot undo it.
      callback?.({ success: true, replayed, data: runtimeView(next, socket.id, reports) })
      if (!replayed) {
        // Chat activity changes the room's CAS revision/expiry, but never its game rules.
        await emitRoomView(io, next, 'room_state')
        await emitChatChange(io, next, command.kind === 'send', reports)
      }
    } catch (error) { reject(callback, error instanceof Error && errors.has(error.message) ? error.message : 'CHAT_UNAVAILABLE') }
  })

  socket.on('report_chat_message', async (payload: unknown, callback?: Ack) => {
    if (!enabled()) { reject(callback, 'CHAT_DISABLED'); return }
    if (typeof callback !== 'function') { socket.emit('error', { code: 'CHAT_ACK_REQUIRED' }); return }
    const store = reports()
    if (!store) { reject(callback, 'REPORT_UNAVAILABLE'); return }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).sort().join('|') !== 'messageId|reason|requestId|roomId') { reject(callback, 'INVALID_CHAT_REPORT'); return }
    const command = payload as { roomId: string; messageId: unknown; requestId: string; reason: unknown }
    if (typeof command.messageId !== 'string' || !(CHAT_REPORT_REASONS as readonly unknown[]).includes(command.reason)) {
      reject(callback, 'INVALID_CHAT_REPORT'); return
    }
    try {
      const room = await roomRepository.findByIdFresh(command.roomId) as ChatRoom | null
      if (!room) { reject(callback, 'NOT_ROOM_MEMBER'); return }
      const view = chatView(room, socket.id)
      if (!view.admitted) { reject(callback, 'CHAT_INVITATION_REQUIRED'); return }
      const reporter = room.players.find(player => player.socketId === socket.id)!
      const message = room.chat?.messages.find(item => item.id === command.messageId)
      if (!message || message.senderId === reporter.userId) { reject(callback, 'INVALID_REPORT_TARGET'); return }
      callback(store.submit({ requestId: command.requestId, roomId: room.id, reporterId: reporter.userId,
        reason: command.reason as typeof CHAT_REPORT_REASONS[number], message }))
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      reject(callback, errors.has(code) || ['INVALID_CHAT_REPORT', 'REPORT_EXPIRED', 'REPORT_REQUEST_CONFLICT', 'REPORT_CAPACITY_REACHED', 'REPORT_RATE_LIMITED'].includes(code) ? code : 'REPORT_UNAVAILABLE')
    }
  })
}

/** Sends one new message, not the whole history on every send; blocks filter recipients. */
export async function emitChatChange(io: Server, room: ChatRoom, messageOnly: boolean, reports: Reports = () => undefined): Promise<void> {
  try {
    const sockets = await io.in(room.id).fetchSockets()
    for (const target of sockets) {
      const member = room.players.find(player => player.socketId === target.id && !player.isDisconnected && !player.isFake)
      if (!member) continue
      if (member.session && (target.data.seatSession?.roomId !== room.id || target.data.seatSession?.userId !== member.userId ||
          target.data.seatSession?.generation !== member.session.generation)) continue
      const view = runtimeView(room, target.id, reports)
      if (!messageOnly) { target.emit('chat_state', view); continue }
      const latest = room.chat?.messages.at(-1)
      const visible = latest && view.messages.find(message => message.id === latest.id)
      target.emit('chat_update', { version: view.version, roomId: room.id, revision: view.revision,
        ...(visible ? { message: visible } : {}) })
    }
  } catch { operationDiagnostic('room_delivery', 'failed') }
}
