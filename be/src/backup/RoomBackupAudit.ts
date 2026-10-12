import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PHASE_ORDER } from '../modules/game/engine/PhaseRegistry'

/** Offline diagnostics only. Never import persistence, Redis or a runtime repository here. */
type ObjectValue = Record<string, unknown>
type Balance = Record<'red' | 'green' | 'yellow', number>
const colors = ['red', 'green', 'yellow'] as const
const roomIdPattern = /^[A-Za-z0-9_-]{1,64}$/
const maxBytes = 4 * 1024 * 1024
const maxFiles = 1000
const object = (value: unknown): value is ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value)
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0
const balance = (value: unknown): value is Balance => object(value) && colors.every(color => integer(value[color]))
export const checksum = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex')

export interface SnapshotAudit {
  disposition: 'review-required' | 'quarantine-required' | 'excluded-deleted'
  reasons: string[]
  warnings: string[]
}
export interface BackupAuditReport {
  version: 'room-backup-audit/v1'
  readOnly: true
  restoreAuthorized: false
  deletionEvidence: 'not-supplied' | 'operator-exclusion-list'
  exclusionListSha256?: string
  entries: Array<SnapshotAudit & { ordinal: number; sourceSha256?: string; bytes?: number }>
  summary: { reviewRequired: number; quarantineRequired: number; excludedDeleted: number }
}

function validReceipts(value: unknown, ids: Set<string>): value is Record<string, Balance> {
  return object(value) && Object.keys(value).length === ids.size &&
    Object.entries(value).every(([id, coins]) => ids.has(id) && balance(coins) && colors.every(color => coins[color] <= 20))
}

function validCoinCycle(room: ObjectValue, players: ObjectValue[], ids: Set<string>): boolean {
  const cycle = room.coinCycle
  if (!object(cycle) || cycle.version !== 'coin-cycle-60/v1' || cycle.round !== room.currentRound ||
      typeof cycle.closed !== 'boolean' || !balance(cycle.reserve) || !validReceipts(cycle.received, ids) ||
      !Array.isArray(cycle.transfers) || !Array.isArray(cycle.history) || !ids.has(room.currentNTG as string) || ids.size < 2) return false
  const receipts = Object.fromEntries([...ids].map(id => [id, { red: 0, green: 0, yellow: 0 }])) as Record<string, Balance>
  const spent = structuredClone(receipts)
  const requestIds = new Set<string>()
  const share = Math.floor(20 / (ids.size - 1))
  if (cycle.reserve.red !== 0 || cycle.reserve.green !== 20 - share * (ids.size - 1) || cycle.reserve.yellow !== cycle.reserve.green) return false
  for (const transfer of cycle.transfers) {
    if (!object(transfer) || typeof transfer.id !== 'string' || !transfer.id.length || transfer.id.length > 128 ||
        requestIds.has(transfer.id) || transfer.round !== cycle.round || typeof transfer.from !== 'string' ||
        typeof transfer.to !== 'string' || !ids.has(transfer.from) || !ids.has(transfer.to) || transfer.from === transfer.to ||
        !colors.includes(transfer.color as typeof colors[number]) || !integer(transfer.amount) || transfer.amount < 1 || transfer.amount > 20 ||
        (transfer.color === 'red' && transfer.from !== room.currentNTG) ||
        (transfer.color === 'green' && transfer.to !== room.currentNTG)) return false
    requestIds.add(transfer.id)
    const color = transfer.color as typeof colors[number]
    receipts[transfer.to][color] += transfer.amount
    spent[transfer.from][color] += transfer.amount
  }
  for (const player of players) {
    const id = player.userId as string
    const allocation: Balance = id === room.currentNTG ? { red: 20, green: 0, yellow: 0 } : { red: 0, green: share, yellow: share }
    if (!balance(player.coins)) return false
    for (const color of colors) {
      if (spent[id][color] > allocation[color] || cycle.received[id][color] !== receipts[id][color] ||
          player.coins[color] !== (cycle.closed ? 0 : allocation[color] - spent[id][color] + receipts[id][color])) return false
    }
  }
  let previousRound = 0
  for (const entry of cycle.history) {
    if (!object(entry) || !integer(entry.round) || entry.round <= previousRound || entry.round > (cycle.round as number) ||
        !validReceipts(entry.received, ids) || colors.some(color =>
          Object.values(entry.received as Record<string, Balance>).reduce((sum, coins) => sum + coins[color], 0) > 20)) return false
    previousRound = entry.round
  }
  if (!cycle.closed) return previousRound < (cycle.round as number)
  const last = cycle.history.at(-1)
  if (!object(last) || last.round !== cycle.round || !validReceipts(last.received, ids)) return false
  const closedReceipts = last.received
  return [...ids].every(id => colors.every(color => closedReceipts[id][color] === receipts[id][color]))
}

/** Conservative classification, NOT a Room type guard and NOT permission to restore. */
export function auditRoomSnapshot(value: unknown, expectedId: string, deletedIds: ReadonlySet<string> = new Set()): SnapshotAudit {
  if (deletedIds.has(expectedId)) return { disposition: 'excluded-deleted', reasons: ['OPERATOR_DELETION_EXCLUSION'], warnings: [] }
  const reasons: string[] = []
  const warnings: string[] = []
  if (!object(value)) return { disposition: 'quarantine-required', reasons: ['SNAPSHOT_NOT_OBJECT'], warnings }
  // A payload must not evade an exclusion by being renamed to another filename.
  if (typeof value.id === 'string' && deletedIds.has(value.id)) {
    return { disposition: 'excluded-deleted', reasons: ['OPERATOR_DELETION_EXCLUSION'], warnings }
  }
  if (!roomIdPattern.test(expectedId) || value.id !== expectedId) reasons.push('ROOM_ID_MISMATCH_OR_INVALID')
  if ('schemaVersion' in value) reasons.push('UNSUPPORTED_SCHEMA_VERSION')
  else warnings.push('UNVERSIONED_SNAPSHOT_REQUIRES_MIGRATION_REVIEW')
  if (value.revision !== undefined && !integer(value.revision)) reasons.push('INVALID_REVISION')
  if (!['waiting', 'playing', 'ended'].includes(value.status as string) ||
      ![...PHASE_ORDER, 'ended'].includes(value.phase as never) ||
      (value.status === 'ended') !== (value.phase === 'ended')) reasons.push('INVALID_LIFECYCLE')
  if (!['turn', 'currentRound', 'totalRounds', 'lastActivity'].every(key => integer(value[key])) ||
      (integer(value.currentRound) && integer(value.totalRounds) && value.currentRound > value.totalRounds)) reasons.push('INVALID_COUNTERS')
  if (typeof value.host !== 'string' || !value.host ||
      !['currentNTG', 'currentNarrator', 'mutedPlayer', 'healedPlayer'].every(key => value[key] === null || typeof value[key] === 'string')) reasons.push('INVALID_IDENTITIES')
  if (!Array.isArray(value.gameLog) || !value.gameLog.every(entry => object(entry) && typeof entry.type === 'string' &&
      typeof entry.actorId === 'string' && integer(entry.timestamp))) reasons.push('INVALID_GAME_LOG')
  const nightActions = value.nightActions
  if (!['votes', 'ntgVotes', 'redCoinsGiven', 'yellowCoinsGiven', 'roleCompletions', 'responses'].every(key => object(value[key])) ||
      !object(nightActions) || !['silenced', 'healed', 'cardSelected'].every(key => typeof nightActions[key] === 'boolean') ||
      !object(value.bonusesGiven) || typeof value.bonusesGiven.healerBonus !== 'boolean' || !('selectedCard' in value)) reasons.push('INCOMPLETE_ROOM_STATE')
  const settings = value.settings
  const validGroups = (groups: unknown, allowed: string[]) => Array.isArray(groups) && groups.length > 0 &&
    new Set(groups).size === groups.length && groups.every(group => typeof group === 'string' && allowed.includes(group))
  if (!object(settings) || !validGroups(settings.situationGroups, ['light', 'medium', 'sensitive']) ||
      !validGroups(settings.emotionGroups, ['basic', 'light', 'strong', 'advanced'])) reasons.push('INVALID_SETTINGS')
  const players = Array.isArray(value.players) ? value.players : []
  const ids = new Set<string>()
  const sockets = new Set<string>()
  if (!Array.isArray(value.players) || players.length > 10) reasons.push('INVALID_PLAYERS')
  for (const player of players) {
    if (!object(player) || typeof player.userId !== 'string' || !player.userId || ids.has(player.userId) ||
        typeof player.socketId !== 'string' || !player.socketId || sockets.has(player.socketId) ||
        typeof player.name !== 'string' || !balance(player.coins)) {
      reasons.push('INVALID_PLAYER_OR_DUPLICATE_IDENTITY')
      continue
    }
    ids.add(player.userId)
    sockets.add(player.socketId)
    if (player.session !== undefined) {
      if (!object(player.session) || typeof player.session.tokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(player.session.tokenHash) ||
          !integer(player.session.generation) || player.session.generation < 1 || Object.keys(player.session).some(key => !['tokenHash', 'generation'].includes(key))) {
        reasons.push('INVALID_SESSION_SHAPE')
      }
      warnings.push('SESSION_REVOCATION_REVIEW_REQUIRED')
    } else warnings.push('LEGACY_SEAT_WITHOUT_SESSION')
  }
  if (value.status !== 'waiting' && (players.length < 5 || !ids.has(value.currentNTG as string) || !ids.has(value.currentNarrator as string))) reasons.push('INVALID_ACTIVE_ROSTER')
  if (value.rulesVersion !== undefined && !['legacy/v0', 'web-16-coin60/v1'].includes(value.rulesVersion as string)) reasons.push('UNSUPPORTED_RULES_VERSION')
  if (value.coinCycle !== undefined) {
    if (value.rulesVersion !== 'web-16-coin60/v1' || ids.size !== players.length ||
        !validCoinCycle(value, players.filter(object), ids)) reasons.push('INVALID_COIN_LEDGER')
  } else if (value.rulesVersion === 'web-16-coin60/v1' && value.status !== 'waiting') reasons.push('MISSING_COIN_LEDGER')
  else warnings.push('LEGACY_OR_UNALLOCATED_COINS_REVIEW_REQUIRED')
  if (value.pendingAutoAdvance !== undefined && value.pendingAutoAdvance !== null) warnings.push('DEADLINE_RESTORE_REVIEW_REQUIRED')
  return { disposition: reasons.length ? 'quarantine-required' : 'review-required', reasons: [...new Set(reasons)], warnings: [...new Set(warnings)] }
}

function readRegularFile(filename: string): Buffer {
  const before = fs.lstatSync(filename)
  if (!before.isFile() || before.isSymbolicLink() || before.size > maxBytes) throw new Error('UNSAFE_OR_OVERSIZED_INPUT')
  const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0))
  try {
    const opened = fs.fstatSync(descriptor)
    if (!opened.isFile() || opened.size > maxBytes || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error('INPUT_CHANGED_DURING_READ')
    // Bounded reads even if a file grows after fstat. No unbounded allocation/readFileSync.
    const buffer = Buffer.alloc(Math.min(opened.size + 1, maxBytes + 1))
    let length = 0
    while (length < buffer.length) {
      const count = fs.readSync(descriptor, buffer, length, buffer.length - length, null)
      if (!count) break
      length += count
    }
    const bytes = buffer.subarray(0, length)
    const after = fs.fstatSync(descriptor)
    if (bytes.length !== opened.size || bytes.length > maxBytes || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw new Error('INPUT_CHANGED_DURING_READ')
    return bytes
  } finally { fs.closeSync(descriptor) }
}

export function auditBackupDirectory(inputDirectory: string, exclusionFile?: string): BackupAuditReport {
  const input = path.resolve(inputDirectory)
  const directory = fs.lstatSync(input)
  if (!directory.isDirectory() || directory.isSymbolicLink() || fs.realpathSync(input) !== input) throw new Error('INPUT_MUST_BE_DIRECT_DIRECTORY')
  const deletedIds = new Set<string>()
  let exclusionListSha256: string | undefined
  if (exclusionFile !== undefined) {
    const bytes = readRegularFile(path.resolve(exclusionFile))
    const list: unknown = JSON.parse(bytes.toString('utf8'))
    if (!Array.isArray(list) || list.length > maxFiles || list.some(id => typeof id !== 'string' || !roomIdPattern.test(id)) || new Set(list).size !== list.length) throw new Error('INVALID_EXCLUSION_LIST')
    for (const id of list) deletedIds.add(id)
    exclusionListSha256 = checksum(bytes)
  }
  const files = fs.readdirSync(input).filter(name => name.endsWith('.json')).sort()
  if (files.length > maxFiles) throw new Error('TOO_MANY_INPUT_FILES')
  const entries: BackupAuditReport['entries'] = files.map((name, index) => {
    const ordinal = index + 1
    const expectedId = name.slice(0, -5)
    let bytes: Buffer
    try { bytes = readRegularFile(path.join(input, name)) } catch {
      return { ordinal, disposition: 'quarantine-required', reasons: ['UNREADABLE_UNSAFE_OR_CHANGED_INPUT'], warnings: [] }
    }
    const source = { ordinal, sourceSha256: checksum(bytes), bytes: bytes.length }
    if (deletedIds.has(expectedId)) return { ...source, disposition: 'excluded-deleted', reasons: ['OPERATOR_DELETION_EXCLUSION'], warnings: [] }
    let value: unknown
    try { value = JSON.parse(bytes.toString('utf8')) } catch {
      return { ...source, disposition: 'quarantine-required', reasons: ['INVALID_JSON'], warnings: [] }
    }
    return { ...source, ...auditRoomSnapshot(value, expectedId, deletedIds) }
  })
  return {
    version: 'room-backup-audit/v1', readOnly: true, restoreAuthorized: false,
    deletionEvidence: exclusionFile === undefined ? 'not-supplied' : 'operator-exclusion-list',
    ...(exclusionListSha256 ? { exclusionListSha256 } : {}), entries,
    summary: {
      reviewRequired: entries.filter(entry => entry.disposition === 'review-required').length,
      quarantineRequired: entries.filter(entry => entry.disposition === 'quarantine-required').length,
      excludedDeleted: entries.filter(entry => entry.disposition === 'excluded-deleted').length,
    },
  }
}
