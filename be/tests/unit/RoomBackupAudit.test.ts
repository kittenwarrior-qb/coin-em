import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { createRequire } from 'module'
import { auditBackupDirectory, auditRoomSnapshot, checksum } from '../../src/backup/RoomBackupAudit'
import { allocateCoinRound, collectCoinRound, transferCoin } from '../../src/modules/game/services/CoinCycle'
import { createMockRoom } from '../helpers/mockData'

const { runAuditCli } = createRequire(import.meta.url)('../../scripts/audit-room-backups.cjs') as {
  runAuditCli: (args: string[], audit: typeof auditBackupDirectory, stdout: (value: string) => void, stderr: (value: string) => void) => number
}

const fixtures: string[] = []
const temporaryFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emcoin-backup-audit-'))
  fixtures.push(directory)
  return directory
}
afterEach(() => {
  for (const directory of fixtures.splice(0)) {
    const relative = path.relative(os.tmpdir(), directory)
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(directory).startsWith('emcoin-backup-audit-')) throw new Error('Unsafe fixture cleanup')
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
const allocated = () => {
  const room = createMockRoom(7, { id: 'audit-room', status: 'playing', phase: 'group-response', revision: 4 })
  room.currentNTG = room.players[1].userId
  room.currentNarrator = room.players[0].userId
  return allocateCoinRound(room)
}
const gift = () => {
  const room = allocated()
  const result = transferCoin(room, { type: 'GIVE_COIN', actorId: room.currentNTG!, targetId: room.players[2].userId,
    data: { coinType: 'red', amount: 3, requestId: randomUUID(), round: room.currentRound } })
  expect(result.success).toBe(true)
  return result.room!
}

describe('offline snapshot audit', () => {
  it('classifies intact unversioned legacy snapshots without manufacturing a schema or modifying input', () => {
    const room = createMockRoom(5, { id: 'legacy-room' })
    const before = JSON.stringify(room)
    const result = auditRoomSnapshot(room, room.id)
    expect(result.disposition).toBe('review-required')
    expect(result.warnings).toContain('UNVERSIONED_SNAPSHOT_REQUIRES_MIGRATION_REVIEW')
    expect(JSON.stringify(room)).toBe(before)
    expect(auditRoomSnapshot(room, room.id)).toEqual(result)
  })

  it.each([undefined, null, [], 'not-room', 4])('quarantines nonobjects: %j', value => {
    expect(auditRoomSnapshot(value, 'audit-room').reasons).toContain('SNAPSHOT_NOT_OBJECT')
  })

  it('quarantines partial snapshots, filename mismatch, unknown schema/rules and negative revision', () => {
    expect(auditRoomSnapshot({ id: 'audit-room', players: [] }, 'audit-room').disposition).toBe('quarantine-required')
    const room = { ...createMockRoom(5, { id: 'audit-room' }), schemaVersion: 'future/v9', rulesVersion: 'future/v9', revision: -1 }
    expect(auditRoomSnapshot(room, 'renamed-room').reasons).toEqual(expect.arrayContaining([
      'ROOM_ID_MISMATCH_OR_INVALID', 'UNSUPPORTED_SCHEMA_VERSION', 'UNSUPPORTED_RULES_VERSION', 'INVALID_REVISION',
    ]))
  })

  it('rejects duplicate stable and socket identities rather than assuming an intact roster', () => {
    const room = allocated()
    room.players[2].userId = room.players[1].userId
    room.players[3].socketId = room.players[0].socketId
    expect(auditRoomSnapshot(room, room.id).reasons).toContain('INVALID_PLAYER_OR_DUPLICATE_IDENTITY')
  })

  it('requires session/revocation review and rejects invalid/plaintext credential shape without printing it', () => {
    const room = allocated()
    room.players[0].session = { tokenHash: 'a'.repeat(64), generation: 2 }
    expect(auditRoomSnapshot(room, room.id).warnings).toContain('SESSION_REVOCATION_REVIEW_REQUIRED')
    const value = structuredClone(room) as any
    value.players[0].session.token = 'synthetic-private-bearer'
    const result = auditRoomSnapshot(value, room.id)
    expect(result.reasons).toContain('INVALID_SESSION_SHAPE')
    expect(JSON.stringify(result)).not.toContain('synthetic-private-bearer')
    expect(JSON.stringify(result)).not.toContain('a'.repeat(64))
  })

  it('excludes deleted filename or embedded room identity before proposing any recovery review', () => {
    const deleted = new Set(['audit-room'])
    expect(auditRoomSnapshot(null, 'audit-room', deleted).disposition).toBe('excluded-deleted')
    expect(auditRoomSnapshot(allocated(), 'renamed-room', deleted).disposition).toBe('excluded-deleted')
  })

  it('validates exact allocation/transfer receipts and zero balances after collection', () => {
    for (const room of [allocated(), gift(), collectCoinRound(gift())]) {
      expect(auditRoomSnapshot(room, room.id).disposition).toBe('review-required')
    }
  })

  it.each(['balance', 'receipt', 'reserve', 'duplicate', 'sender', 'history', 'round', 'rules', 'missing'])('rejects inconsistent coin ledger: %s', mutation => {
    const room = gift()
    const cycle = room.coinCycle!
    if (mutation === 'balance') room.players[2].coins.red += 1
    if (mutation === 'receipt') cycle.received[room.players[2].userId].red += 1
    if (mutation === 'reserve') cycle.reserve.green += 1
    if (mutation === 'duplicate') cycle.transfers.push({ ...cycle.transfers[0] })
    if (mutation === 'sender') cycle.transfers[0].from = room.players[0].userId
    if (mutation === 'history') cycle.history.push({ round: cycle.round, received: structuredClone(cycle.received) })
    if (mutation === 'round') cycle.round += 1
    if (mutation === 'rules') delete room.rulesVersion
    if (mutation === 'missing') delete room.coinCycle
    expect(auditRoomSnapshot(room, room.id).reasons).toContain(mutation === 'missing' ? 'MISSING_COIN_LEDGER' : 'INVALID_COIN_LEDGER')
  })

  it('checks completed history matches closed-round receipts and denies terminal reopening shapes', () => {
    const room = collectCoinRound(gift())
    room.coinCycle!.history[0].received[room.players[2].userId].red += 1
    expect(auditRoomSnapshot(room, room.id).reasons).toContain('INVALID_COIN_LEDGER')
    room.status = 'ended'
    expect(auditRoomSnapshot(room, room.id).reasons).toContain('INVALID_LIFECYCLE')
  })
})

describe('read-only backup directory report', () => {
  it('reports corruption, partial and deletion evidence deterministically; leaves source bytes, timestamps and names intact', () => {
    const directory = temporaryFixture()
    const rooms = path.join(directory, 'rooms')
    fs.mkdirSync(rooms)
    const room = allocated()
    room.players[0].name = 'synthetic-private-player-name'
    room.responses[room.players[0].userId] = 'synthetic-private-story'
    room.players[0].session = { tokenHash: 'b'.repeat(64), generation: 1 }
    fs.writeFileSync(path.join(rooms, 'audit-room.json'), JSON.stringify(room))
    fs.writeFileSync(path.join(rooms, 'broken.json'), '{synthetic-corrupt-secret')
    fs.writeFileSync(path.join(rooms, 'partial.json'), JSON.stringify({ id: 'partial', players: [] }))
    fs.writeFileSync(path.join(rooms, 'deleted.json'), '{corrupt-deleted-room')
    fs.writeFileSync(path.join(rooms, 'ignore.txt'), 'not a room')
    const exclusion = path.join(directory, 'deletions.json')
    fs.writeFileSync(exclusion, JSON.stringify(['deleted']))
    const names = fs.readdirSync(rooms)
    const before = names.map(name => ({ name, hash: checksum(fs.readFileSync(path.join(rooms, name))), mtime: fs.statSync(path.join(rooms, name)).mtimeMs }))
    const report = auditBackupDirectory(rooms, exclusion)
    expect(report).toMatchObject({ version: 'room-backup-audit/v1', readOnly: true, restoreAuthorized: false,
      deletionEvidence: 'operator-exclusion-list', summary: { reviewRequired: 1, quarantineRequired: 2, excludedDeleted: 1 } })
    expect(report.exclusionListSha256).toBe(checksum(fs.readFileSync(exclusion)))
    expect(auditBackupDirectory(rooms, exclusion)).toEqual(report)
    expect(fs.readdirSync(rooms)).toEqual(names)
    expect(names.map(name => ({ name, hash: checksum(fs.readFileSync(path.join(rooms, name))), mtime: fs.statSync(path.join(rooms, name)).mtimeMs }))).toEqual(before)
    const serialized = JSON.stringify(report)
    for (const sensitive of [room.id, room.players[0].name, room.players[0].userId, 'synthetic-private-story', 'b'.repeat(64), 'synthetic-corrupt-secret', directory]) {
      expect(serialized).not.toContain(sensitive)
    }
  })

  it('requires explicit directory, strict exclusion format, bounded files, and refuses nested directories as room files', () => {
    const directory = temporaryFixture()
    const exclusion = path.join(directory, 'exclusions.txt')
    fs.writeFileSync(exclusion, '[]')
    expect(() => auditBackupDirectory(exclusion)).toThrow('INPUT_MUST_BE_DIRECT_DIRECTORY')
    for (const invalid of [{ deletedRoomIds: ['room'] }, ['../unsafe'], ['duplicate', 'duplicate'], ['room', 4]]) {
      fs.writeFileSync(exclusion, JSON.stringify(invalid))
      expect(() => auditBackupDirectory(directory, exclusion)).toThrow('INVALID_EXCLUSION_LIST')
    }
    fs.mkdirSync(path.join(directory, 'nested.json'))
    fs.writeFileSync(path.join(directory, 'oversized.json'), Buffer.alloc(4 * 1024 * 1024 + 1))
    const report = auditBackupDirectory(directory)
    expect(report.summary.quarantineRequired).toBe(2)
    expect(report.entries.every(entry => entry.sourceSha256 === undefined)).toBe(true)
  })

  it('handles empty input honestly, without claiming restoration or deletion protection', () => {
    const report = auditBackupDirectory(temporaryFixture())
    expect(report.entries).toEqual([])
    expect(report.deletionEvidence).toBe('not-supplied')
    expect(report.restoreAuthorized).toBe(false)
  })

  it('refuses a directory junction instead of following a redirected backup root', () => {
    const directory = temporaryFixture()
    const actual = path.join(directory, 'actual')
    const link = path.join(directory, 'link')
    fs.mkdirSync(actual)
    fs.symlinkSync(actual, link, process.platform === 'win32' ? 'junction' : 'dir')
    expect(() => auditBackupDirectory(link)).toThrow('INPUT_MUST_BE_DIRECT_DIRECTORY')
  })
})

describe('backup audit CLI contract', () => {
  const invoke = (args: string[]) => {
    let stdout = ''
    let stderr = ''
    const code = runAuditCli(args, auditBackupDirectory, text => { stdout += text }, text => { stderr += text })
    return { code, stdout, stderr }
  }
  it.each([[], ['--restore', 'anything'], ['--input'], ['--input', 'one', '--input', 'two'], ['--exclude-deleted', 'list'], ['--input', 'anything', '--apply', 'true']].map(args => [args]))('rejects missing/duplicate/mutating arguments without loading defaults: %j', args => {
    const result = invoke(args)
    expect(result.code).toBe(2)
    expect(result.stdout).toBe('')
  })
  it('has explicit help and a zero exit code for an empty audited copy', () => {
    expect(invoke(['--help'])).toMatchObject({ code: 0, stderr: '' })
    const result = invoke(['--input', temporaryFixture()])
    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({ readOnly: true, restoreAuthorized: false })
  })
  it('returns 1 for quarantine findings and 2 for fatal input errors without leaking error paths or data', () => {
    const directory = temporaryFixture()
    fs.writeFileSync(path.join(directory, 'bad.json'), '{synthetic-private-broken-payload')
    const result = invoke(['--input', directory])
    expect(result.code).toBe(1)
    expect(JSON.parse(result.stdout).summary.quarantineRequired).toBe(1)
    expect(result.stdout).not.toContain('synthetic-private-broken-payload')
    const fatal = invoke(['--input', path.join(directory, 'secret-nonexistent')])
    expect(fatal.code).toBe(2)
    expect(fatal.stderr).not.toContain(directory)
    expect(fatal.stderr).not.toContain('secret-nonexistent')
  })
})
