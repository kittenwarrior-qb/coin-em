# R11 offline backup audit — not a restore tool

Current owner policy supersedes the historical backup gate below: no new deleted-room archives or external VPS backups; one-hour inactivity remains. `make backup` now refuses with exit1 and performs no data operation. Existing archives are not deleted or restored; this explicit-input auditor and synthetic fixture drills remain read-only/isolated. Seven-day anti-resurrection markers contain no room content and are not backups. See `retention-1h-7d.md` and the owner direction ADR dated2026-10-03.

Build backend, then audit a **separate, authorized backup copy**, never live room files:

```powershell
Set-Location D:\Desktop\coinem\be
npm run build
node scripts/audit-room-backups.cjs --input "D:\authorized-backup-copy\rooms"
```

The path above is an example, not a discovered/approved storage location. There is no default directory, Redis connection, server startup, file edit, automatic quarantine, migration or restore. Do not put backups, secrets, reports containing real data or player stories in Git. This report uses ordinals/checksums instead of filenames and contains no player names, IDs, sessions, responses or card objects. Operators correlate file SHA-256 locally within their authorized environment.

Optional operator deletion evidence:

```powershell
node scripts/audit-room-backups.cjs --input "D:\authorized-backup-copy\rooms" --exclude-deleted "D:\authorized-backup-copy\deleted-room-ids.json"
```

The exclusion file is a JSON array of unique safe room IDs (maximum 1,000), stored **outside the rooms directory**. It is an operator-supplied exclusion list, NOT an authoritative server tombstone. Both matching filename and matching embedded room ID are excluded; corrupt JSON under an excluded filename also stays excluded. Without this list, the report explicitly says deletion evidence was not supplied. Atomic tombstones and production restore integration remain R08/R11/R33 work.

## Report and exit status

- Format: `room-backup-audit/v1`, `readOnly: true`, `restoreAuthorized: false`.
- `review-required`: passes conservative offline structural/coin checks; **not** certified safe to restore. Runtime schema, card catalog, current primary revision, deletion authority, session revocation/presence, deadlines and policy still require review.
- `quarantine-required`: corrupt/partial/unsupported data, inconsistent ledger, identity collision, unsafe/changed/unreadable/oversized input. No source file is moved or deleted.
- `excluded-deleted`: omit from any proposed recovery; no automatic action is performed.
- Exit 0: no quarantine findings (including empty directory or exclusions); this does not authorize restore. Exit 1: quarantine findings. Exit 2: invalid invocation/input list/directory or unavailable compiled module.

Inputs are direct `.json` files, at most 1,000 files and 4 MiB each. Directories, symlinks and changed files are refused; reads are bounded even if the file grows. The audit does not infer a schemaVersion or rewrite legacy rules. Any `schemaVersion` currently requires review/quarantine because runtime has not adopted a migration contract.

## Next gate and rollback

Retention is now owner-approved: rooms inactive 1 hour, backups 7 days; runtime managed lifecycle is documented in `retention-1h-7d.md`. Encryption/access ownership, migration schema, RPO/RTO, external backup enforcement and production recovery remain open. Sessions/deadlines produce explicit review warnings, never fabricated revocation or reconnect success. Keep immutable backup hashes; do not overwrite newer primary rooms or resurrect deleted rooms. Removing the auditor is a code-only rollback: it has no runtime hook and changes no persisted data. Runtime deletion/archive is a separate module, not an `--apply` mode of this auditor.

Tests: `npx vitest run tests/unit/RoomBackupAudit.test.ts`. These are synthetic temporary filesystem fixtures, not a production restore or real Redis drill.
