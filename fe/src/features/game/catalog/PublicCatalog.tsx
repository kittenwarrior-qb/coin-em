import { useEffect, useState, type ReactNode } from 'react'
import { CartoonButton, CartoonModal, CartoonScreen } from '@/components/cartoon'
import { fetchPublicCatalog, RoomCatalogContext, type RoomCatalog } from './roomCatalogClient'

/** Public browsing follows a fresh active pointer. RoomCatalogBoundary never calls this API. */
export function PublicCatalogBoundary({ children, onClose, presentation = 'page', closeLabel = 'Về giới thiệu' }: {
  children: ReactNode; onClose: () => void; presentation?: 'page' | 'overlay' | 'inline'; closeLabel?: string
}) {
  const [catalog, setCatalog] = useState<RoomCatalog | null>(null)
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetchPublicCatalog(controller.signal).then(result => { if (!controller.signal.aborted) setCatalog(result) })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [attempt])
  if (catalog) return <RoomCatalogContext.Provider value={catalog}>{children}</RoomCatalogContext.Provider>
  const content = <section className="mx-auto flex w-full max-w-sm flex-col gap-4 p-5 text-center" aria-label="Tải bộ thẻ công khai">
    <p role="status">{failed ? 'Chưa tải được bộ thẻ đang phát hành. Thử lại để xem đúng phiên bản.' : 'Đang tải bộ thẻ đang phát hành…'}</p>
    {failed && <CartoonButton onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Thử lại</CartoonButton>}
    <CartoonButton color="white" onClick={onClose}>{closeLabel}</CartoonButton>
  </section>
  if (presentation === 'overlay') return <CartoonModal open title="Bộ thẻ" onClose={onClose}>{content}</CartoonModal>
  if (presentation === 'inline') return content
  return <CartoonScreen>{content}</CartoonScreen>
}
