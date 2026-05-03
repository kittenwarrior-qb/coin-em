import Redis from 'ioredis'

const REDIS_HOST = process.env.REDIS_HOST || 'redis'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')

function createRedisClient(name: string): Redis {
  const client = new Redis({ host: REDIS_HOST, port: REDIS_PORT, lazyConnect: true })

  client.on('connect', () => console.log(`[Redis:${name}] Connected`))
  client.on('error', (err) => console.error(`[Redis:${name}] Error:`, err.message))

  return client
}

// pub/sub pair for Socket.IO adapter
export const pubClient = createRedisClient('pub')
export const subClient = createRedisClient('sub')

// general client for RoomRepository
export const redisClient = createRedisClient('main')

export async function connectRedis(): Promise<void> {
  await Promise.all([pubClient.connect(), subClient.connect(), redisClient.connect()])
}
