import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Player } from '../modules/game/types'

export const SEAT_SESSION_GRACE_MS = 2 * 60 * 60 * 1000

export function issueSeatSession() {
  const token = randomBytes(32).toString('base64url')
  return { token, session: { tokenHash: hash(token), generation: 1 } }
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function authenticateSeat(player: Player, token: unknown, now = Date.now(), active = true): boolean {
  if (!player.session || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false
  if (!Number.isSafeInteger(player.session.generation) || player.session.generation < 1 || player.session.generation >= Number.MAX_SAFE_INTEGER) return false
  if (player.isDisconnected && (typeof player.disconnectedAt !== 'number' || !Number.isFinite(player.disconnectedAt) ||
    now - player.disconnectedAt >= SEAT_SESSION_GRACE_MS)) return false
  if (!player.isDisconnected && !active && (typeof player.lastSeenAt !== 'number' || now - player.lastSeenAt >= SEAT_SESSION_GRACE_MS)) return false
  const expected = Buffer.from(player.session.tokenHash, 'hex')
  const actual = Buffer.from(hash(token), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// Never spread a persisted Player onto the wire: session hashes and device IDs
// are server-only even when an event uses a partial players list.
export function publicPlayer(player: Player) {
  return {
    socketId: player.socketId, userId: player.userId, name: player.name,
    colorIndex: player.colorIndex, avatarIndex: player.avatarIndex, bgIndex: player.bgIndex,
    isNarrator: player.isNarrator, isSender: player.isSender,
    isMuted: player.isMuted, isHealed: player.isHealed, isFake: player.isFake,
    isDisconnected: player.isDisconnected, disconnectedAt: player.disconnectedAt,
    coins: player.coins,
    collectedGreenCoins: player.collectedGreenCoins,
  }
}
