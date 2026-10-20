export interface PillAppearance {
  src: string
  textColor: string
}

/** Non-card controls only; omitted variants retain their legacy appearance. */
export interface ControlTheme {
  label: string
  pills: Readonly<Record<string, PillAppearance>>
  circles: Readonly<Record<string, PillAppearance>>
  spriteShadow: string
}

function brandControls(id: string, label: string): ControlTheme {
  const base = `/cartoon/ui/themes/${id}`
  const primary = { src: `${base}/primary-v3.webp`, textColor: 'var(--brand-on-primary)' }
  const secondary = { src: `${base}/secondary-v3.webp`, textColor: 'var(--brand-on-primary)' }
  const quiet = { src: `${base}/quiet-v3.webp`, textColor: 'var(--brand-ink)' }
  return {
    label,
    pills: { green: primary, blue: primary, teal: primary, pink: secondary, orange: secondary, purple: secondary, white: quiet, cream: quiet, 'blush-soft': quiet },
    circles: Object.fromEntries(['blue', 'blue-teal', 'red', 'yellow', 'violet', 'purple', 'gray', 'dark', 'brown', 'bordeaux', 'light', 'neutral', 'white', 'transparent'].map(color => [color, { src: `${base}/circle.svg`, textColor: 'var(--brand-ink)' }])),
    spriteShadow: 'drop-shadow(0 3px 2px var(--brand-shadow))',
  }
}

export const CONTROL_THEMES = {
  'emotion-orbit': brandControls('emotion-orbit', 'Vòng Cảm Xúc'),
  'kindness-workshop': brandControls('kindness-workshop', 'Xưởng Tử Tế'),
  'candy-clouds': {
    label: 'Mây Kẹo',
    pills: Object.fromEntries(['green', 'blue', 'teal', 'pink', 'orange', 'purple', 'white', 'cream', 'blush-soft'].map(color => {
      const tone = ['pink', 'orange', 'purple'].includes(color) ? 'secondary' : ['white', 'cream', 'blush-soft'].includes(color) ? 'quiet' : 'primary'
      return [color, { src: `/cartoon/ui/themes/candy-clouds/${tone}.svg`, textColor: tone === 'primary' ? 'var(--brand-on-primary)' : 'var(--brand-ink)' }]
    })),
    circles: Object.fromEntries(['blue', 'blue-teal', 'red', 'yellow', 'violet', 'purple', 'gray', 'dark', 'brown', 'bordeaux', 'light', 'neutral', 'white', 'transparent'].map(color => [color, { src: '/cartoon/ui/themes/candy-clouds/circle.svg', textColor: 'var(--brand-ink)' }])),
    spriteShadow: 'drop-shadow(0 3px 2px var(--brand-shadow))',
  },
  legacy: { label: 'Cartoon gốc', pills: {}, circles: {}, spriteShadow: 'drop-shadow(0 6px 4px rgba(0,0,0,0.18))' },
  'mint-blush': {
    label: 'A1 Sky–Pink',
    pills: {
      green: { src: '/cartoon/buttons/themes/sky-pink-a1/pill-sky-v2.png', textColor: 'var(--ui-brand-action-ink)' },
      pink: { src: '/cartoon/buttons/themes/mint-blush-v2/pill-blush.png', textColor: 'var(--ui-brand-secondary-ink)' },
      orange: { src: '/cartoon/buttons/themes/mint-blush-v2/pill-blush.png', textColor: 'var(--ui-brand-secondary-ink)' },
      purple: { src: '/cartoon/buttons/themes/mint-blush-v2/pill-blush.png', textColor: 'var(--ui-brand-secondary-ink)' },
      teal: { src: '/cartoon/buttons/themes/sky-pink-a1/pill-sky-v2.png', textColor: 'var(--ui-brand-action-ink)' },
      cream: { src: '/cartoon/buttons/themes/sky-pink-a1/pill-cream-v2.png', textColor: 'var(--brand-ink)' },
      'blush-soft': { src: '/cartoon/buttons/themes/sky-pink-a1/pill-blush-soft-v2.png', textColor: 'var(--brand-ink)' },
    },
    circles: Object.fromEntries(['blue', 'blue-teal', 'red', 'yellow', 'violet', 'purple', 'gray', 'dark', 'brown', 'bordeaux', 'light', 'neutral', 'white', 'transparent'].map(color => [color, {
      src: ['red', 'violet', 'purple', 'bordeaux'].includes(color) ? '/cartoon/buttons/themes/mint-blush-v2/circle-blush.png' : '/cartoon/buttons/themes/sky-pink-a1/circle-sky.png',
      textColor: 'var(--brand-ink)',
    }])),
    spriteShadow: 'drop-shadow(0 3px 2px rgba(36,95,143,0.12))',
  },
} as const satisfies Record<string, ControlTheme>

export type ControlThemeId = keyof typeof CONTROL_THEMES
export const DEFAULT_CONTROL_THEME: ControlThemeId = 'candy-clouds'

export function isBrandTheme(theme: ControlThemeId) {
  return theme === 'emotion-orbit' || theme === 'kindness-workshop' || theme === 'candy-clouds'
}

/** Only new non-card art has material variants. Never rewrite arbitrary image URLs. */
export function themeArtUrl(theme: ControlThemeId, src: string | undefined) {
  if (theme === 'candy-clouds' && src && /^\/emcoin\/icons\/orbit\/(lock|check|arrowRight|arrowLeft|heal|connect|compass|sleep|facilitator|storyteller|gift|photo)\.svg$/.test(src)) return src.replace('/orbit/', '/candy/')
  return theme === 'kindness-workshop' && src?.startsWith('/emcoin/') ? src.replace('/orbit/', '/paper/') : src
}

/** Owner-approved theme wordmarks; card identities remain independent. */
export function themeLogo(theme: ControlThemeId) {
  if (theme === 'candy-clouds') return '/cartoon/ui/themes/candy-clouds/coin-mark.webp'
  return isBrandTheme(theme) ? `/cartoon/ui/themes/${theme}/logo-v2.webp` : '/emcoin_logo.png'
}

/** URL selection is a development preview seam, not a persisted user preference. */
export function previewControlTheme(search: string, fallback: ControlThemeId = DEFAULT_CONTROL_THEME): ControlThemeId {
  const candidate = new URLSearchParams(search).get('theme')
  return candidate && Object.prototype.hasOwnProperty.call(CONTROL_THEMES, candidate) ? candidate as ControlThemeId : fallback
}

/** Old standalone controls referenced a nonexistent /buttons/*.png directory. */
export function legacyStandaloneCircle(color: string) {
  const names: Record<string, string> = { gray: 'Gray', blue: 'Blue', red: 'Red', pink: 'Red', purple: 'Purple', yellow: 'Yellow', green: 'Blue-Teal', teal: 'Blue-Teal' }
  return `/cartoon/buttons/circle/${names[color] ?? 'Blue-Teal'}.png`
}

export function pillAppearance(theme: ControlThemeId, color: string, legacy: PillAppearance) {
  const definition: ControlTheme = CONTROL_THEMES[theme]
  const override = definition.pills[color] ?? (theme !== 'legacy' ? definition.pills.green : undefined)
  return { ...(override ?? legacy), themed: Boolean(override), shadow: override ? definition.spriteShadow : CONTROL_THEMES.legacy.spriteShadow }
}

export function circleAppearance(theme: ControlThemeId, color: string, legacySrc: string) {
  const definition: ControlTheme = CONTROL_THEMES[theme]
  const override = definition.circles[color] ?? (theme !== 'legacy' ? definition.circles.blue : undefined)
  return { src: override?.src ?? legacySrc, textColor: override?.textColor, themed: Boolean(override), shadow: override ? definition.spriteShadow : CONTROL_THEMES.legacy.spriteShadow }
}

export const A_DECOR = {
  backdrop: '/cartoon/ui/themes/sky-pink-a1/backdrop.webp',
  table: '/cartoon/ui/themes/sky-pink-a1/table.webp',
} as const

export function themeBackdrop(theme: ControlThemeId, legacy: string) {
  if (theme === 'candy-clouds') return 'url(/cartoon/ui/themes/candy-clouds/backdrop.webp)'
  if (isBrandTheme(theme)) return `url(/cartoon/ui/themes/${theme}/backdrop-v3.webp)`
  return theme === 'mint-blush' ? `url(${A_DECOR.backdrop})` : legacy
}
export function themePanel(theme: ControlThemeId) {
  if (isBrandTheme(theme)) return 'none'
  return theme === 'mint-blush' ? `url(${A_DECOR.table}) 90 fill / 26px / 0px stretch` : 'url(/cartoon/ui/Panel-Teal.png) 120 fill / 40px / 0px stretch'
}
