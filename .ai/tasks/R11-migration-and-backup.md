# R11 Migration và backup

**Priority:** P0  
**Status:** planned  
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

OQ-06/OQ-10 quyết định retention, owner, store và production drill authority.

## Implementation plan

1. Inventory snapshot/index/JSON formats, deletion markers and existing backup behavior; assign schemaVersion only in the R08 authority design.
2. Define detect → dry-run → migrate/quarantine → verify flow with immutable input, report and explicit failure reasons.
3. Implement migrations as idempotent transforms with checksum/manifest evidence; never overwrite source snapshot during dry run.
4. Make tombstones dominate fallback restore and require restore to omit revoked session/presence data per R09/R33.
5. Add old/partial/corrupt/tombstoned fixtures and a separate restore rehearsal in isolated infrastructure.
6. Publish the operator runbook, retention/authority assumptions and rollback-forward plan; do not run production restore without OQ-06/OQ-10 approval.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
