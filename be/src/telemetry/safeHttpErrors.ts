import type { Express, ErrorRequestHandler } from 'express'
import { operationDiagnostic } from './operationalDiagnostics'

/** Must follow route/parser registrars; never echo body, parser message or stack. */
export function registerSafeHttpErrors(app: Express): void {
  const handle: ErrorRequestHandler = (error, _request, response, _next) => {
    if (response.headersSent) {
      operationDiagnostic('http_request', 'failed')
      response.destroy()
      return
    }
    const status = error?.type === 'entity.parse.failed' && error?.status === 400 ? 400 :
      error?.type === 'entity.too.large' && error?.status === 413 ? 413 : 500
    operationDiagnostic('http_request', status === 500 ? 'failed' : 'rejected')
    response.setHeader('Cache-Control', 'no-store')
    response.status(status).json({ error: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST' })
  }
  app.use(handle)
}
