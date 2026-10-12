import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import { createServer, Server } from 'http'
import type { AddressInfo } from 'net'
import { registerPublicDiagnostics } from '../../src/publicDiagnostics'
import { createMockRoom } from '../helpers/mockData'

describe('production diagnostics registrar on isolated HTTP loopback', () => {
  let server: Server
  let url: string
  let started: boolean
  let primaryReady: boolean
  const room = createMockRoom(5, { id: 'private-room-code' })
  beforeEach(async () => {
    started = true
    primaryReady = true
    const app = express()
    registerPublicDiagnostics(app, { rooms: () => [room], startupComplete: () => started,
      primaryRequired: true, redisAvailable: () => primaryReady, uptime: () => 42 })
    server = createServer(app)
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterEach(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  })
  it('publishes exact aggregate metrics without a room-code side channel and disables caching', async () => {
    const response = await fetch(`${url}/metrics`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ rooms: 1, players: 5,
      roomsByStatus: { waiting: 1, playing: 0, ended: 0 }, uptime: 42, redis: true })
  })
  it.each(['startup', 'primary'])('returns unavailable health when %s fails, without hiding the failure in metrics', async failure => {
    if (failure === 'startup') started = false
    if (failure === 'primary') primaryReady = false
    const response = await fetch(`${url}/health`)
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = JSON.stringify(await response.json())
    expect(body).not.toContain(room.id)
    const metrics = await (await fetch(`${url}/metrics`)).json() as { redis: boolean }
    expect(metrics.redis).toBe(primaryReady)
  })
  it('returns healthy only after startup and primary are ready', async () => {
    expect((await fetch(`${url}/health`)).status).toBe(200)
  })
})
