/*
 * What counts as traffic and how it is named. Pure functions shared by the
 * tracking endpoint, the store and the tests.
 */

export const TRAFFIC_TIME_ZONE = 'Asia/Ho_Chi_Minh'

/** "2026-10-13" in the product's time zone, so a day on the chart is a local day. */
export const dayOf = (date: Date, timeZone = TRAFFIC_TIME_ZONE) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

/** The last `count` days, oldest first, ending today. */
export const lastDays = (count: number, now = new Date(), timeZone = TRAFFIC_TIME_ZONE) =>
  Array.from({ length: count }, (_, index) => dayOf(new Date(now.getTime() - (count - 1 - index) * 864e5), timeZone))

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|whatsapp|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|phantom/i

export const isBot = (userAgent: string | null | undefined) => !userAgent || BOT.test(userAgent)

export type TrafficDevice = 'phone' | 'tablet' | 'desktop'
export const deviceOf = (userAgent: string): TrafficDevice =>
  /ipad|tablet|kindle|silk|playbook/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent)) ? 'tablet'
    : /mobi|iphone|ipod|android/i.test(userAgent) ? 'phone' : 'desktop'

/** Registered public routes only: a fixed key space with no room codes, queries or admin paths. */
export const TRAFFIC_PAGES = ['/', '/game', '/about', '/about/cards', '/about/story', '/cards'] as const

export const cleanPath = (input: unknown): string | null => {
  if (typeof input !== 'string' || input.length > 200 || !input.startsWith('/') || input.startsWith('//')) return null
  const path = input.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  return (TRAFFIC_PAGES as readonly string[]).includes(path) ? path : null
}

export const DIRECT_SOURCE = 'direct'
const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)(coccoc\.com)$/, 'Cốc Cốc'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(zalo\.me|zaloapp\.com)$/, 'Zalo'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X (Twitter)'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)(t\.me|telegram\.org)$/, 'Telegram'],
]

/** Where a visit came from: a known name, the other site's host, or "direct". Never a full URL. */
export const sourceOf = (referrer: unknown, ownHost?: string): string => {
  if (typeof referrer !== 'string' || !referrer || referrer.length > 2048) return DIRECT_SOURCE
  let host: string
  try { host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '') } catch { return DIRECT_SOURCE }
  if (!host || !/^[a-z0-9.-]+$/.test(host) || host === ownHost?.toLowerCase().replace(/^www\./, '').replace(/:\d+$/, '')) return DIRECT_SOURCE
  return SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? host.slice(0, 80)
}
