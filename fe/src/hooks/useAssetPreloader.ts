import { useState, useEffect } from 'react'
import { CARD_IMAGES } from '@/constants/cardImages'

// Helper: extract a readable label from a URL or path for logging
function label(url: string): string {
  return decodeURIComponent(url.split('/').pop() ?? url)
}

// ─── Phase 1 (blocking — shown in preloader) ─────────────────────────────────
// Only what's needed to render the HOME screen and waiting room.
// Heavy backgrounds + in-game assets moved to phase 2.
const CRITICAL_URLS: Array<{ url: string; tag: string }> = [
  // Logo + home background (needed immediately)
  { url: '/emcoin_logo.png',        tag: 'bg' },
  { url: '/cartoon/ui/home-bg.png', tag: 'bg' },

  // Core UI panels (needed to render any screen)
  { url: '/cartoon/ui/Panel-Teal.png',                    tag: 'ui' },
  { url: '/cartoon/ui/Rounded-Rectangle-256.png',         tag: 'ui' },
  { url: '/cartoon/ui/Rounded-Rectangle-512.png',         tag: 'ui' },
  { url: '/cartoon/ui/Top.png',                           tag: 'ui' },
  { url: '/cartoon/ui/Bottom.png',                        tag: 'ui' },
  { url: '/cartoon/ui/Border.png',                        tag: 'ui' },
  { url: '/cartoon/ui/Headline-Flag.png',                 tag: 'ui' },
  { url: '/cartoon/ui/Coin-x1.png',                       tag: 'ui' },
  { url: '/cartoon/ui/Circle-Cartoon.png',                tag: 'ui' },
  { url: '/cartoon/ui/Star-Blue.png',                     tag: 'ui' },
  { url: '/cartoon/ui/Star-Gray.png',                     tag: 'ui' },
  { url: '/cartoon/ui/Star-Pink.png',                     tag: 'ui' },
  { url: '/cartoon/ui/Star-Yellow.png',                   tag: 'ui' },
  { url: '/cartoon/ui/background.png',                    tag: 'ui' },

  // Buttons — pill (needed for lobby)
  { url: '/cartoon/buttons/pill/Green.png',  tag: 'btn' },
  { url: '/cartoon/buttons/pill/Orange.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Pink.png',   tag: 'btn' },
  { url: '/cartoon/buttons/pill/Purple.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Teal.png',   tag: 'btn' },

  // Buttons — circle (needed for lobby)
  { url: '/cartoon/buttons/circle/Blue-Teal.png',  tag: 'btn' },
  { url: '/cartoon/buttons/circle/Blue.png',        tag: 'btn' },
  { url: '/cartoon/buttons/circle/Dark.png',        tag: 'btn' },
  { url: '/cartoon/buttons/circle/Gray.png',        tag: 'btn' },
  { url: '/cartoon/buttons/circle/Light.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Neutral.png',     tag: 'btn' },
  { url: '/cartoon/buttons/circle/Purple.png',      tag: 'btn' },
  { url: '/cartoon/buttons/circle/White.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Yellow.png',      tag: 'btn' },

  // Avatars (needed for waiting room)
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

  // Card backs (needed before any card is shown)
  { url: CARD_IMAGES.roles.back,      tag: 'card-back' },
  { url: CARD_IMAGES.situation.back,  tag: 'card-back' },
  { url: CARD_IMAGES.reflection.back, tag: 'card-back' },
  { url: CARD_IMAGES.selfcare.back,   tag: 'card-back' },
  ...Object.values(CARD_IMAGES.emotionBasic).map(e => ({ url: e.back, tag: 'card-back' })),

  // Role card fronts (shown in waiting room)
  ...Object.entries(CARD_IMAGES.roles)
    .filter(([k]) => k !== 'back')
    .map(([k, url]) => ({ url, tag: `vai-tro/${k}` })),
]

// ─── Phase 2 (background, non-blocking) ──────────────────────────────────────
// Heavy static assets + all card fronts loaded after lobby is visible
const BACKGROUND_URLS: Array<{ url: string; tag: string }> = [
  // Heavy backgrounds (not needed until in-game)
  { url: '/ingame_background.png',      tag: 'bg-heavy' },
  { url: '/ingame_dark_background.png', tag: 'bg-heavy' },
  { url: '/pink_carpet.jpg',            tag: 'bg-heavy' },
  { url: '/capybara_wallpaper.jpg',     tag: 'bg-heavy' },

  // Remaining UI (non-critical)
  { url: '/cartoon/ui/Confetti.png',                      tag: 'ui2' },
  { url: '/cartoon/ui/Gradient.png',                      tag: 'ui2' },
  { url: '/cartoon/ui/Inner-Glow-Rounded-Rectangle.png',  tag: 'ui2' },
  { url: '/cartoon/ui/Shine.png',                         tag: 'ui2' },

  // Remaining buttons
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

  // Coins local icons
  { url: '/coins/do.png',   tag: 'coin-icon' },
  { url: '/coins/vang.png', tag: 'coin-icon' },
  { url: '/coins/xanh.png', tag: 'coin-icon' },

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

  // Emotion light/strong/advanced (front + back)
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

// Load in batches of N for background phase (avoid overwhelming slow connections)
const BG_BATCH = 10

function loadBgBatch(
  items: Array<{ url: string; tag: string }>,
  startIndex: number,
  onEach: (item: { url: string; tag: string }) => void,
  onBatchDone: (next: number) => void
) {
  const batch = items.slice(startIndex, startIndex + BG_BATCH)
  if (batch.length === 0) { onBatchDone(startIndex); return }
  let completed = 0
  batch.forEach(item => {
    const img = new Image()
    const done = () => {
      completed++
      onEach(item)
      if (completed === batch.length) onBatchDone(startIndex + BG_BATCH)
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
  const [bgStarted, setBgStarted] = useState(false)

  const total = CRITICAL_URLS.length
  const bgTotal = BACKGROUND_URLS.length

  // Fire all critical loads in parallel immediately
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
  }, [])

  const done = loaded >= total

  useEffect(() => {
    if (!done || bgStarted) return
    setBgStarted(true)

    let bgIndex = 0
    const loadNext = () => {
      if (bgIndex >= BACKGROUND_URLS.length) return
      loadBgBatch(
        BACKGROUND_URLS,
        bgIndex,
        ({ url, tag }) => {
          console.log(`[bg-preload][${tag}] ${label(url)}`)
          setBgLoaded(prev => prev + 1)
        },
        (next) => {
          bgIndex = next
          if (bgIndex < BACKGROUND_URLS.length) setTimeout(loadNext, 0)
        }
      )
    }
    setTimeout(loadNext, 0)
  }, [done, bgStarted])

  const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
  const bgDone = bgLoaded >= bgTotal

  return { loaded, total, progress, done, currentFile, bgLoaded, bgTotal, bgDone }
}
