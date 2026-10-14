import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ChatReportStore, type ChatReportInput } from '../../src/communication/ChatReportStore'
import { COMMUNICATION_POLICY } from '../../src/communication/policy'
import { DatabaseSync } from 'node:sqlite'

const now = Date.now()
const evidence = (overrides: Partial<ChatReportInput> = {}): ChatReportInput => ({ requestId: randomUUID(), roomId: 'synthetic-report-room',
  reporterId: 'synthetic-reporter', reason: 'harassment', message: { id: randomUUID(), senderId: 'synthetic-sender', senderName: 'Synthetic sender', text: 'Selected evidence only', sentAt: now }, ...overrides })
describe('selected safety reports, persistent dedup and bounded logical retention', () => {
  const stores: ChatReportStore[] = []
  const store = (file = ':memory:') => { const instance = new ChatReportStore(file); stores.push(instance); return instance }
  afterEach(() => { for (const instance of stores.splice(0)) { try { instance.close() } catch { /* explicitly closed in persistence check */ } } })
  it('stores only the selected incident and excludes caller extra private context', () => {
    const instance = store(), input = evidence()
    Object.assign(input, { fullRoom: { story: 'must-not-store' } }); Object.assign(input.message, { role: 'private-role', session: 'must-not-store' })
    expect(instance.submit(input, now)).toEqual({ success: true, id: input.requestId, replayed: false })
    const listed = instance.list('all', now)
    expect(listed.total).toBe(1); expect(listed.reports[0].message.text).toBe('Selected evidence only')
    for (const secret of ['private-role', 'must-not-store', 'fingerprint', 'incident', 'resolution_id']) expect(JSON.stringify(listed)).not.toContain(secret)
    expect(listed.reports[0].expiresAt).toBe(now + COMMUNICATION_POLICY.reportRetentionMs)
  })
  it('replays exact IDs, deduplicates a new ID for the same reporter/incident and rejects conflicting payloads', () => {
    const instance = store(), input = evidence()
    instance.submit(input, now)
    expect(instance.submit(input, now + 1000).replayed).toBe(true)
    expect(instance.submit({ ...input, requestId: randomUUID(), reason: 'privacy' }, now + 1000)).toEqual({ success: true, id: input.requestId, replayed: true })
    expect(instance.list('all', now).total).toBe(1)
    expect(() => instance.submit({ ...input, reporterId: 'other-reporter' }, now + 1000)).toThrow('REPORT_REQUEST_CONFLICT')
    expect(() => instance.submit({ ...input, reason: 'privacy' }, now + 1000)).toThrow('REPORT_REQUEST_CONFLICT')
  })
  it('persists evidence and receipts through closing/reopening the same owned SQLite file', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'emcoin-chat-report-evidence-'))
    const file = path.join(directory, 'reports.sqlite'), input = evidence(), first = store(file)
    first.submit(input, now); first.close()
    const second = store(file)
    expect(second.submit(input, now + 1000).replayed).toBe(true)
    expect(second.list('open', now + 1000).reports[0].id).toBe(input.requestId)
    // Retain synthetic evidence rather than recursively deleting an unrelated directory.
  })
  it('never extends the seven-day bound through late reporting, retries or resolution', () => {
    const instance = store(), input = evidence(), expires = now + COMMUNICATION_POLICY.reportRetentionMs
    instance.submit(input, expires - 1000)
    instance.resolve(input.requestId, 'resolved', randomUUID(), expires - 500)
    expect(instance.list('all', expires - 1).reports[0].expiresAt).toBe(expires)
    expect(instance.list('all', expires).total).toBe(0)
    expect(() => instance.submit(input, expires)).toThrow('REPORT_EXPIRED')
    expect(() => instance.submit({ ...input, requestId: randomUUID() }, expires + 1)).toThrow('REPORT_EXPIRED')
    expect(instance.list('all', expires + 1).total).toBe(0)
  })
  it('rate limits new incidents but keeps same-incident retries working', () => {
    const instance = store(), first = evidence()
    instance.submit(first, now)
    for (let i = 0; i < 4; i++) instance.submit(evidence(), now)
    expect(() => instance.submit(evidence(), now + 1)).toThrow('REPORT_RATE_LIMITED')
    expect(instance.submit(first, now + 1).replayed).toBe(true)
    expect(instance.submit(evidence(), now + 60_001).success).toBe(true)
  })
  it('bounds total reports and response size; full storage disables publishing readiness', () => {
    const instance = store()
    for (let i = 0; i < 2000; i++) instance.submit(evidence({ reporterId: `synthetic-${i}` }), now)
    expect(instance.list('all', now)).toMatchObject({ total: 2000 })
    expect(instance.list('all', now).reports).toHaveLength(50)
    expect(instance.isAvailable(now)).toBe(false)
    expect(() => instance.submit(evidence({ reporterId: 'overflow' }), now)).toThrow('REPORT_CAPACITY_REACHED')
    expect(instance.isAvailable(now + COMMUNICATION_POLICY.reportRetentionMs)).toBe(true)
  })
  it('resolves once with exact retry and rejects a resolution ID reused for another incident', () => {
    const instance = store(), a = evidence(), b = evidence(), resolution = randomUUID()
    instance.submit(a, now); instance.submit(b, now)
    expect(instance.resolve(a.requestId, 'resolved', resolution, now + 1000)).toEqual({ success: true, replayed: false })
    expect(instance.resolve(a.requestId, 'resolved', resolution, now + 2000)).toEqual({ success: true, replayed: true })
    expect(() => instance.resolve(a.requestId, 'dismissed', resolution, now + 2000)).toThrow('REPORT_STATUS_CONFLICT')
    expect(() => instance.resolve(b.requestId, 'resolved', resolution, now + 2000)).toThrow('REPORT_REQUEST_CONFLICT')
    expect(instance.list('open', now + 2000).total).toBe(1)
    expect(instance.list('resolved', now + 2000).reports[0].resolvedAt).toBe(now + 1000)
  })
  it('refuses invalid resolution/filter values and missing incidents', () => {
    const instance = store()
    expect(() => instance.resolve(randomUUID(), 'resolved', randomUUID(), now)).toThrow('REPORT_NOT_FOUND')
    expect(() => instance.resolve('bad', 'open', 'bad', now)).toThrow('INVALID_REPORT_RESOLUTION')
    expect(() => instance.list('secret' as 'open', now)).toThrow('INVALID_REPORT_STATUS')
  })
  it.each([null, '', 'x'.repeat(501), 'bad\u0000text'])('rejects invalid selected evidence text %j', text => {
    const instance = store(), input = evidence(); Object.assign(input.message, { text })
    expect(() => instance.submit(input, now)).toThrow('INVALID_CHAT_REPORT')
    expect(instance.list('all', now).total).toBe(0)
  })
  it.each([NaN, Infinity, -1, Number.MAX_SAFE_INTEGER])('rejects invalid clock %s', time => {
    expect(() => store().submit(evidence(), time)).toThrow('INVALID_CHAT_REPORT')
  })
  it('fails availability closed after storage is closed', () => {
    const instance = store(); instance.close(); expect(instance.isAvailable(now)).toBe(false)
  })
  it('refuses unknown schema rather than silently modifying an unrelated database', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'emcoin-chat-report-schema-')), file = path.join(directory, 'unknown.sqlite')
    const database = new DatabaseSync(file)
    database.exec('CREATE TABLE unrelated (value TEXT); INSERT INTO unrelated VALUES (\'synthetic-preserved\')')
    expect(() => new ChatReportStore(file)).toThrow('CHAT_REPORT_SCHEMA_MISMATCH')
    expect(database.prepare("SELECT count(*) AS total FROM sqlite_master WHERE name='chat_report'").get()!.total).toBe(0)
    expect(database.prepare('SELECT value FROM unrelated').get()!.value).toBe('synthetic-preserved')
    database.close()
  })
})
