import type { Room } from '../types'
export function validRoundLimit(value: unknown, seats: number): value is number | null {
  return value === null || (Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= Math.min(seats, 10))
}
export function plannedRounds(room: Room): number | null {
  const limit = room.roundLimit ?? null
  return validRoundLimit(limit, room.players.length) ? limit ?? room.players.length : null
}
export function changeRoundLimit(room: Room, actorId: string, command: { limit: unknown; expectedRevision: unknown; requestId: unknown }): Room {
  if (room.host !== actorId) throw new Error('NOT_HOST')
  if (room.status !== 'waiting') throw new Error('GAME_ALREADY_STARTED')
  if (typeof command.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(command.requestId) ||
      !Number.isSafeInteger(command.expectedRevision) || (command.expectedRevision as number) < 0) throw new Error('INVALID_ROUND_LIMIT')
  const receipt = room.roundLimitReceipts?.find(item => item.requestId === command.requestId)
  if (receipt) {
    if (receipt.actorId !== actorId || receipt.limit !== command.limit || receipt.expectedRevision !== command.expectedRevision) throw new Error('ROUND_REQUEST_CONFLICT')
    return room
  }
  if (!validRoundLimit(command.limit, room.players.length)) throw new Error('INVALID_ROUND_LIMIT')
  if ((room.revision ?? 0) !== command.expectedRevision) throw new Error('ROUND_REVISION_CONFLICT')
  return { ...room, roundLimit: command.limit, lastActivity: Date.now(), roundLimitReceipts: [
    ...(room.roundLimitReceipts ?? []).slice(-19),
    { requestId: command.requestId, actorId, limit: command.limit, expectedRevision: command.expectedRevision as number },
  ] }
}
