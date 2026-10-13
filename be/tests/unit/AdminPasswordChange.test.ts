import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { AdminCredentialStore } from '../../src/admin/AdminCredentialStore'
import { AdminAuth, ADMIN_EMAIL, hashAdminPassword } from '../../src/admin/AdminAuth'

const old = 'synthetic-old-password-only', next = 'synthetic-new-password-only'
let hash: string
const directories: string[] = []
beforeAll(async () => { hash = await hashAdminPassword(old) })
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true }) })
async function admit(auth: AdminAuth) {
  const login = await auth.login(ADMIN_EMAIL, old)
  if (!login.ok) throw new Error('Synthetic login failed')
  return login.token
}
describe('durable admin password rotation', () => {
  it('persists a hash, revokes the session, rejects the old password after restart and ignores stale bootstrap', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'emcoin-auth-test-')); directories.push(dir)
    const file = path.join(dir, 'auth.sqlite')
    const store = new AdminCredentialStore(file, hash)
    const auth = new AdminAuth(store.read(), undefined, value => store.save(value))
    const token = await admit(auth)
    expect(await auth.changePassword(token, old, next)).toEqual({ ok: true })
    expect(auth.authenticate(token)).toBe(false)
    expect(store.read()).not.toContain(next)
    store.close()
    const restarted = new AdminCredentialStore(file, hash)
    try {
      const fresh = new AdminAuth(restarted.read())
      expect(await fresh.login(ADMIN_EMAIL, old)).toMatchObject({ ok: false })
      expect(await fresh.login(ADMIN_EMAIL, next)).toMatchObject({ ok: true })
    } finally { restarted.close() }
  })
  it('fails closed on disk failure, invalid passwords and unauthorized requests', async () => {
    const persist = vi.fn(() => { throw new Error('synthetic-disk-failure') })
    const auth = new AdminAuth(hash, undefined, persist)
    const token = await admit(auth)
    expect(await auth.changePassword('invalid', old, next)).toMatchObject({ error: 'ADMIN_AUTH_REQUIRED' })
    expect(await auth.changePassword(token, old, 'short')).toMatchObject({ error: 'INVALID_PASSWORD_REQUEST' })
    expect(await auth.changePassword(token, 'wrong', next)).toMatchObject({ error: 'INVALID_CURRENT_PASSWORD' })
    expect(await auth.changePassword(token, old, next)).toMatchObject({ error: 'AUTH_UNAVAILABLE' })
    expect(auth.authenticate(token)).toBe(true)
    expect(await auth.login(ADMIN_EMAIL, old)).toMatchObject({ ok: true })
  })
  it('cancels a rotation if logout wins while hashing and caps concurrent KDF work', async () => {
    const persist = vi.fn()
    const auth = new AdminAuth(hash, undefined, persist)
    const token = await admit(auth)
    const changing = auth.changePassword(token, old, next)
    expect(await auth.changePassword(token, old, next)).toMatchObject({ error: 'RATE_LIMITED' })
    auth.logout(token)
    expect(await changing).toMatchObject({ error: 'ADMIN_AUTH_REQUIRED' })
    expect(persist).not.toHaveBeenCalled()
  })
})
