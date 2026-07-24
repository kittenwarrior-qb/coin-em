import Redis from 'ioredis'

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

  client.on('connect', () => console.log(`[Redis:${name}] Connected`))
  client.on('error', (err) => console.error(`[Redis:${name}] Error:`, err.message))

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
    console.warn(`[Redis] Connection failed: ${err.message}`)
    console.warn('[Redis] Running without Redis — single-instance mode, no persistence to Redis')
    redisAvailable = false
    return false
  }
}
