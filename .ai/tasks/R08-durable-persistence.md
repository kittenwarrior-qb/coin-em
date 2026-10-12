# R08 Durable persistence

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R07

## Goal

Awaited commit, fail-closed, recovery explicit, atomic delete/tombstone/readiness.

## Current evidence

save có thể fire-and-forget/nuốt Redis lỗi; JSON fallback và cache chưa có authority rõ.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R08)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R07.
- be/src/modules/room/repository/RoomRepository.ts; be/src/persistence.ts; be/src/redis.ts; be/src/index.ts; docker-compose.dev.yml; docker-compose.prod.yml

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`command commit → durable snapshot/index/receipt → ACK; failure → explicit rejection/recovery path`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R08.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

OQ-06 cần RPO/RTO/durability policy; không tự hứa RPO=0 khi mất host.

## Implementation plan

Plan revision2026-10-03 — R11 owner override disables new deleted-room archives, retaining existing atomic Redis deletion and minimal7d tombstones/no-resurrection. Repository now calls content-free recordRoomDeletionStrict; keep primary/JSON commit/failure boundaries and active storage semantics unchanged. No deletion of existing user/production archives or external backup configuration. New policy/confirmation: docs/adr/2026-10-03-owner-admin-and-release-direction.md.

Plan revision retention 2026-10-02: owner chốt phòng inactive 1h/backup 7d (`docs/adr/2026-10-02-retention-approved.md`). Scope thêm storageKeys tombstone prefix, retention policy, app-managed deleted backup/marker persistence và strict delete/cleanup tests. Delete atomic snapshot/index/7d marker, guarded revision + fresh activity; stale commit đọc marker trước ghi. Không sửa AOF/deploy hoặc xóa external backup directory.

Plan revision 2026-10-02: scope thêm `be/src/index.ts`, `be/src/redis.ts`, `be/src/readiness.ts`, strict recovery/readiness tests và test teardown drain. Production/redis-required không auto fallback/restore JSON; không đổi production AOF policy hay thực hiện deploy/recovery.

1. Inventory Redis, JSON fallback, cache, index and delete paths; identify exactly which write is acknowledged today.
2. Define a single authority and explicit unavailable/recovery policy with RPO/RTO marked pending OQ-06; do not claim host-loss durability.
3. Make commit await snapshot/index/receipt durability before ACK, expose live readiness, and reject new mutation when the authority is unavailable.
4. Make delete/tombstone cancel or dominate delayed fallback writes; require recovery to respect schema/tombstone rules from R11.
5. Add failure injection for Redis/disk/ACK-loss/delete race and prove no false success or room resurrection in isolated storage.
6. Record migration compatibility and hand real crash/RPO verification to R28.

## Implementation report

2026-10-02 — Approved retention continuation: atomic Redis deletion preflights index, compares revision + current activity, writes seven-day marker and removes snapshot/index in one Lua call. All commits consult marker before write; fresh reads/recovery omit it and evict stale cache. Awaited deletion keeps cache/file on primary failure/conflict; successful primary deletion survives degraded secondary JSON archive failure. JSON-only marker is also the local deletion commit. Active backups/legacy debounce cannot re-save a locally tombstoned/expired room. Managed deleted snapshots are isolated for seven days; no automatic restore. Full migration/operator restore/revocation, external backups and production RPO/RTO remain.

2026-10-02 — Update: primary-required production/startup/live socket boundary fails closed; load rejects incomplete/corrupt recovery rather than publishing partial cache. No automatic JSON restore in primary-required mode. Redis writes use Lua CAS/preflight, JSON compatibility backup only after successful primary write, delete cancels queued backups, teardown drains writes. Real Redis kill/restart fixture passed, not production RPO proof; tombstone/migration/recovery operator workflow remains.

2026-10-01 — Critical gameplay mutations await saveAndWait trước ACK/broadcast. Redis MULTI ghi snapshot/index và trả lỗi primary; cache không publish failed commit. Redis là primary khi available; JSON backup failure sau Redis commit log degraded, không báo action rejected; khi Redis unavailable JSON strict phải lưu trước cache. Writes cũ được drain trước fresh read/commit/delete. Còn tombstone, startup/readiness, fail-closed degraded mode, AOF/restart/fault Redis thật R28; không hứa RPO=0 từ mock.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

2026-10-02 — Full backend 36 files / 438 tests pass, no skipped; build/typecheck and whitespace check pass. Real isolated Redis fixture passes revision/activity/index preflight deletion guard, seven-day marker TTL, kill/restart persistence and stale recreation rejection from a new process with a different empty local directory. No shared/user/production Redis or room data was targeted. See retention runbook and latest QA report; this is fixture AOF appendfsync=always evidence, not production RPO=0.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
