import type { Room } from '../modules/game/types'

export const COMMUNICATION_POLICY = Object.freeze({
  version: 'room-communication/v2',
  maxTextCharacters: 500,
  maxRecentMessages: 100,
  reportRetentionMs: 7 * 24 * 60 * 60 * 1000,
  recording: false,
  directMessages: false,
  strangerMatching: false,
})

/** Server-side policy foundation only; no transport/media credentials are issued here. */
export function communicationAccess(
  room: Room,
  socketId: string,
  safetyMutedUserIds: readonly string[] = [],
) {
  const player = room.players.find(candidate => candidate.socketId === socketId && !candidate.isDisconnected && !candidate.isFake)
  if (!player) return { canReceive: false, canPublish: false, error: 'NOT_ROOM_MEMBER' } as const
  if (room.status === 'ended') return { canReceive: false, canPublish: false, error: 'GAME_ENDED' } as const
  // Owner2026-10-13: game-role silence/healing is independent of chat/micro.
  if (safetyMutedUserIds.includes(player.userId)) return { canReceive: true, canPublish: false, error: 'SAFETY_MUTED' } as const
  return { canReceive: true, canPublish: true, error: null } as const
}

/** Plain text only. Rendering must remain escaped text; this is not an HTML sanitizer. */
export function normalizeCommunicationText(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > COMMUNICATION_POLICY.maxTextCharacters ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return null
  const text = value.trim()
  return text.length ? text : null
}
