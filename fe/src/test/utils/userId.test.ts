import { describe, it, expect, beforeEach } from 'vitest'
import { getUserId, clearUserId } from '../../utils/userId'

describe('getUserId', () => {
  beforeEach(() => {
    clearUserId()
  })

  it('generates a userId when none exists', () => {
    const id = getUserId()
    expect(id).toBeTruthy()
    expect(id.startsWith('user_')).toBe(true)
  })

  it('returns the same userId on subsequent calls', () => {
    const id1 = getUserId()
    const id2 = getUserId()
    expect(id1).toBe(id2)
  })

  it('generates a new userId after clearUserId', () => {
    const id1 = getUserId()
    clearUserId()
    const id2 = getUserId()
    expect(id1).not.toBe(id2)
  })
})
