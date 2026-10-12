import { vi } from 'vitest'

export const redisAvailable = true
const transaction = {
  set: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([[null, 'OK'], [null, 1]]),
}

export const redisClient = {
  eval: vi.fn().mockImplementation((script: string, count: number, ...values: any[]) => Promise.resolve(script.includes('-- room-delete/v1') ? [1, ''] : [1, values[count + 3]])),
  multi: vi.fn(() => transaction),
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
