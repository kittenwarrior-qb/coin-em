import { useState, useEffect } from 'react'

// Helper: extract a readable label from a URL or path for logging
function label(url: string): string {
  return decodeURIComponent(url.split('/').pop() ?? url)
}

// ─── Phase 1 (blocking — shown in preloader) ─────────────────────────────────
// Chỉ logo + background — đủ để render màn hình chọn phòng ngay lập tức
const CRITICAL_URLS: Array<{ url: string; tag: string }> = [
  { url: '/emcoin_logo.png',                tag: 'bg' },
  { url: '/cartoon/ui/home-bg.png',         tag: 'bg' },
  { url: '/cartoon/buttons/pill/Green.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Pink.png',  tag: 'btn' },
]

// ─── Phase 2 (background, non-blocking) ──────────────────────────────────────
// Chỉ load UI/button/avatar local — tất cả card images (CDN) và heavy BG
// load on-demand khi vào game để không block màn hình chờ.
const BACKGROUND_URLS: Array<{ url: string; tag: string }> = [
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

  // Buttons — pill (lobby CTAs); Green + Pink already in CRITICAL_URLS
  { url: '/cartoon/buttons/pill/Orange.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Purple.png', tag: 'btn' },
  { url: '/cartoon/buttons/pill/Teal.png',   tag: 'btn' },

  // Buttons — circle
  { url: '/cartoon/buttons/circle/Blue-Teal.png',  tag: 'btn' },
  { url: '/cartoon/buttons/circle/Blue.png',        tag: 'btn' },
  { url: '/cartoon/buttons/circle/Dark.png',        tag: 'btn' },
  { url: '/cartoon/buttons/circle/White.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Gray.png',        tag: 'btn' },
  { url: '/cartoon/buttons/circle/Light.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Neutral.png',     tag: 'btn' },
  { url: '/cartoon/buttons/circle/Purple.png',      tag: 'btn' },
  { url: '/cartoon/buttons/circle/Yellow.png',      tag: 'btn' },
  { url: '/cartoon/buttons/circle/Red.png',         tag: 'btn' },
  { url: '/cartoon/buttons/circle/Green.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Bordeaux.png',    tag: 'btn' },
  { url: '/cartoon/buttons/circle/Brown.png',       tag: 'btn' },
  { url: '/cartoon/buttons/circle/Transparent.png', tag: 'btn' },
  { url: '/cartoon/buttons/circle/Violet.png',      tag: 'btn' },

  // Button shared assets
  { url: '/cartoon/buttons/Border.png',                         tag: 'btn' },
  { url: '/cartoon/buttons/Bottom.png',                         tag: 'btn' },
  { url: '/cartoon/buttons/Gradient.png',                       tag: 'btn' },
  { url: '/cartoon/buttons/Handle.png',                         tag: 'btn' },
  { url: '/cartoon/buttons/Inner-Glow---Rounded-Rectangle.png', tag: 'btn' },
  { url: '/cartoon/buttons/Lines.png',                          tag: 'btn' },
  { url: '/cartoon/buttons/Radial-Shine.png',                   tag: 'btn' },
  { url: '/cartoon/buttons/Shape.png',                          tag: 'btn' },
  { url: '/cartoon/buttons/Shine.png',                          tag: 'btn' },
  { url: '/cartoon/buttons/Top.png',                            tag: 'btn' },

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

  // Coin icons (local, small)
  { url: '/coins/do.png',   tag: 'coin-icon' },
  { url: '/coins/vang.png', tag: 'coin-icon' },
  { url: '/coins/xanh.png', tag: 'coin-icon' },

  // ── Đã xóa khỏi preload (load on-demand khi vào game) ──────────────────────
  // - Heavy backgrounds: /ingame_background.png, /ingame_dark_background.png, ...
  // - Tất cả card fronts + backs (Cloudinary CDN): ~130 requests
  // - Coin card images (Cloudinary CDN): 6 requests
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
