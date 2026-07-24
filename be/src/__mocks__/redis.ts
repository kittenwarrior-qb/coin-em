import { vi } from 'vitest'

export const redisAvailable = true

export const redisClient = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  pipeline: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  }),
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
}

export const pubClient = { on: vi.fn(), connect: vi.fn().mockResolvedValue(undefined) }
export const subClient = { on: vi.fn(), connect: vi.fn().mockResolvedValue(undefined) }
export const connectRedis = vi.fn().mockResolvedValue(undefined)
