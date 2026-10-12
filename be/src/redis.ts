import Redis from 'ioredis'
import { operationDiagnostic } from './telemetry/operationalDiagnostics'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')

// Whether Redis is available — set to false if connection fails at startup
export let redisAvailable = false

function createRedisClient(name: string): Redis {
  const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    lazyConnect: true,
    // Don't auto-retry forever — fail fast so server can start without Redis
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  })

  client.on('connect', () => operationDiagnostic('redis_connection', 'ok'))
  client.on('ready', () => {
    redisAvailable = [pubClient, subClient, redisClient].every(connection => connection.status === 'ready')
  })
  client.on('close', () => { redisAvailable = false })
  client.on('error', () => operationDiagnostic('redis_connection', 'failed'))

  return client
}

// pub/sub pair for Socket.IO adapter
export const pubClient = createRedisClient('pub')
export const subClient = createRedisClient('sub')

// general client for RoomRepository
export const redisClient = createRedisClient('main')

export async function connectRedis(): Promise<boolean> {
  try {
    await Promise.all([pubClient.connect(), subClient.connect(), redisClient.connect()])
    redisAvailable = true
    return true
  } catch (err: any) {
    operationDiagnostic('redis_connection', 'failed')
    redisAvailable = false
    return false
  }
}
