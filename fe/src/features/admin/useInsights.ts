import { useEffect, useState } from 'react'
import { insightsClient, type SystemInfo, type TrafficRange, type TrafficReport } from './insightsClient'

export type Loaded<T> = { state: 'loading' } | { state: 'unavailable' } | { state: 'ready'; data: T }

function useLoaded<T>(load: (signal: AbortSignal) => Promise<T>, key: unknown): Loaded<T> {
  const [result, setResult] = useState<{ key: unknown; value: Loaded<T> }>({ key, value: { state: 'loading' } })
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(data => { if (!controller.signal.aborted) setResult({ key, value: { state: 'ready', data } }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, value: { state: 'unavailable' } }) })
    return () => controller.abort()
    // `load` is recreated every render; `key` carries its real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  // A stale answer for another key must not be shown as the current one.
  return result.key === key ? result.value : { state: 'loading' }
}

/** Read-only insight panels own their requests; a failure only empties that panel. */
export const useTraffic = (days: TrafficRange): Loaded<TrafficReport> => useLoaded(signal => insightsClient.traffic(days, signal), days)
export const useSystemInfo = (): Loaded<SystemInfo> => useLoaded(signal => insightsClient.system(signal), 'system')
