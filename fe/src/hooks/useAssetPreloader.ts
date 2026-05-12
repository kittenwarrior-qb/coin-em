import { useState, useEffect, useCallback } from 'react'
import { CARD_IMAGES } from '@/constants/cardImages'

// ─── Collect all image URLs to preload ────────────────────────────────────────

function collectAllUrls(): string[] {
  const urls: string[] = []

  // Priority 1: UI assets (local)
  const uiAssets = [
    '/emcoin_logo.png',
    '/cartoon/ui/home-bg.png',
    '/cartoon/ui/Panel-Teal.png',
    '/cartoon/ui/Rounded-Rectangle-256.png',
    '/cartoon/ui/Rounded-Rectangle-512.png',
    '/cartoon/ui/Top.png',
    '/cartoon/ui/Bottom.png',
    '/cartoon/ui/Border.png',
    '/cartoon/ui/Headline-Flag.png',
    '/cartoon/ui/Coin-x1.png',
    '/cartoon/ui/Confetti.png',
  ]
  urls.push(...uiAssets)

  // Priority 2: Role cards (shown in waiting room)
  urls.push(CARD_IMAGES.roles.back)
  Object.entries(CARD_IMAGES.roles).forEach(([k, v]) => { if (k !== 'back') urls.push(v) })

  // Priority 3: Card backs (shown first in game)
  urls.push(CARD_IMAGES.situation.back)
  urls.push(CARD_IMAGES.reflection.back)
  urls.push(CARD_IMAGES.selfcare.back)

  // Priority 4: Emotion basic (most used)
  Object.values(CARD_IMAGES.emotionBasic).forEach(imgs => {
    urls.push(imgs.front, imgs.back)
  })

  // Priority 5: Situation cards
  Object.entries(CARD_IMAGES.situation).forEach(([k, v]) => { if (k !== 'back') urls.push(v) })

  // Priority 6: Reflection + Selfcare
  Object.entries(CARD_IMAGES.reflection).forEach(([k, v]) => { if (k !== 'back') urls.push(v) })
  Object.entries(CARD_IMAGES.selfcare).forEach(([k, v]) => { if (k !== 'back') urls.push(v) })

  // Priority 7: Emotion light/strong/advanced
  CARD_IMAGES.emotionLight.forEach(imgs => urls.push(imgs.front, imgs.back))
  CARD_IMAGES.emotionStrong.forEach(imgs => urls.push(imgs.front, imgs.back))
  CARD_IMAGES.emotionAdvanced.forEach(imgs => urls.push(imgs.front, imgs.back))

  // Priority 8: Coins
  Object.values(CARD_IMAGES.coins).forEach(v => urls.push(v))

  return urls
}

const ALL_URLS = collectAllUrls()
const BATCH_SIZE = 6

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface PreloadState {
  loaded: number
  total: number
  progress: number   // 0–100
  done: boolean
}

export function useAssetPreloader(): PreloadState {
  const [loaded, setLoaded] = useState(0)
  const total = ALL_URLS.length

  const loadBatch = useCallback((startIndex: number) => {
    const batch = ALL_URLS.slice(startIndex, startIndex + BATCH_SIZE)
    if (batch.length === 0) return

    let completed = 0
    const onDone = () => {
      completed++
      setLoaded(prev => prev + 1)
      if (completed === batch.length) {
        // Schedule next batch on next frame to keep UI responsive
        requestAnimationFrame(() => loadBatch(startIndex + BATCH_SIZE))
      }
    }

    batch.forEach(url => {
      const img = new Image()
      img.onload = onDone
      img.onerror = onDone  // count errors too so progress never stalls
      img.src = url
    })
  }, [])

  useEffect(() => {
    loadBatch(0)
  }, [loadBatch])

  const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
  const done = loaded >= total

  return { loaded, total, progress, done }
}
