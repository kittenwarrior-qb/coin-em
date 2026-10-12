import { Server } from 'socket.io'
import { operationDiagnostic } from '../telemetry/operationalDiagnostics'
import { roomRepository } from '../modules/room/repository/RoomRepository'
import { gameService } from '../modules/game/services/GameService'
import { inRoomQueue } from './roomQueue'
import { emitRoomView } from './emitRoomView'

/** Recover only the existing after-card/after-night delays; never enable a phase timeout. */
export function startAutoAdvanceScheduler(io: Server): () => Promise<void> {
  let stopped = false
  const running = new Map<string, Promise<void>>()
  const timer = setInterval(() => {
    for (const candidate of roomRepository.findAll()) {
      const pending = candidate.pendingAutoAdvance
      if (stopped || running.has(candidate.id) || !pending || pending.dueAt > Date.now()) continue
      const job = inRoomQueue(candidate.id, async () => {
        const room = await roomRepository.findByIdFresh(candidate.id)
        if (stopped || !room || room.status !== 'playing') return
        const deadline = room.pendingAutoAdvance
        if (!deadline || deadline.dueAt > Date.now() || deadline.phase !== room.phase ||
          deadline.phaseInstance !== room.phaseInstance || deadline.round !== room.currentRound ||
          deadline.narratorId !== room.currentNarrator) return
        if (!Number.isSafeInteger(deadline.dueAt) || !['card', 'night'].includes(deadline.kind)) return
        const result = await gameService.advanceTurn(room, deadline.narratorId)
        if (!result.success || !result.room) return
        await roomRepository.saveAndWait(result.room)
        await emitRoomView(io, result.room, result.room.status === 'ended' ? 'game_ended' : 'turn_changed')
      }).catch(() => { operationDiagnostic('auto_advance', 'failed') }).finally(() => running.delete(candidate.id))
      running.set(candidate.id, job)
    }
  }, 250)
  timer.unref()
  return async () => {
    stopped = true
    clearInterval(timer)
    await Promise.allSettled([...running.values()])
  }
}
