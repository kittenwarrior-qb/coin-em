import { beforeAll, describe, expect, it } from 'vitest'
import { ADMIN_EMAIL, ADMIN_SESSION_MS, AdminAuth, hashAdminPassword } from '../../src/admin/AdminAuth'

// Synthetic only. No real owner/Gmail/VPS credential is used or provisioned.
const password = 'synthetic-admin-fixture-only'
let hash: string
beforeAll(async () => { hash = await hashAdminPassword(password) })

describe('owner-approved separate email/password admin foundation', () => {
  it('fails closed when not provisioned and rejects malformed hash configuration', async () => {
    const auth = new AdminAuth()
    expect(await auth.login(ADMIN_EMAIL, password)).toEqual({ ok: false, error: 'AUTH_UNAVAILABLE' })
    expect(auth.authenticate('a'.repeat(64))).toBe(false)
    expect(() => new AdminAuth('plaintext-is-not-a-hash')).toThrow('INVALID_ADMIN_HASH_CONFIG')
  })

  it('uses salted hashes, never plaintext or an unsalted fast password digest', async () => {
    expect(hash).toMatch(/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/)
    expect(hash).not.toContain(password)
    expect(await hashAdminPassword(password)).not.toBe(hash)
    await expect(hashAdminPassword('short')).rejects.toThrow('INVALID_ADMIN_PASSWORD_LENGTH')
    await expect(hashAdminPassword('x'.repeat(1025))).rejects.toThrow('INVALID_ADMIN_PASSWORD_LENGTH')
  })

  it('returns the same credential error for wrong account and wrong password', async () => {
    const auth = new AdminAuth(hash)
    expect(await auth.login('outsider@example.test', password)).toEqual({ ok: false, error: 'INVALID_CREDENTIALS' })
    expect(await auth.login(ADMIN_EMAIL, 'incorrect-fixture')).toEqual({ ok: false, error: 'INVALID_CREDENTIALS' })
  })

  it('issues a random token, revokes the earlier login and does not serialize secrets', async () => {
    const auth = new AdminAuth(hash)
    const first = await auth.login(ADMIN_EMAIL, password)
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error('Fixture login failed')
    expect(first.token).toMatch(/^[a-f0-9]{64}$/)
    expect(first.expiresInMs).toBe(ADMIN_SESSION_MS)
    expect(auth.authenticate(first.token)).toBe(true)
    expect(auth.authenticate('0'.repeat(64))).toBe(false)
    expect(auth.authenticate({ token: first.token })).toBe(false)
    const second = await auth.login(ADMIN_EMAIL.toUpperCase(), password)
    if (!second.ok) throw new Error('Fixture relogin failed')
    expect(second.token).not.toBe(first.token)
    expect(auth.authenticate(first.token)).toBe(false)
    expect(auth.authenticate(second.token)).toBe(true)
    expect(JSON.stringify(auth)).toBe('{}')
    expect(new AdminAuth(hash).authenticate(second.token)).toBe(false)
  })

  it('expires exactly at the monotonic deadline and logout revokes only the valid session', async () => {
    let now = 0
    const auth = new AdminAuth(hash, () => now)
    const login = await auth.login(ADMIN_EMAIL, password)
    if (!login.ok) throw new Error('Fixture login failed')
    now = ADMIN_SESSION_MS - 1
    expect(auth.authenticate(login.token)).toBe(true)
    expect(auth.logout('0'.repeat(64))).toBe(false)
    expect(auth.authenticate(login.token)).toBe(true)
    now++
    expect(auth.authenticate(login.token)).toBe(false)
    const next = await auth.login(ADMIN_EMAIL, password)
    if (!next.ok) throw new Error('Fixture relogin failed')
    expect(auth.logout(next.token)).toBe(true)
    expect(auth.authenticate(next.token)).toBe(false)
  })

  it('allows at most one expensive verification at a time', async () => {
    const auth = new AdminAuth(hash)
    const pending = auth.login(ADMIN_EMAIL, password)
    expect(await auth.login(ADMIN_EMAIL, password)).toEqual({ ok: false, error: 'RATE_LIMITED' })
    expect((await pending).ok).toBe(true)
  })

  it('caps attempts in fixed space and admits new attempts after the window', async () => {
    let now = 0
    const auth = new AdminAuth(hash, () => now)
    for (let i = 0; i < 5; i++) expect(await auth.login(null, null)).toEqual({ ok: false, error: 'INVALID_CREDENTIALS' })
    expect(await auth.login(ADMIN_EMAIL, password)).toEqual({ ok: false, error: 'RATE_LIMITED' })
    now = 60_000
    expect((await auth.login(ADMIN_EMAIL, password)).ok).toBe(true)
  })
})
