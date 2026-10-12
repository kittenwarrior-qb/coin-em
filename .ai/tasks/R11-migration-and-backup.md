# R11 Migration và backup

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R08

## Goal

Versioned migration, dry run/quarantine và backup/restore runbook.

## Current evidence

Snapshot/index/JSON cũ chưa version; delete có thể bị JSON restore hồi sinh.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R11)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R08.
- be/src/persistence.ts; be/src/modules/room/repository/RoomRepository.ts; be/src/index.ts; Makefile; docker-compose.prod.yml

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`legacy snapshot → detect schema → migrate or quarantine → authoritative restore/tombstone`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R11.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Latest 2026-10-02 — Owner đã chốt 1h room inactivity / 7d backup. Phần chưa chốt: encryption/access owner, external backup storage/enforcement, RPO/RTO và production restore authority; không tự deploy/restore.

Owner override2026-10-03/04: new deleted-room content archives and external VPS backups are disabled, not an open implementation requirement. One-hour inactivity and minimal content-free anti-resurrection markers remain. Historical copies are not manually deleted. Migration/authorized recovery of pre-existing data and operator access remain separate gates; do not infer a backup/RPO guarantee.

OQ-06/OQ-10 quyết định retention, owner, store và production drill authority.

## Implementation plan

Plan revision 2026-10-04 — complete the owner no-new-backup override at the maintenance entry point: disable `make backup` with an explicit nonzero failure and no Docker/filesystem operation. Keep isolated synthetic backup/restore fixture targets and all existing archives untouched. Add a source regression test for the exact recipe/help text. Admit `be/scripts/test-clean-toolchain.mjs` solely to copy the public root Makefile into isolated QA workspaces so this guard tests the same source, not the original checkout. No maintenance command, production access, backup deletion or deploy is authorized by this revision.

Plan revision2026-10-03 — owner supersedes new deleted-room-content backup policy: do not create deleted-room archives or set up external VPS backups; room inactivity remains1h. Scope adds retention constants/adjacent tests and deletion-helper callers. Keep minimal id/deletedAt/expiresAt tombstones for existing7d anti-resurrection boundary and legacy archive-envelope expiry validation, not room-content recovery. Stop touching/creating deleted-backups during new deletion; preserve existing content archives and do not manually purge them or production directories. Rename helper to recordRoomDeletionStrict with a documented backward-compatible export; repository uses new name. Update tests to prove no archived content/directory is produced, stale writes still denied, existing-archive expiry remains safe and redirected old archive path not followed. Existing active-storage/JSON fallback semantics unchanged; no production mutation or claim that backup/RPO remains available.

Plan revision retention 2026-10-02: owner đã duyệt 1h phòng/7d backup. Mở scope runtime app-managed archive + deletion marker + safe direct-file expiry purge trong persistence/retention/repository/index và real Redis fixtures. Auditor offline vẫn chỉ đọc; không đổi schema/migrate/restore hay prune external directories. Archive dùng envelope riêng, không được loadRooms tự động đọc.

### Plan revision 2026-10-02 — read-only slice

Cho phép thêm `be/src/backup/RoomBackupAudit.ts`, `be/scripts/audit-room-backups.cjs`, unit/fixture tests và runbook. Review scope này chỉ là kiểm tra backup offline, không phụ thuộc vào việc R08 đã hoàn tất tombstone. Input phải là directory do operator chỉ định; không dùng DATA_DIR/Redis/runtime startup. Báo cáo versioned chỉ chứa checksum, ordinal, reason codes và summary, không chứa room/player/session/story. Không tự thêm schemaVersion, sửa snapshot, migrate/restore, xóa/quarantine file hay tạo retention mặc định. Danh sách deletion do operator cung cấp chỉ là exclusion evidence trong dry run, không thay tombstone authoritative. Full migration/restore vẫn chờ R08 và các decision gates.

1. Inventory snapshot/index/JSON formats, deletion markers and existing backup behavior; assign schemaVersion only in the R08 authority design.
2. Define detect → dry-run → migrate/quarantine → verify flow with immutable input, report and explicit failure reasons.
3. Implement migrations as idempotent transforms with checksum/manifest evidence; never overwrite source snapshot during dry run.
4. Make tombstones dominate fallback restore and require restore to omit revoked session/presence data per R09/R33.
5. Add old/partial/corrupt/tombstoned fixtures and a separate restore rehearsal in isolated infrastructure.
6. Publish the operator runbook, retention/authority assumptions and rollback-forward plan; do not run production restore without OQ-06/OQ-10 approval.

## Implementation report

2026-10-04 — Disabled manual `make backup`: explicit owner-policy explanation followed by exit1; no mkdir/Docker copy or archive mutation. Help identifies it as disabled. Synthetic backup-fixture/restore-fixture targets are retained. New BackupPolicy source guards assert the exact closed recipe and isolated fixture commands; clean runner copies only the public Makefile alongside existing admitted roots. No make maintenance command was executed or existing backup deleted.

2026-10-03 owner override applied: recordRoomDeletionStrict writes only minimal id/deletion/expiry marker and removes active JSON, never creates/reads deleted-room content backup directory. Compatibility export retains old function name with explicit no-archive semantics; repository/new startup message use marker-only behavior. Atomic Redis deletion/primary failure/late-write/recovery protections retained. Historical archives not manually deleted; legacy safe expiry interpreter retained. Synthetic updated14retention tests pass, including no directory/content archive and redirected old archive path rejection during expiry. Earlier7day backup descriptions are historical, not current new-backup policy.

2026-10-02 — Retention continuation: separate managed deleted-room envelope (`deleted-room-backup/v1`) and minimal marker (`room-deletion/v1`) expire after seven days; safe direct-file purge refuses redirected dirs/symlinks/corrupt metadata and retries degraded tombstoned active-file removal. Operator/offsite/volume/Umami backups are explicitly out of this purge, not claimed compliant. Offline auditor remains read-only and does not treat archive envelopes as ready-to-restore raw Rooms. Migration/schema adoption/revocation-aware restore remain unimplemented gates.

2026-10-02 — Implemented read-only slice: `RoomBackupAudit.ts` + explicit-input CLI + `docs/ops/r11-read-only-backup-audit.md`. Versioned report has SHA-256/ordinal/reason codes only, no room/player/session/story fields. Conservative validation covers lifecycle/counters/settings/roster/session shape, rules and exact Coin allocation/receipts/transfers/closed history; unknown schema/rules and partial/corrupt data require quarantine review. Operator deletion exclusions dominate filename and embedded ID, but are explicitly not authoritative tombstones. Bounded direct-file reads reject symlinks/junction roots/oversized or changed inputs. No runtime import hook, Redis, retention default, schema mutation, source file write, move/delete or restore was added. Full migration, durable tombstones, revocation-aware restore and production drill remain pending.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-04 — BackupPolicy/Retention/recovery-fixture/ToolchainParity focused4files24tests PASS7.86s. Synthetic recovery drill is isolated, not an external/VPS backup. Fresh copied full matrix follows separately; previous eXWZwK all9PASS predates this maintenance-policy guard.

Final post-policy copied clean RuBoCK PASS: all9install/lint/build/test commands exit0 on pinned Windows22.23.3/npm10.9.9, BE557/FE570 regular tests. Read-only hash comparison of976non-generated copied files finds0mismatches against the checkout. No maintenance backup or archive deletion executed.

2026-10-03 current compiled marker-only source realRedis fixturePASS: two-process revisionCAS, failclosed/receipt/sessionhash checks, AOF SIGKILL/restart recovery, atomicdelete/freshactivity/revision/index guards, seven-day-marker survival and secondrestart/new-directory stale recreation denial. Owned labelled fixture container/temp removed, no shared Redis/VPS/data touched. Source full519BE/503FE testsPASS; strict573-image aggregate/200faces unchanged/0reskins. This does not create an external backup or certify productionRPO/host-loss/deletion of existing operator copies.

2026-10-03 focused24retention/aggregate tests PASS. Initial2new marker assertions incorrectly equated committed marker time with cleanup's earlier activity cutoff; corrected to compare exact Redis marker payload and precise7day TTL/allowlisted keys, preserving stronger atomic parity instead of widening tolerances. Full backend519tests PASS31.02s/build/typecheckPASS. Current realRedis compiled marker-only deletion check follows separately, not inherited from earlier backup-enabled source; no actual room/backup cleanup or deploy.

2026-10-02 — 33 focused tests pass (immutable bytes/mtime/name fixtures, deterministic report, legacy/partial/corrupt/deleted/renamed files, ledger inconsistencies, session redaction, bounded files/junction refusal, CLI help/argument validation and exit codes). Full backend: 34 files / 422 tests pass / 0 skipped; build and typecheck pass. CLI `--help` works and missing explicit input is rejected. Input fixtures were created under validated os.tmpdir roots and removed by test teardown; no user/production backup was read. These results are offline audit evidence, not migration/restore/RPO approval. An initial CLI parameterized test supplied rows incorrectly (Vitest spreads array rows); wrapping each argument list as a single case fixed the test, then focused/full suites passed. Initial TypeScript callback narrowing errors were fixed before the successful build.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
