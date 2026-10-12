import { useEffect, useState, type ReactNode } from 'react'
import { CartoonButton, CartoonScreen } from '@/components/cartoon'
import { RoomCatalogContext as Context, legacyCatalog as legacy, fetchRoomCatalog, type RoomCatalog } from './roomCatalogClient'

export function RoomCatalogBoundary({ version, onLeave, children }: { version?: string; onLeave: () => void; children: ReactNode }) {
  return !version || version === 'web-card-baseline/v1' ? <Context.Provider value={legacy}>{children}</Context.Provider>
    : <PublishedCatalog key={version} version={version} onLeave={onLeave}>{children}</PublishedCatalog>
}
function PublishedCatalog({ version, onLeave, children }: { version: string; onLeave: () => void; children: ReactNode }) {
  const [catalog, setCatalog] = useState<RoomCatalog | null>(null), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetchRoomCatalog(version, controller.signal).then(result => { if (!controller.signal.aborted) setCatalog(result) })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [version, attempt])
  if (catalog) return <Context.Provider value={catalog}>{children}</Context.Provider>
  return <CartoonScreen><section className="m-auto flex max-w-sm flex-col gap-4 p-6 text-center" aria-label="Tải bộ thẻ phòng">
    <p role="status">{failed ? 'Chưa tải được đúng bộ thẻ của phòng. Không thay bằng bộ thẻ khác.' : 'Đang tải bộ thẻ của phòng…'}</p>
    {failed && <CartoonButton onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Thử lại</CartoonButton>}
    <CartoonButton color="white" onClick={onLeave}>Rời phòng</CartoonButton>
  </section></CartoonScreen>
}
