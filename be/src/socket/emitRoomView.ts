import { Server } from 'socket.io'
import { operationDiagnostic } from '../telemetry/operationalDiagnostics'
import { Room } from '../modules/game/types'
import { roomView } from '../modules/game/services/RoomView'

/** Redis-adapter fetchSockets includes remote socket.data and targets one active seat. */
export async function emitRoomView(io: Server, room: Room, event: string, body?: Record<string, unknown>, excludeSocketId?: string, flat = false) {
  try {
    const sockets = await io.in(room.id).fetchSockets()
    for (const socket of sockets) {
      if (socket.id === excludeSocketId) continue
      const player = room.players.find(p => p.socketId === socket.id && !p.isDisconnected)
      if (!player) continue
      if (player.session && (socket.data.seatSession?.roomId !== room.id ||
        socket.data.seatSession?.userId !== player.userId || socket.data.seatSession?.generation !== player.session.generation)) continue
      const view = roomView(room, player.userId)
      if (!body) { socket.emit(event, view); continue }
      const projected: Record<string, unknown> = flat ? { ...view, ...body }
        : { ...body, ...(body.players ? { players: view.players } : {}), room: view }
      if (event === 'night_action_completed' && !player.isNarrator && body.actorId !== player.userId) {
        delete projected.actorId
        delete projected.actorSocketId
        delete projected.targetId
        delete projected.targetSocketId
      }
      socket.emit(event, projected)
    }
  } catch {
    // A committed command remains committed even if adapter delivery fails.
    // Clients recover through authenticated hydration; never ACK it as rejected.
    operationDiagnostic('room_delivery', 'failed')
  }
}
