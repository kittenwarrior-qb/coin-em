import { Server } from 'socket.io'
import { operationDiagnostic } from '../telemetry/operationalDiagnostics'
import { roomRepository } from '../modules/room'
import { inRoomQueue } from './roomQueue'

export const SEAT_PRESENCE_INTERVAL_MS = 60_000

/** Persist a bounded last-seen lease without marking another backend's sockets offline. */
export function startSeatPresence(io: Server): () => Promise<void> {
  let stopped = false
  const running = new Map<string, Promise<void>>()
  const timer = setInterval(() => {
    for (const candidate of roomRepository.findAll()) {
      if (stopped || running.has(candidate.id) ||
        !candidate.players.some(p => p.session && io.sockets.sockets.has(p.socketId))) continue
      const job = inRoomQueue(candidate.id, async () => {
        const room = await roomRepository.findByIdFresh(candidate.id)
        if (stopped || !room) return
        let changed = false
        const players = room.players.map(player => {
          const socket = io.sockets.sockets.get(player.socketId)
          const bound = socket?.data.seatSession
          if (!player.session || player.isDisconnected || !socket?.connected ||
            bound?.roomId !== room.id || bound?.userId !== player.userId ||
            bound?.generation !== player.session.generation) return player
          changed = true
          return { ...player, lastSeenAt: Date.now() }
        })
        if (changed) await roomRepository.saveAndWait({ ...room, players })
      }).catch(() => { operationDiagnostic('presence', 'failed') })
        .finally(() => running.delete(candidate.id))
      running.set(candidate.id, job)
    }
  }, SEAT_PRESENCE_INTERVAL_MS)
  timer.unref()
  return async () => {
    stopped = true
    clearInterval(timer)
    await Promise.allSettled([...running.values()])
  }
}
