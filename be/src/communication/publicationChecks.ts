import { isIP } from 'node:net'

/** Conservative local contact/link checks, not semantic moderation or a PII guarantee.
 * Inspection never changes approved text, stores rejected text, or calls a provider.
 */
export const PUBLICATION_CHECK_VERSION = 'chat-contact-check/v1'
export type PublicationRejection = 'CHAT_LINK_NOT_ALLOWED' | 'CHAT_CONTACT_NOT_ALLOWED' | 'CHAT_TEXT_FORMAT_NOT_ALLOWED'

export function publicationRejection(text: string): PublicationRejection | null {
  // Bidi overrides can visually disguise an address. Ordinary scripts/emoji remain allowed.
  if (/[\u202a-\u202e\u2066-\u2069]/u.test(text)) return 'CHAT_TEXT_FORMAT_NOT_ALLOWED'
  const inspected = text.normalize('NFKC').replace(/[\u200b-\u200d\u2060\ufeff]/gu, '')
    .replace(/\s*(?:\[at\]|\(at\))\s*/gi, '@').replace(/\s*(?:\[(?:dot|\.)\]|\((?:dot|\.)\))\s*/gi, '.')
  const email = /[\p{L}\p{N}._%+-]+\s*@\s*[\p{L}\p{N}-]+(?:\s*\.\s*[\p{L}\p{N}-]+)+/u
  const vietnamMobile = /(?<!\d)(?:\+?84|0)[\s().-]*[35789](?:[\s().-]*\d){8}(?!\d)/u
  const internationalPhone = /(?<!\d)\+[1-9](?:[\s().-]*\d){7,14}(?!\d)/u
  if (email.test(inspected) || vietnamMobile.test(inspected) || internationalPhone.test(inspected)) return 'CHAT_CONTACT_NOT_ALLOWED'
  const scheme = /\b(?:https?|hxxps?|ftp|mailto|tel|sms|file|javascript|data)\s*:/iu
  const domain = /(?:^|[^\p{L}\p{N}_])[\p{L}\p{N}-]+\.(?:xn--[a-z0-9-]{2,59}|[\p{L}]{2,63})(?:[^\p{L}\p{N}_-]|$)/iu
  const ipv4 = [...inspected.matchAll(/(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?![\d.])/gu)].some(match => isIP(match[0]) === 4)
  const ipv6 = [...inspected.matchAll(/\[([a-f\d:]+)\]/giu)].some(match => isIP(match[1]) === 6)
  if (scheme.test(inspected) || /\bwww\s*\.\s*[\p{L}\p{N}]/iu.test(inspected) || domain.test(inspected) || ipv4 || ipv6) return 'CHAT_LINK_NOT_ALLOWED'
  return null
}
