import { useState, useEffect } from 'react'
import { preloadImages } from '@/utils/imagePreload'
import { useControlTheme } from '@/components/cartoon/controlThemeContext'
import { startupAssets } from '@/utils/startupAssets'

// Helper: extract a readable label from a URL or path for logging
function label(url: string): string {
  return decodeURIComponent(url.split('/').pop() ?? url)
}

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

export function useAssetPreloader(): PreloadState {
  const theme = useControlTheme()
  const [loaded, setLoaded] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const total = startupAssets(theme).length

  // Unused avatars/icons load on demand via their actual image elements, not at startup.
  useEffect(() => {
    setLoaded(0)
    setCurrentFile('')
    const cancelCritical = preloadImages(
      startupAssets(theme),
      ({ url, tag }) => {
        const name = label(url)
        console.log(`[preload][${tag}] ${name}`)
        setCurrentFile(`[${tag}] ${name}`)
        setLoaded(prev => prev + 1)
      },
      () => {},
    )
    return cancelCritical
  }, [theme])

  const done = loaded >= total
  const progress = total > 0 ? Math.round((loaded / total) * 100) : 0
  return { loaded, total, progress, done, currentFile, bgLoaded: 0, bgTotal: 0, bgDone: true }
}
