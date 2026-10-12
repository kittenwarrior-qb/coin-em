export function readiness(startupComplete: boolean, primaryRequired: boolean, primaryReady: boolean) {
  const ready = startupComplete && (!primaryRequired || primaryReady)
  return { ready, statusCode: ready ? 200 : 503, body: { status: ready ? 'ok' : 'not_ready' } }
}
