import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { createServer, get, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { registerSafeHttpErrors } from '../../src/telemetry/safeHttpErrors'

describe('actual loopback generic HTTP error redaction', () => {
  let server: Server
  let base: string
  beforeEach(async () => {
    vi.restoreAllMocks()
    const app = express()
    app.use(express.json({ limit: '1kb' }))
    app.post('/synthetic', (_request, response) => response.json({ success: true }))
    app.get('/private-error', (_request, _response, next) => next(new Error('synthetic-secret-body-token')))
    app.get('/partial-error', (_request, response, next) => {
      response.write('public-prefix')
      next(new Error('synthetic-secret-body-token'))
    })
    registerSafeHttpErrors(app)
    server = createServer(app)
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterEach(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  })
  it('returns fixed no-store JSON for malformed and oversized private bodies', async () => {
    for (const [body, status] of [['{"story":"synthetic-secret-body-token"', 400],
      [JSON.stringify({ story: 'synthetic-secret-body-token'.repeat(100) }), 413]] as const) {
      const response = await fetch(`${base}/synthetic`, { method: 'POST',
        headers: { 'content-type': 'application/json' }, body })
      expect(response.status).toBe(status)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toEqual({ error: 'INVALID_REQUEST' })
    }
  })
  it('does not expose internal exception text/stack through HTTP or diagnostic logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await fetch(`${base}/private-error`)
    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'INTERNAL_ERROR' })
    expect(log).toHaveBeenCalledExactlyOnceWith(
      '{"version":"operation-diagnostic/v1","event":"http_request","outcome":"failed"}')
    expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-secret-body-token')
  })
  it('terminates a partial response without appending an internal stack or calling finalhandler', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const partialRequest = new Promise<string>((resolve, reject) => {
      // One request only: fetch may automatically retry an interrupted GET.
      get(`${base}/partial-error`, response => {
        let body = ''
        response.on('data', chunk => { body += chunk.toString() })
        response.once('end', () => resolve(body))
        response.once('error', reject)
        response.once('aborted', () => reject(new Error('synthetic response aborted')))
      }).once('error', reject)
    })
    await expect(partialRequest).rejects.toThrow()
    expect(log).toHaveBeenCalledExactlyOnceWith(
      '{"version":"operation-diagnostic/v1","event":"http_request","outcome":"failed"}')
    expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-secret-body-token')
  })
  it('preserves valid requests and responses', async () => {
    const response = await fetch(`${base}/synthetic`, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: '{"story":"synthetic-private-valid"}' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })
})
