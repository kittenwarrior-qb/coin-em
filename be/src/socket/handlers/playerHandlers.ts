import { Server, Socket } from 'socket.io'
import { operationDiagnostic } from '../../telemetry/operationalDiagnostics'
import { roomRepository, roomService } from '../../modules/room'
import { publicPlayer } from '../SeatSession'
import { emitRoomView } from '../emitRoomView'
import { ROOM_CLEANUP_INTERVAL_MS } from '../../retention'
import { inRoomQueue } from '../roomQueue'

// Track pending disconnect timers: socketId → timer
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
const disconnectOwners = new Map<string, Server>()
const cleanupTimers = new Map<Server, ReturnType<typeof setInterval>>()
const cleanupJobs = new Map<Server, Promise<void>>()
const graceJobs = new Map<Server, Set<Promise<void>>>()

async function emitDisconnectedSummary(io: Server, roomId: string) {
  const room = roomRepository.findById(roomId)
  if (!room) return

  const players = room.players
    .filter(p => !p.isFake && p.isDisconnected)
    .map(p => ({ userId: p.userId, name: p.name, disconnectedAt: p.disconnectedAt }))

  await emitRoomView(io, room, 'players_disconnected', {
    players,
    room: roomService.getPublicState(room),
  })
}

export function startDisconnectedRoomCleanup(io: Server) {
  if (cleanupTimers.has(io)) return

  const timer = setInterval(() => {
    if (cleanupJobs.has(io)) return
    const job = roomService.cleanupDisconnectedRooms().then(deletedRoomIds => {
      for (const roomId of deletedRoomIds) {
        io.to(roomId).emit('room_closed', { roomId, reason: 'inactive_timeout' })
        io.in(roomId).socketsLeave(roomId)
      }
    }).catch(() => { operationDiagnostic('room_cleanup', 'failed') })
      .finally(() => cleanupJobs.delete(io))
    cleanupJobs.set(io, job)
  }, ROOM_CLEANUP_INTERVAL_MS)
  timer.unref()
  cleanupTimers.set(io, timer)
}

export async function stopDisconnectedRoomCleanup(io: Server): Promise<void> {
  const timer = cleanupTimers.get(io)
  if (timer) clearInterval(timer)
  cleanupTimers.delete(io)
  for (const [socketId, owner] of disconnectOwners) {
    if (owner === io) cancelDisconnectTimer(socketId)
  }
  await cleanupJobs.get(io)
  await Promise.allSettled([...(graceJobs.get(io) ?? [])])
  graceJobs.delete(io)
}

export function registerPlayerHandlers(io: Server, socket: Socket) {
  /**
   * Intentional leave — remove player immediately, no grace period
   */
  socket.on('leave_room', async ({ roomId }: { roomId: string }, callback) => {
    cancelDisconnectTimer(socket.id)

    const room = roomRepository.findById(roomId)
    if (!room) {
      operationDiagnostic('leave_room', 'rejected')
      if (callback) callback({ success: false, error: 'ROOM_NOT_FOUND' })
      return
    }

    operationDiagnostic('leave_room', 'ok')

    // If game is playing or has started, don't remove player - just mark disconnected
    if (room.status === 'playing' || room.status === 'ended') {
      const updatedRoom = { ...room, players: room.players.map(p => p.socketId === socket.id
        ? { ...p, isDisconnected: true, disconnectedAt: Date.now(), lastSeenAt: Date.now() } : p) }
      await roomRepository.saveAndWait(updatedRoom)
      delete socket.data.seatSession
      await socket.leave(roomId)
      operationDiagnostic('leave_room', 'ok')
      if (updatedRoom) await emitDisconnectedSummary(io, roomId)
      if (callback) callback({ success: true })
      return
    }

    // Only remove player if game is still in waiting phase
    const updatedRoom = await roomService.removePlayer(roomId, socket.id)
    delete socket.data.seatSession
    await socket.leave(roomId)
    operationDiagnostic('leave_room', 'ok')
    if (updatedRoom) {
      await emitRoomView(io, updatedRoom, 'player_left', {
        socketId: socket.id,
        players: updatedRoom.players.map(publicPlayer),
        host: updatedRoom.host,
      })
    } else {
      io.to(roomId).emit('room_closed', { roomId })
      operationDiagnostic('room_delete', 'ok')
      
      // Broadcast updated room list to all connected clients
      const availableRooms = roomService.getAvailableRooms()
      io.emit('rooms_list', availableRooms)
    }
    if (callback) callback({ success: true })
  })

  /**
   * Disconnect handler — grace period for accidental disconnects
   */
  socket.on('disconnect', async () => {
    const remembered = roomRepository.findBySocketId(socket.id)
    if (!remembered) return
    const room = await roomRepository.findByIdFresh(remembered.id)
    const member = room?.players.find(p => p.socketId === socket.id)
    if (!room || !member || member.isDisconnected) return
    if (member.session && socket.data.seatSession?.generation !== member.session.generation) return

    const roomId = room.id

    // If game is playing, don't remove player - just mark as disconnected
    if (room.status === 'playing' || room.status === 'ended') {
      const updatedRoom = { ...room, players: room.players.map(p => p.socketId === socket.id
        ? { ...p, isDisconnected: true, disconnectedAt: Date.now(), lastSeenAt: Date.now() } : p) }
      await roomRepository.saveAndWait(updatedRoom)
      operationDiagnostic('disconnect', 'ok')
      if (updatedRoom) await emitDisconnectedSummary(io, roomId)
      return
    }

    // If game is waiting, give a grace period before removing
    // This allows page reloads / brief disconnects to reconnect without losing their slot
    operationDiagnostic('disconnect', 'ok')
    const timer = setTimeout(() => {
      disconnectTimers.delete(socket.id)
      disconnectOwners.delete(socket.id)
      const jobs = graceJobs.get(io) ?? new Set<Promise<void>>()
      graceJobs.set(io, jobs)
      const job = inRoomQueue(roomId, async () => {
        // Fresh identity/generation check under the same queue as resume and cleanup.
        const currentRoom = await roomRepository.findByIdFresh(roomId)
        const currentMember = currentRoom?.players.find(p => p.socketId === socket.id)
        if (!currentRoom || !currentMember ||
            (currentMember.session && currentMember.session.generation !== socket.data.seatSession?.generation)) return
        const updatedRoom = await roomService.removePlayer(roomId, socket.id)
        if (updatedRoom) {
          await emitRoomView(io, updatedRoom, 'player_left', {
            socketId: socket.id, players: updatedRoom.players.map(publicPlayer), host: updatedRoom.host,
          })
        } else {
          io.to(roomId).emit('room_closed', { roomId })
          io.emit('rooms_list', roomService.getAvailableRooms())
        }
      }).catch(() => { operationDiagnostic('room_cleanup', 'failed') })
        .finally(() => jobs.delete(job))
      jobs.add(job)
    }, 10_000)

    disconnectTimers.set(socket.id, timer)
    disconnectOwners.set(socket.id, io)
  })
}

/**
 * Cancel pending disconnect timer for a socket (called on reconnect)
 */
export function cancelDisconnectTimer(socketId: string) {
  const timer = disconnectTimers.get(socketId)
  if (timer) {
    clearTimeout(timer)
    disconnectTimers.delete(socketId)
    disconnectOwners.delete(socketId)
    operationDiagnostic('reconnect_room', 'ok')
  }
}
