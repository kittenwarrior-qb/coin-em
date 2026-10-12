import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { canUpdatePwa, subscribePwaGate } from './updateGate'

/** Public-only worker; no offline action queue, room snapshot or installation claim. */
export function PwaStatus() {
  const { pathname } = useLocation()
  const currentPath = useRef(pathname)
  currentPath.current = pathname
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const requested = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const allowed = useSyncExternalStore(subscribePwaGate, () => canUpdatePwa(pathname), () => false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let cancelled = false
    let ownedRegistration: ServiceWorkerRegistration | undefined
    const watched = new Set<ServiceWorker>()
    const update = () => {
      if (cancelled) return
      void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(registration => {
        if (cancelled) return
        setWaiting(registration?.waiting ?? null)
        const worker = registration?.installing
        if (worker && !watched.has(worker)) { watched.add(worker); worker.addEventListener('statechange', update) }
      }).catch(() => { /* Storage eviction is not an application failure. */ })
    }
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'EMCOIN_UPDATE_CHECK') {
        // The requesting waiting worker must belong to this app's own registration.
        void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(registration => {
          const worker = registration?.waiting
          if (!cancelled && worker && worker === event.source) worker.postMessage({
            type: 'EMCOIN_UPDATE_VOTE', nonce: event.data.nonce, idle: canUpdatePwa(currentPath.current),
          })
        }).catch(() => { /* Missing registration means no idle vote. */ })
      } else if (event.data?.type === 'EMCOIN_UPDATE_DEFERRED' && requested.current) {
        void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(registration => {
          if (cancelled || registration?.waiting !== event.source || !requested.current) return
          clearTimeout(timeout.current); requested.current = false; setPending(false)
          setMessage('Chưa cập nhật: một tab còn trong phòng hoặc chưa xác nhận trạng thái. Hãy ra khỏi phòng ở các tab rồi thử lại.')
        }).catch(() => { /* Keep the bounded pending timeout. */ })
      }
    }
    const activated = () => {
      if (!requested.current) { update(); return }
      clearTimeout(timeout.current); requested.current = false; setPending(false)
      if (canUpdatePwa(currentPath.current)) window.location.reload()
      else setMessage('Bản cập nhật đã sẵn sàng. Ứng dụng hiện tại được giữ nguyên; chỉ tải lại sau khi ra khỏi phòng.')
    }
    navigator.serviceWorker.addEventListener('message', receive)
    navigator.serviceWorker.addEventListener('controllerchange', activated)
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).then(registration => {
      if (cancelled) return
      ownedRegistration = registration
      registration.addEventListener('updatefound', update)
      update()
    }).catch(() => { if (!cancelled) setMessage('Chưa lưu được hướng dẫn ngoại tuyến. Bạn vẫn có thể dùng ứng dụng khi có mạng.') })
    return () => {
      cancelled = true; clearTimeout(timeout.current)
      ownedRegistration?.removeEventListener('updatefound', update)
      for (const worker of watched) worker.removeEventListener('statechange', update)
      navigator.serviceWorker.removeEventListener('message', receive)
      navigator.serviceWorker.removeEventListener('controllerchange', activated)
    }
  }, [])

  if (!waiting && !message) return null
  return <aside data-ui-panel="a1" className="fixed bottom-3 left-1/2 z-[10000] w-[calc(100%_-_2rem)] max-w-[430px] -translate-x-1/2 rounded-2xl border-2 border-[var(--c-blue-dark)] bg-[var(--c-cream)] p-4 font-body text-sm text-[var(--c-blue-dark)] shadow-lg" aria-label="Cập nhật ứng dụng">
    <p role="status">{message || (allowed ? 'Có bản cập nhật EmCoin. Chỉ cập nhật khi các tab đều đã ra khỏi phòng.' : 'Có bản cập nhật EmCoin. Ra khỏi phòng rồi mở trang giới thiệu để cập nhật; ván chơi hiện tại được giữ nguyên.')}</p>
    {waiting && allowed && <button className="mt-3 min-h-11 rounded-full border-2 border-current px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60" disabled={pending} onClick={() => {
      if (!canUpdatePwa(currentPath.current)) return
      requested.current = true; setPending(true); setMessage('Đang kiểm tra các tab trước khi cập nhật…')
      waiting.postMessage({ type: 'EMCOIN_ACTIVATE' })
      timeout.current = setTimeout(() => {
        requested.current = false; setPending(false)
        setMessage('Chưa xác nhận được bản cập nhật. Ứng dụng không tự tải lại; bạn có thể thử lại ngoài phòng.')
      }, 5000)
    }}>{pending ? 'Đang kiểm tra…' : 'Cập nhật và tải lại'}</button>}
  </aside>
}
