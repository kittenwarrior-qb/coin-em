# R07 Per-room concurrency

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R03, R04, R06

## Goal

Room command processor, queue per room, revision CAS và receipt atomic.

## Current evidence

Nhiều handler read-await-write trên snapshot/cache nên có lost update.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R07)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R03, R04, R06.
- be/src/modules/room/repository/RoomRepository.ts; be/src/modules/game/services/GameService.ts; be/src/socket/handlers/roomHandlers.ts; be/src/socket/handlers/playerHandlers.ts; be/src/socket/handlers/gameHandlers.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`requestId/revision → per-room serialization → validate/commit receipt → ACK/projected broadcast`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R07.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Contract requestId/revision từ R04 và transition R06 phải ổn định; không dùng lock global hoặc đổi luật.

## Implementation plan

1. Map read-await-write mutation paths and current repository cache/save behavior; identify a room command boundary for every migrated action.
2. Wait for R04 requestId/revision and R06 transition contract; define command ordering, expected revision, receipt lookup and rejection behavior without a global lock.
3. Implement per-room serialization plus storage CAS/atomic receipt and snapshot/index write on one command vertical slice.
4. Broadcast and ACK only the committed projection; return a duplicate-success receipt for the same requestId without replaying effect.
5. Add concurrent same-revision, duplicate receipt, next-vs-prev-vs-timeout and two-room isolation tests using R03 harness.
6. Migrate remaining commands only after the vertical slice proves ordering and persistence failure behavior with R08.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
