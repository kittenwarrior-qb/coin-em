import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { CardData } from '@/stores/types'

/** Transient preview only; never selects a card or retries a command. */
export function useSituationPreview(scope: string, enabled: boolean, emit: (card: CardData) => void) {
  const owner = useMemo(() => ({ scope, enabled }), [scope, enabled])
  const live = useRef<typeof owner | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const send = useRef(emit)
  useLayoutEffect(() => { send.current = emit })
  useLayoutEffect(() => {
    live.current = owner
    return () => {
      if (live.current === owner) live.current = null
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
    }
  }, [owner])

  return useCallback((card: CardData) => {
    if (!owner.enabled || live.current !== owner) return
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      if (live.current === owner && owner.enabled) send.current(card)
    }, 250)
  }, [owner])
}
