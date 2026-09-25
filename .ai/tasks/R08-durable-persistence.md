# R08 Durable persistence

**Priority:** P0  
**Status:** planned  
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

1. Inventory Redis, JSON fallback, cache, index and delete paths; identify exactly which write is acknowledged today.
2. Define a single authority and explicit unavailable/recovery policy with RPO/RTO marked pending OQ-06; do not claim host-loss durability.
3. Make commit await snapshot/index/receipt durability before ACK, expose live readiness, and reject new mutation when the authority is unavailable.
4. Make delete/tombstone cancel or dominate delayed fallback writes; require recovery to respect schema/tombstone rules from R11.
5. Add failure injection for Redis/disk/ACK-loss/delete race and prove no false success or room resurrection in isolated storage.
6. Record migration compatibility and hand real crash/RPO verification to R28.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
