import { DatabaseSync } from 'node:sqlite'
import { chmodSync } from 'node:fs'

/** Dedicated persistent hash only. Never stores passwords, sessions or player data. */
export class AdminCredentialStore {
  #db: DatabaseSync
  constructor(file: string, initialHash: string) {
    if (!/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(initialHash)) throw new Error('INVALID_ADMIN_HASH_CONFIG')
    this.#db = new DatabaseSync(file)
    chmodSync(file, 0o600)
    this.#db.exec('PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS credential (id INTEGER PRIMARY KEY CHECK(id=1), hash TEXT NOT NULL)')
    this.#db.prepare('INSERT OR IGNORE INTO credential(id, hash) VALUES(1, ?)').run(initialHash)
  }
  read(): string { return (this.#db.prepare('SELECT hash FROM credential WHERE id=1').get() as { hash: string }).hash }
  save(hash: string): void {
    if (!/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) throw new Error('INVALID_ADMIN_HASH_CONFIG')
    this.#db.prepare('UPDATE credential SET hash=? WHERE id=1').run(hash)
  }
  close(): void { this.#db.close() }
}
