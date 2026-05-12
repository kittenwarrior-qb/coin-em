import { useState, useEffect } from 'react'
import { CARD_IMAGES } from '@/constants/cardImages'

// Helper: extract a readable label from a URL or path for logging
function label(url: string): string {
  return decodeURIComponent(url.split('/').pop() ?? url)
}

// ─── Phase 1 (blocking — shown in preloader) ─────────────────────────────────
// MINIMAL: chỉ những gì cần để render HOME screen ngay lập tức
const CRITICAL_URLS: Array<{ url: string; tag: string }> = [
  // Logo + home background
  { url: '/emcoin_logo.png',        tag: 'bg' },
  { url: '/cartoon/ui/home-bg.png', tag: 'bg' },

  // Core UI panels
  { url: '/cartoon/ui/Panel-Teal.png',           tag: 'ui' },
  { url: '/cartoon/ui/Rounded-Rectangle-256.png', tag: 'ui' },
  { url: '/cartoon/ui/Rounded-Rectangle-512.png', tag: 'ui' },
  { url: '/cartoon/ui/Top.png',                   tag: 'ui' },
  { url: '/cartoon/ui/Bottom.png',                tag: 'ui' },
  { url: '/cartoon/ui/Border.png',                tag: 'ui' },
  { url: '/cartoon/ui/Headline-Flag.png',         tag: 'ui' },
  { url: '/cartoon/ui/Circle-Cartoon.png',        tag: 'ui' },
  { url: '/cartoon/ui/background.png',            tag: 'ui' },

  // Buttons — pill (lobby CTAs)
  { url: '/cartoon/buttons/pill/Green.png',  tag: 'btn' },
  { url: '/cartoon/buttons/pill/Orange.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Pink.png',   tag: 'btn' },
  { url: '/cartoon/buttons/pill/Purple.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Teal.png',   tag: 'btn' },

  // Buttons — circle (close/action buttons)
  { url: '/cartoon/buttons/circle/Blue-Teal.png', tag: 'btn' },
  { url: '/cartoon/buttons/circle/Blue.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Dark.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/White.png',      tag: 'btn' },
]

// ─── Phase 2 (background, non-blocking) ──────────────────────────────────────
// Tải sau khi home screen đã hiện — avatars, card backs, card fronts, heavy BGs
const BACKGROUND_URLS: Array<{ url: string; tag: string }> = [
  // Remaining UI
  { url: '/cartoon/ui/Coin-x1.png',                      tag: 'ui2' },
  { url: '/cartoon/ui/Star-Blue.png',                     tag: 'ui2' },
  { url: '/cartoon/ui/Star-Gray.png',                     tag: 'ui2' },
  { url: '/cartoon/ui/Star-Pink.png',                     tag: 'ui2' },
  { url: '/cartoon/ui/Star-Yellow.png',                   tag: 'ui2' },
  { url: '/cartoon/ui/Confetti.png',                      tag: 'ui2' },
  { url: '/cartoon/ui/Gradient.png',                      tag: 'ui2' },
  { url: '/cartoon/ui/Inner-Glow-Rounded-Rectangle.png',  tag: 'ui2' },
  { url: '/cartoon/ui/Shine.png',                         tag: 'ui2' },

  // Remaining buttons
  { url: '/cartoon/buttons/circle/Gray.png',                  tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Light.png',                 tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Neutral.png',               tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Purple.png',                tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Yellow.png',                tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Bordeaux.png',              tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Brown.png',                 tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Red.png',                   tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Transparent.png',           tag: 'btn2' },
  { url: '/cartoon/buttons/circle/Violet.png',                tag: 'btn2' },
  { url: '/cartoon/buttons/Border.png',                       tag: 'btn2' },
  { url: '/cartoon/buttons/Bottom.png',                       tag: 'btn2' },
  { url: '/cartoon/buttons/Gradient.png',                     tag: 'btn2' },
  { url: '/cartoon/buttons/Handle.png',                       tag: 'btn2' },
  { url: '/cartoon/buttons/Inner-Glow---Rounded-Rectangle.png', tag: 'btn2' },
  { url: '/cartoon/buttons/Lines.png',                        tag: 'btn2' },
  { url: '/cartoon/buttons/None.png',                         tag: 'btn2' },
  { url: '/cartoon/buttons/Radial-Shine.png',                 tag: 'btn2' },
  { url: '/cartoon/buttons/Shape.png',                        tag: 'btn2' },
  { url: '/cartoon/buttons/Shine.png',                        tag: 'btn2' },
  { url: '/cartoon/buttons/Top.png',                          tag: 'btn2' },

  // Avatars (waiting room)
  { url: '/cartoon/icons/avatars/Bear.png',              tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Bird - Blue.png',       tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Bird.png',              tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Boy 1.png',             tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Boy 2 (Dark Hair).png', tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Boy 2.png',             tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Boy 3.png',             tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Boy 4.png',             tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Boyy 2.png',            tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Bunny 2.png',           tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Bunny.png',             tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Cat 2.png',             tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Cat Head.png',          tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Cat.png',               tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Fish 2.png',            tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Fish.png',              tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Friends - Cartoon.png', tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Girl 1.png',            tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Girl 2.png',            tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Girl 3.png',            tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Girl 4.png',            tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Girl.png',              tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Neutral.png',           tag: 'avatar' },
  { url: '/cartoon/icons/avatars/None.png',              tag: 'avatar' },
  { url: '/cartoon/icons/avatars/Rabbit Head.png',       tag: 'avatar' },
  { url: '/cartoon/icons/white/Photo.png',               tag: 'avatar' },

  // Coins local icons
  { url: '/coins/do.png',   tag: 'coin-icon' },
  { url: '/coins/vang.png', tag: 'coin-icon' },
  { url: '/coins/xanh.png', tag: 'coin-icon' },

  // Heavy backgrounds (in-game)
  { url: '/ingame_background.png',      tag: 'bg-heavy' },
  { url: '/ingame_dark_background.png', tag: 'bg-heavy' },
  { url: '/pink_carpet.jpg',            tag: 'bg-heavy' },
  { url: '/capybara_wallpaper.jpg',     tag: 'bg-heavy' },

  // Card backs
  { url: CARD_IMAGES.roles.back,      tag: 'card-back' },
  { url: CARD_IMAGES.situation.back,  tag: 'card-back' },
  { url: CARD_IMAGES.reflection.back, tag: 'card-back' },
  { url: CARD_IMAGES.selfcare.back,   tag: 'card-back' },
  ...Object.values(CARD_IMAGES.emotionBasic).map(e => ({ url: e.back, tag: 'card-back' })),

  // Role card fronts
  ...Object.entries(CARD_IMAGES.roles)
    .filter(([k]) => k !== 'back')
    .map(([k, url]) => ({ url, tag: `vai-tro/${k}` })),

  // Card fronts — situation
  ...Object.entries(CARD_IMAGES.situation)
    .filter(([k]) => k !== 'back')
    .map(([k, url]) => ({ url, tag: `tinh-huong/${k}` })),

  // Card fronts — emotion basic
  ...Object.entries(CARD_IMAGES.emotionBasic)
    .map(([k, e]) => ({ url: e.front, tag: `cam-xuc-basic/${k}` })),

  // Card fronts — reflection
  ...Object.entries(CARD_IMAGES.reflection)
    .filter(([k]) => k !== 'back')
    .map(([k, url]) => ({ url, tag: `phan-tu/${k}` })),

  // Card fronts — selfcare
  ...Object.entries(CARD_IMAGES.selfcare)
    .filter(([k]) => k !== 'back')
    .map(([k, url]) => ({ url, tag: `bi-kip/${k}` })),

  // Emotion light/strong/advanced
  ...CARD_IMAGES.emotionLight.flatMap((e, i) => [
    { url: e.front, tag: `cam-xuc-nhe/${i + 1}-front` },
    { url: e.back,  tag: `cam-xuc-nhe/${i + 1}-back` },
  ]),
  ...CARD_IMAGES.emotionStrong.flatMap((e, i) => [
    { url: e.front, tag: `cam-xuc-manh/${i + 1}-front` },
    { url: e.back,  tag: `cam-xuc-manh/${i + 1}-back` },
  ]),
  ...CARD_IMAGES.emotionAdvanced.flatMap((e, i) => [
    { url: e.front, tag: `cam-xuc-nc/${i + 1}-front` },
    { url: e.back,  tag: `cam-xuc-nc/${i + 1}-back` },
  ]),

  // Coin card images (CDN)
  ...Object.entries(CARD_IMAGES.coins).map(([k, url]) => ({ url, tag: `coin/${k}` })),
]

export interface PreloadState {
  loaded: number
  total: number
  progress: number
  done: boolean
  currentFile: string
  bgLoaded: number
  bgTotal: number
  bgDone: boolean
}

// Load all items in parallel — no batching, browser handles concurrency via HTTP/2
function loadAll(
  items: Array<{ url: string; tag: string }>,
  onEach: (item: { url: string; tag: string }) => void,
  onDone: () => void
) {
  if (items.length === 0) { onDone(); return }
  let completed = 0
  items.forEach(item => {
    const img = new Image()
    const done = () => {
      completed++
      onEach(item)
      if (completed === items.length) onDone()
    }
    img.onload = done
    img.onerror = done
    img.src = item.url
  })
}


export function useAssetPreloader(): PreloadState {
  const [loaded, setLoaded] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [bgLoaded, setBgLoaded] = useState(0)

  const total = CRITICAL_URLS.length
  const bgTotal = BACKGROUND_URLS.length

  // Fire ALL loads in parallel immediately — critical + background simultaneously
  useEffect(() => {
    loadAll(
      CRITICAL_URLS,
      ({ url, tag }) => {
        const name = label(url)
        console.log(`[preload][${tag}] ${name}`)
        setCurrentFile(`[${tag}] ${name}`)
        setLoaded(prev => prev + 1)
      },
      () => console.log('[preload] critical done')
    )
    loadAll(
      BACKGROUND_URLS,
      ({ url, tag }) => {
        console.log(`[bg-preload][${tag}] ${label(url)}`)
        setBgLoaded(prev => prev + 1)
      },
      () => console.log('[preload] background done')
    )
  }, [])

  const done = loaded >= total
  const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
  const bgDone = bgLoaded >= bgTotal

  return { loaded, total, progress, done, currentFile, bgLoaded, bgTotal, bgDone }
}
