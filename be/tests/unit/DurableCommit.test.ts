import { describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import { RoomRepository } from '../../src/modules/room/repository/RoomRepository'
import { redisClient } from '../../src/redis'
import { createMockRoom } from '../helpers/mockData'

describe('awaited room commits', () => {
  it('does not publish a failed primary transaction into cache', async () => {
    const repository = new RoomRepository()
    const room = createMockRoom(5, { id: 'failed-commit' })
    vi.mocked(redisClient.eval).mockRejectedValueOnce(new Error('fixture redis unavailable'))
    await expect(repository.saveAndWait(room)).rejects.toThrow('fixture redis unavailable')
    expect(repository.findById(room.id)).toBeNull()
    await repository.saveAndWait(room)
    expect(repository.findById(room.id)).toEqual(room)
  })
  it('rejects stale revision results rather than acknowledging them', async () => {
    const repository = new RoomRepository()
    vi.mocked(redisClient.eval).mockResolvedValueOnce([0, 3])
    await expect(repository.saveAndWait(createMockRoom(5, { id: 'partial-commit' }))).rejects.toThrow('ROOM_REVISION_CONFLICT')
    expect(repository.count()).toBe(0)
  })
  it('retains a committed primary snapshot when its secondary JSON backup fails', async () => {
    const repository = new RoomRepository()
    const room = createMockRoom(5, { id: 'backup-degraded' })
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => { throw new Error('fixture disk full') })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(repository.saveAndWait(room)).resolves.toBeUndefined()
    expect(repository.findById(room.id)).toEqual(room)
    expect(log).toHaveBeenCalledWith(JSON.stringify({ version: 'operation-diagnostic/v1', event: 'room_commit', outcome: 'degraded' }))
    expect(JSON.stringify(log.mock.calls)).not.toContain('fixture disk full')
    expect(JSON.stringify(log.mock.calls)).not.toContain(room.id)
    write.mockRestore()
    log.mockRestore()
  })
  it('serializes old background writes before a newer awaited snapshot', async () => {
    const repository = new RoomRepository()
    const room = createMockRoom(5, { id: 'ordered-commit' })
    let finishFirst!: (value: any) => void
    vi.mocked(redisClient.eval).mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    repository.save(room)
    const newer = { ...room, currentRound: 2 }
    const commit = repository.saveAndWait(newer)
    await Promise.resolve()
    await Promise.resolve()
    expect(finishFirst).toBeTypeOf('function')
    finishFirst([1, 0])
    await commit
    expect(repository.findById(room.id)?.currentRound).toBe(2)
  })
})
