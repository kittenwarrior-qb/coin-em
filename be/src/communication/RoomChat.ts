import { createHash, timingSafeEqual } from 'node:crypto'
import type { Room } from '../modules/game/types'
import { isRoomInactive } from '../retention'
import { communicationAccess, COMMUNICATION_POLICY, normalizeCommunicationText } from './policy'

export interface RoomChatMessage { id: string; senderId: string; senderName: string; text: string; sentAt: number }
export interface RoomChatState {
  version: 'room-chat/v1'; revision: number; enabled: boolean; invitationHash: string | null
  admitted: string[]; safetyMuted: string[]; blocks: Record<string, string[]>
  messages: RoomChatMessage[]; lastSent: Record<string, number>
  receipts: { requestId: string; actorId: string; fingerprint: string }[]
}
export type ChatRoom = Room & { chat?: RoomChatState }
export type ChatCommand = { requestId: string; expectedRevision: number } & (
  { kind: 'enable'; invitation: string } | { kind: 'join'; invitation: string } |
  { kind: 'send'; text: string } | { kind: 'mute' | 'block'; targetId: string; value: boolean } | { kind: 'disable' })
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const validInvitation = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
const validId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const empty = (): RoomChatState => ({ version: 'room-chat/v1', revision: 0, enabled: false, invitationHash: null,
  admitted: [], safetyMuted: [], blocks: {}, messages: [], lastSent: {}, receipts: [] })
const own = <T>(record: Record<string, T>, key: string): T | undefined => Object.hasOwn(record, key) ? record[key] : undefined
const put = <T>(record: Record<string, T>, key: string, value: T) => Object.defineProperty(record, key, { value, enumerable: true, configurable: true, writable: true })

/** Strict contract: never trust client sender/name/role or let hidden extra fields affect receipts. */
export function parseChatCommand(value: unknown): ChatCommand | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const command = value as Record<string, unknown>
  if (!validId(command.requestId) || !Number.isSafeInteger(command.expectedRevision) || (command.expectedRevision as number) < 0) return null
  const shared = ['kind', 'requestId', 'expectedRevision']
  let fields: string[]
  switch (command.kind) {
    case 'enable': case 'join': if (!validInvitation(command.invitation)) return null; fields = ['invitation']; break
    case 'send': if (normalizeCommunicationText(command.text) === null) return null; fields = ['text']; break
    case 'mute': case 'block':
      if (typeof command.targetId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(command.targetId) || typeof command.value !== 'boolean') return null
      fields = ['targetId', 'value']; break
    case 'disable': fields = []; break
    default: return null
  }
  if (Object.keys(command).sort().join('|') !== [...shared, ...fields].sort().join('|')) return null
  return command as ChatCommand
}

function actor(room: ChatRoom, socketId: string, now: number) {
  if (!Number.isSafeInteger(now) || now < 0) throw Error('INVALID_CHAT_CLOCK')
  if (isRoomInactive(room, now)) throw Error('ROOM_EXPIRED')
  const access = communicationAccess(room, socketId, room.chat?.safetyMuted)
  if (!access.canReceive) throw Error(access.error ?? 'NOT_ROOM_MEMBER')
  return room.players.find(player => player.socketId === socketId)!
}

/** Pure immutable mutation. Runtime must queue, persist successfully, then ACK/emit its result. */
export function applyChatCommand(room: ChatRoom, socketId: string, value: unknown, now = Date.now()): ChatRoom {
  const player = actor(room, socketId, now), command = parseChatCommand(value)
  if (!command) throw Error('INVALID_CHAT_COMMAND')
  const current = room.chat ?? empty()
  const fingerprint = hash(JSON.stringify(Object.keys(command).sort().map(key => [key, command[key as keyof ChatCommand]])))
  const old = current.receipts.find(receipt => receipt.requestId === command.requestId)
  if (old) {
    if (old.actorId !== player.userId || old.fingerprint !== fingerprint) throw Error('CHAT_REQUEST_CONFLICT')
    return room
  }
  if (current.revision !== command.expectedRevision) throw Error('CHAT_REVISION_CONFLICT')
  if (current.revision >= Number.MAX_SAFE_INTEGER) throw Error('CHAT_REVISION_EXHAUSTED')
  if (['enable', 'disable', 'mute'].includes(command.kind) && room.host !== player.userId) throw Error('NOT_HOST')
  if (command.kind !== 'enable' && !current.enabled) throw Error('CHAT_DISABLED')
  const next = structuredClone(current)
  const admitted = room.host === player.userId || next.admitted.includes(player.userId)
  if (!['enable', 'join', 'disable'].includes(command.kind) && !admitted) throw Error('CHAT_INVITATION_REQUIRED')
  switch (command.kind) {
    case 'enable':
      // Rotating the invitation revokes old admission; safety restrictions must survive.
      next.enabled = true; next.invitationHash = hash(command.invitation); next.admitted = [room.host]
      break
    case 'disable': next.enabled = false; next.invitationHash = null; next.admitted = []; break
    case 'join': {
      const supplied = Buffer.from(hash(command.invitation), 'hex'), expected = Buffer.from(next.invitationHash ?? '', 'hex')
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw Error('INVALID_CHAT_INVITATION')
      if (!next.admitted.includes(player.userId)) next.admitted.push(player.userId)
      break
    }
    case 'send': {
      if (next.safetyMuted.includes(player.userId)) throw Error('SAFETY_MUTED')
      const previous = own(next.lastSent, player.userId)
      if (previous !== undefined && now - previous < 1000) throw Error('CHAT_RATE_LIMITED')
      next.messages = [...next.messages, { id: command.requestId, senderId: player.userId, senderName: player.name,
        text: normalizeCommunicationText(command.text)!, sentAt: now }].slice(-COMMUNICATION_POLICY.maxRecentMessages)
      put(next.lastSent, player.userId, now)
      break
    }
    case 'mute': case 'block': {
      if (command.targetId === player.userId || !room.players.some(target => target.userId === command.targetId && !target.isFake)) throw Error('INVALID_CHAT_TARGET')
      const list = command.kind === 'mute' ? next.safetyMuted : own(next.blocks, player.userId) ?? []
      const updated = command.value ? [...new Set([...list, command.targetId])] : list.filter(id => id !== command.targetId)
      if (command.kind === 'mute') next.safetyMuted = updated
      else put(next.blocks, player.userId, updated)
      break
    }
  }
  // Bound departed identities as well as message history; none of these grants survive room deletion.
  const members = new Set(room.players.filter(member => !member.isFake).map(member => member.userId))
  next.admitted = next.admitted.filter(id => members.has(id))
  next.safetyMuted = next.safetyMuted.filter(id => members.has(id))
  next.blocks = Object.fromEntries(Object.entries(next.blocks).filter(([id]) => members.has(id)).map(([id, list]) => [id, list.filter(target => members.has(target))]))
  next.lastSent = Object.fromEntries(Object.entries(next.lastSent).filter(([id]) => members.has(id)))
  next.receipts = [...next.receipts, { requestId: command.requestId, actorId: player.userId, fingerprint }].slice(-200)
  next.revision++
  return { ...room, chat: next, lastActivity: now }
}

/** Recipient-specific view. Invitation hashes, receipt digests and other users' blocks are server-only. */
export function chatView(room: ChatRoom, socketId: string, now = Date.now()) {
  const player = actor(room, socketId, now), state = room.chat ?? empty()
  const admitted = state.enabled && (player.userId === room.host || state.admitted.includes(player.userId))
  const blocked = own(state.blocks, player.userId) ?? []
  return { version: 'room-chat/v1' as const, roomId: room.id, revision: state.revision, enabled: state.enabled,
    admitted, isHost: player.userId === room.host, canSend: admitted && !state.safetyMuted.includes(player.userId),
    blocked: [...blocked], ...(player.userId === room.host ? { safetyMuted: [...state.safetyMuted] } : {}),
    messages: admitted ? state.messages.filter(message => !blocked.includes(message.senderId)).map(message => ({ ...message })) : [] }
}
