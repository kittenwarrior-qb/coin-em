import { useEffect } from 'react'
import { canNavigateNativeBack } from './nativeNavigation'
import { handlePlatformBack } from '@/features/overlays/usePopupLifecycle'
import { mountNativeBridge } from './nativeBridge'
import { notifyNativeBackground, notifyNativeForeground } from './nativeEvents'

/** No UI/theme replacement and no microphone permission; native build only. */
export function NativePlatform() {
  useEffect(() => {
    if (import.meta.env.VITE_NATIVE_APP !== 'true') return
    let disposed = false
    let detach: (() => void) | undefined
    void Promise.all([import('@capacitor/core'), import('@capacitor/app'), import('@capacitor/network')]).then(([{ Capacitor }, { App }, { Network }]) => {
      if (disposed || !Capacitor.isNativePlatform()) return
      detach = mountNativeBridge({
        appState: listener => App.addListener('appStateChange', state => listener(state.isActive)),
        network: listener => Network.addListener('networkStatusChange', state => listener(state.connected)),
        back: listener => App.addListener('backButton', event => listener(event.canGoBack)),
      }, {
        foreground: notifyNativeForeground,
        background: notifyNativeBackground,
        back: canGoBack => {
          if (handlePlatformBack()) return
          const pathname = window.location.hash.slice(1).split('?')[0] || '/'
          let session: string | null | undefined
          try { session = localStorage.getItem('emcoin_session') } catch { /* fail closed */ }
          if (!canNavigateNativeBack(pathname, session)) return // No implicit room/pending exit.
          if (canGoBack) window.history.back()
          else void App.exitApp().catch(() => {})
        },
        unavailable: () => { /* Gameplay remains usable without a platform plugin. */ },
      })
    }).catch(() => { /* No credentials/raw plugin errors in telemetry. */ })
    return () => { disposed = true; detach?.() }
  }, [])
  return null
}
