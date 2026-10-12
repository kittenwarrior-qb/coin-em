import { useCallback, useLayoutEffect, useRef, useState } from 'react'

type Intent = { scope: string }

/** Owns local pending only. Transport owns ACK/projection/uncertain recovery. */
export function useConfirmedAction(scope: string, enabled: boolean) {
  const committed = useRef({ scope, enabled })
  const intent = useRef<Intent | null>(null)
  const mounted = useRef(false)
  const [active, setActive] = useState<Intent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; intent.current = null }
  }, [])

  useLayoutEffect(() => {
    if (committed.current.scope !== scope || !enabled) {
      intent.current = null
      setActive(null)
      setError(null)
    }
    committed.current = { scope, enabled }
  }, [scope, enabled])

  const run = useCallback(async (send: (isCurrent: () => boolean) => Promise<boolean> | void): Promise<boolean> => {
    if (!mounted.current || !committed.current.enabled || intent.current) return false
    const owner = { scope: committed.current.scope }
    intent.current = owner
    setActive(owner)
    setError(null)
    const ownsCurrent = () => mounted.current && intent.current === owner && committed.current.scope === owner.scope
    try {
      const result = await send(() => ownsCurrent() && committed.current.enabled)
      return ownsCurrent() && committed.current.enabled && result === true
    } catch {
      if (ownsCurrent()) setError('Chưa xác nhận được thao tác. Trạng thái đã xác nhận vẫn được giữ; không tự gửi lại.')
      return false
    } finally {
      if (ownsCurrent()) { intent.current = null; setActive(null) }
    }
  }, [])

  const isCurrent = () => mounted.current && committed.current.scope === scope && committed.current.enabled
  return { pending: active?.scope === scope, run, error, isCurrent }
}
