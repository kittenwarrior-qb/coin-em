import { afterEach, describe, expect, it, vi } from 'vitest'
import { readiness } from '../../src/readiness'
import { RoomRepository } from '../../src/modules/room/repository/RoomRepository'
import { redisClient } from '../../src/redis'

describe('primary-store readiness and recovery', () => {
  afterEach(() => vi.unstubAllEnvs())
  it.each([
    [false, true, true, 503], [true, true, false, 503], [true, true, true, 200], [true, false, false, 200],
  ])('reports startup=%s required=%s primary=%s as %s', (started, required, ready, status) => {
    expect(readiness(started as boolean, required as boolean, ready as boolean).statusCode).toBe(status)
  })
  it('refuses an incomplete primary recovery instead of publishing partial state', async () => {
    vi.stubEnv('ROOM_STORAGE_MODE', 'redis-required')
    vi.mocked(redisClient.smembers).mockResolvedValueOnce(['missing-room'])
    vi.mocked(redisClient.pipeline().exec).mockResolvedValueOnce([])
    const repository = new RoomRepository()
    await expect(repository.loadFromRedis()).rejects.toThrow('INCOMPLETE_ROOM_RECOVERY')
    expect(repository.count()).toBe(0)
  })
  it('does not silently drop corrupt primary rooms or delete their index entry', async () => {
    vi.stubEnv('ROOM_STORAGE_MODE', 'redis-required')
    vi.mocked(redisClient.smembers).mockResolvedValueOnce(['corrupt-room'])
    vi.mocked(redisClient.pipeline().exec).mockResolvedValueOnce([[null, '{broken']])
    const removals = vi.mocked(redisClient.srem).mock.calls.length
    const repository = new RoomRepository()
    await expect(repository.loadFromRedis()).rejects.toThrow('OPERATOR_REVIEW')
    expect(repository.count()).toBe(0)
    expect(vi.mocked(redisClient.srem).mock.calls.length).toBe(removals)
  })
})
