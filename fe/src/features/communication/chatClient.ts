import type { Socket } from 'socket.io-client'

export interface ChatMessage { id: string; senderId: string; senderName: string; text: string; sentAt: number }
export interface ChatView {
  version: 'room-chat/v1'; roomId: string; revision: number; enabled: boolean; admitted: boolean
  isHost: boolean; canSend: boolean; safetyAvailable: boolean; blocked: string[]; safetyMuted?: string[]; messages: ChatMessage[]
}
export type ChatIntent = { kind: 'enable' | 'join'; invitation: string } | { kind: 'send'; text: string } |
  { kind: 'mute' | 'block'; targetId: string; value: boolean } | { kind: 'disable' }
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const identity = (v: unknown, max = 128): v is string => typeof v === 'string' && new RegExp(`^[A-Za-z0-9_-]{1,${max}}$`).test(v)
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10 && v.every(id => identity(id)) && new Set(v).size === v.length
export function parseChatMessage(v: unknown): ChatMessage {
  if (!object(v) || !uuid(v.id) || !identity(v.senderId) || typeof v.senderName !== 'string' || !v.senderName.trim() || v.senderName.length > 80 ||
    typeof v.text !== 'string' || !v.text.trim() || v.text.length > 500 || !count(v.sentAt) || v.sentAt > 8640000000000000) throw Error('CHAT_INVALID_RESPONSE')
  return { id: v.id, senderId: v.senderId, senderName: v.senderName, text: v.text, sentAt: v.sentAt }
}
export function parseChatView(v: unknown, roomId: string): ChatView {
  if (!object(v) || v.version !== 'room-chat/v1' || v.roomId !== roomId || !identity(v.roomId, 64) || !count(v.revision) ||
    !['enabled', 'admitted', 'isHost', 'canSend', 'safetyAvailable'].every(key => typeof v[key] === 'boolean') || !ids(v.blocked) ||
    (v.safetyMuted !== undefined && (!v.isHost || !ids(v.safetyMuted))) || !Array.isArray(v.messages) || v.messages.length > 100 ||
    (!v.admitted && v.messages.length > 0) || (v.canSend && (!v.admitted || !v.enabled || !v.safetyAvailable))) throw Error('CHAT_INVALID_RESPONSE')
  const messages = v.messages.map(parseChatMessage)
  if (new Set(messages.map(m => m.id)).size !== messages.length || messages.some(m => (v.blocked as string[]).includes(m.senderId))) throw Error('CHAT_INVALID_RESPONSE')
  return { version: 'room-chat/v1', roomId, revision: v.revision, enabled: v.enabled as boolean, admitted: v.admitted as boolean,
    isHost: v.isHost as boolean, canSend: v.canSend as boolean, safetyAvailable: v.safetyAvailable as boolean,
    blocked: [...v.blocked], ...(v.safetyMuted ? { safetyMuted: [...v.safetyMuted as string[]] } : {}), messages }
}
export function invitationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
/** Socket.IO timeout is an uncertain result, not evidence of rollback. No automatic retries. */
export async function chatRequest(socket: Socket, event: 'get_chat_state' | 'chat_command' | 'report_chat_message', payload: object): Promise<Record<string, unknown>> {
  if (!socket.connected) throw Error('CHAT_DISCONNECTED')
  const result: unknown = await socket.timeout(10000).emitWithAck(event, payload)
  if (!object(result) || typeof result.success !== 'boolean') throw Error('CHAT_UNCERTAIN')
  if (!result.success) throw Error(typeof result.error === 'string' ? result.error : 'CHAT_UNCERTAIN')
  return result
}
