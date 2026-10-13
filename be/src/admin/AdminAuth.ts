import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { performance } from 'node:perf_hooks'

export const ADMIN_EMAIL = 'emcoincloud@gmail.com'
export const ADMIN_SESSION_MS = 30 * 60 * 1000
const HASH_FORMAT = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/
const digestToken = (token: string) => createHash('sha256').update(token).digest()

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64,
    { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
    (error, key) => error ? reject(error) : resolve(key)))
}

/** Provision offline through an owner-controlled secret, never a Gmail password. */
export async function hashAdminPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length < 15 || Buffer.byteLength(password, 'utf8') > 1024) {
    throw new Error('INVALID_ADMIN_PASSWORD_LENGTH')
  }
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return `scrypt-v1$${salt.toString('hex')}$${key.toString('hex')}`
}

type LoginResult = { ok: true; token: string; expiresInMs: number } |
  { ok: false; error: 'AUTH_UNAVAILABLE' | 'INVALID_CREDENTIALS' | 'RATE_LIMITED' }

/** Single-process foundation only; no public route, cookie or distributed claim. */
export class AdminAuth {
  #record: { salt: Buffer; key: Buffer } | null
  #session: { digest: Buffer; expiresAt: number } | null = null
  #busy = false
  #windowStart: number
  #attempts = 0
  #now: () => number

  constructor(passwordHash?: string, now: () => number = () => performance.now(), private persist?: (hash: string) => void) {
    this.#now = now
    this.#windowStart = now()
    if (!passwordHash) { this.#record = null; return }
    const match = HASH_FORMAT.exec(passwordHash)
    if (!match) throw new Error('INVALID_ADMIN_HASH_CONFIG')
    this.#record = { salt: Buffer.from(match[1], 'hex'), key: Buffer.from(match[2], 'hex') }
  }

  async login(email: unknown, password: unknown): Promise<LoginResult> {
    if (!this.#record) return { ok: false, error: 'AUTH_UNAVAILABLE' }
    const now = this.#now()
    if (now - this.#windowStart >= 60_000) { this.#windowStart = now; this.#attempts = 0 }
    // Process-wide cap is intentionally fixed-space and has no IP/identity map.
    if (this.#busy || this.#attempts >= 5) return { ok: false, error: 'RATE_LIMITED' }
    this.#attempts++
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' ||
        password.length === 0 || Buffer.byteLength(password, 'utf8') > 1024) {
      return { ok: false, error: 'INVALID_CREDENTIALS' }
    }
    this.#busy = true
    try {
      // Wrong email still performs the same KDF; no early account-existence branch.
      const key = await derive(password, this.#record.salt)
      const matches = timingSafeEqual(key, this.#record.key)
      key.fill(0)
      if (!matches || email.trim().toLowerCase() !== ADMIN_EMAIL) return { ok: false, error: 'INVALID_CREDENTIALS' }
      const token = randomBytes(32).toString('hex')
      this.#session = { digest: digestToken(token), expiresAt: this.#now() + ADMIN_SESSION_MS }
      return { ok: true, token, expiresInMs: ADMIN_SESSION_MS }
    } catch {
      return { ok: false, error: 'AUTH_UNAVAILABLE' }
    } finally { this.#busy = false }
  }

  authenticate(token: unknown): boolean {
    if (!this.#session) return false
    if (this.#now() >= this.#session.expiresAt) { this.#session = null; return false }
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false
    return timingSafeEqual(digestToken(token), this.#session.digest)
  }

  async changePassword(token: unknown, current: unknown, next: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.authenticate(token)) return { ok: false, error: 'ADMIN_AUTH_REQUIRED' }
    if (!this.#record || !this.persist) return { ok: false, error: 'AUTH_UNAVAILABLE' }
    if (this.#now() - this.#windowStart >= 60_000) { this.#windowStart = this.#now(); this.#attempts = 0 }
    if (this.#busy || this.#attempts >= 5) return { ok: false, error: 'RATE_LIMITED' }
    this.#attempts++
    if (typeof current !== 'string' || !current || Buffer.byteLength(current) > 1024 ||
        typeof next !== 'string' || next.length < 15 || Buffer.byteLength(next) > 1024 || current === next) {
      return { ok: false, error: 'INVALID_PASSWORD_REQUEST' }
    }
    this.#busy = true
    try {
      const key = await derive(current, this.#record.salt)
      const matches = timingSafeEqual(key, this.#record.key); key.fill(0)
      if (!matches) return { ok: false, error: 'INVALID_CURRENT_PASSWORD' }
      const hash = await hashAdminPassword(next)
      // Logout, expiry or replacement while KDF runs must cancel the mutation.
      if (!this.authenticate(token)) return { ok: false, error: 'ADMIN_AUTH_REQUIRED' }
      this.persist(hash)
      const match = HASH_FORMAT.exec(hash)!
      this.#record = { salt: Buffer.from(match[1], 'hex'), key: Buffer.from(match[2], 'hex') }
      this.#session = null
      return { ok: true }
    } catch { return { ok: false, error: 'AUTH_UNAVAILABLE' } }
    finally { this.#busy = false }
  }

  logout(token: unknown): boolean {
    if (!this.authenticate(token)) return false
    this.#session = null
    return true
  }
}
