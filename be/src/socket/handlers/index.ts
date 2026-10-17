import { Server } from 'socket.io'
import { operationDiagnostic } from '../../telemetry/operationalDiagnostics'
import { registerRoomHandlers } from './roomHandlers'
import { registerGameHandlers } from './gameHandlers'
import { registerPlayerHandlers, startDisconnectedRoomCleanup, stopDisconnectedRoomCleanup } from './playerHandlers'
import { clearSocketRateLimits } from '../middleware/rateLimiter'
import { inRoomQueue } from '../roomQueue'
import { roomRepository } from '../../modules/room'
import { startAutoAdvanceScheduler } from '../AutoAdvanceScheduler'
import { redisAvailable } from '../../redis'
import { startSeatPresence } from '../SeatPresence'
import { registerChatHandlers } from './chatHandlers'
import type { ChatReportStore } from '../../communication/ChatReportStore'

export function registerSocketHandlers(io: Server, options: { chatReports?: () => ChatReportStore | undefined } = {}) {
  startDisconnectedRoomCleanup(io)
  const stopAutoAdvance = startAutoAdvanceScheduler(io)
  const stopPresence = startSeatPresence(io)

  io.on('connection', (socket) => {
    operationDiagnostic('connect', 'ok')

    // Attach userId to socket (from auth or use socket.id as fallback)
    ;(socket as any).userId = (socket.handshake.auth as any)?.userId || socket.id

    // Wrap the actual registration, so async room handlers hold the queue through their commit.
    const guardedSocket = new Proxy(socket, {
      get(target, property) {
        if (property === 'on') return (event: string, handler: (...args: any[]) => unknown) => {
          target.on(event, (...args: any[]) => {
            const payload = args[0]
            const callback = typeof args[1] === 'function' ? args[1] : undefined
            const reject = (code: string) => {
              const error = { success: false, error: code, code, message: code }
              if (callback) callback(error)
              else target.emit('error', error)
            }
            const lifecycle = event === 'disconnect'
            if (!lifecycle && event !== 'list_rooms') {
              if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
                typeof payload.roomId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(payload.roomId)) {
                reject('INVALID_PARAMS')
                return
              }
              if (payload.name !== undefined && (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 80)) {
                reject('INVALID_NAME')
                return
              }
            }
            const roomId = lifecycle ? roomRepository.findBySocketId(target.id)?.id : payload?.roomId
            const execute = async () => {
              const primaryRequired = process.env.NODE_ENV === 'production' || process.env.ROOM_STORAGE_MODE === 'redis-required'
              if (!lifecycle && event !== 'list_rooms' && primaryRequired && !redisAvailable) {
                reject('PRIMARY_STORAGE_UNAVAILABLE')
                return
              }
              // Resume establishes membership first; mutation/read events cannot claim a seat
              // using userId/deviceId supplied in their payload.
              const admission = ['join_room', 'reconnect_room', 'list_rooms'].includes(event)
              if (!lifecycle && !admission && roomId) {
                const room = await roomRepository.findByIdFresh(roomId)
                const member = room?.players.find(p => p.socketId === target.id && !p.isDisconnected)
                if (!room || !member) { reject('NOT_ROOM_MEMBER'); return }
                if (member.session && (target.data.seatSession?.roomId !== roomId ||
                  target.data.seatSession?.userId !== member.userId ||
                  target.data.seatSession?.generation !== member.session.generation)) {
                  reject('STALE_SESSION'); return
                }
                const readOnly = event === 'get_room_state' || event === 'leave_room'
                if (room.status === 'ended' && !readOnly) { reject('GAME_ENDED'); return }
                if (event === 'card_preview' || event === 'situation_fan_state') {
                  if (room.phase !== 'situation-card' || member.userId !== room.currentNTG) {
                    reject('NOT_CARD_ACTOR'); return
                  }
                  if (JSON.stringify(payload).length > 65536 ||
                    (payload.cards !== undefined && (!Array.isArray(payload.cards) || payload.cards.length > 10)) ||
                    (event === 'situation_fan_state' && (!Number.isSafeInteger(payload.activePosition) || payload.activePosition < 0 || payload.activePosition > 9))) {
                    reject('INVALID_PARAMS'); return
                  }
                }
              }
              return handler(...args)
            }
            const result = roomId ? inRoomQueue(roomId, execute) : Promise.resolve().then(execute)
            void result.catch(() => reject('INTERNAL_ERROR'))
          })
          return target
        }
        const value = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    registerRoomHandlers(io, guardedSocket)
    registerGameHandlers(io, guardedSocket)
    registerPlayerHandlers(io, guardedSocket)
    registerChatHandlers(io, guardedSocket, options.chatReports)
    socket.on('disconnect', () => clearSocketRateLimits(socket.id))
  })

  return async () => {
    await stopDisconnectedRoomCleanup(io)
    await stopAutoAdvance()
    await stopPresence()
  }
}
