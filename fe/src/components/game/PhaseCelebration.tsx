/**
 * Center-screen celebration that plays the handshake-confetti Rive animation
 * when a game phase is completed. Rendered inside #game-panel so it is centered
 * on the gameplay screen, and is pointer-events-none so it never blocks input.
 *
 * Trigger it by changing `runId` to a new number — each change replays the
 * animation from the start, then it auto-hides after `durationMs`.
 */
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas'

const RIVE_SRC = '/rive/handshake-confetti.riv'
const STATE_MACHINE = 'State Machine 1'

function CelebrationCanvas() {
  const { RiveComponent } = useRive({
    src: RIVE_SRC,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })
  return <RiveComponent className="h-full w-full" />
}

interface PhaseCelebrationProps {
  /** Change this to a new number to fire the celebration. 0 = idle (nothing shown). */
  runId: number
  /** How long the overlay stays on screen, in ms. Tune to the Rive clip length. */
  durationMs?: number
}

export function PhaseCelebration({ runId, durationMs = 2800 }: PhaseCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()
  const skippedRun = useRef<number | null>(null)
  const activeDeadline = useRef<{ runId: number; expires: number } | null>(null)

  useEffect(() => {
    if (!runId || reducedMotion || document.hidden) { skippedRun.current = runId; setVisible(false); return }
    if (skippedRun.current === runId) return
    // One deadline per burst. Reconfiguration/StrictMode may rearm its remaining
    // time, but must not extend it or replay an already completed run.
    const now = performance.now()
    if (activeDeadline.current?.runId !== runId) {
      activeDeadline.current = { runId, expires: now + Math.max(0, durationMs) }
    }
    const remaining = activeDeadline.current.expires - now
    if (remaining <= 0) { skippedRun.current = runId; setVisible(false); return }
    setVisible(true)
    const timer = window.setTimeout(() => { skippedRun.current = runId; setVisible(false) }, remaining)
    const onVisibility = () => {
      if (document.hidden) { skippedRun.current = runId; window.clearTimeout(timer); setVisible(false) }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [runId, durationMs, reducedMotion])

  if (!visible) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] grid place-items-center" aria-hidden>
      {/* key={runId} forces a fresh mount each trigger so the clip replays from frame 0 */}
      <CelebrationCanvas key={runId} />
    </div>
  )
}
