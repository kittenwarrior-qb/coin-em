# R17 Frontend transport

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R04, R07, R09, R16

## Goal

Một socket lifecycle và sendAction ACK API với pending/uncertain/rejected/revision gate.

## Current evidence

Fire-and-forget/optimistic success và snapshot stale có thể làm UI sai hoặc unmount board.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R17)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R04, R07, R09, R16.
- fe/src/hooks/useSocket.ts; fe/src/stores/socketStore.ts; fe/src/pages/GameContainer.tsx; fe/src/pages/GameBoard.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`UI action → requestId/revision ACK → committed projection gate → pending/error/reconnect state`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R17.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

OQ-07 ảnh hưởng retry/resume UX; offline không được tự buffer action mutation.

## Implementation plan

1. Inventory emits/listeners/local room copies and optimistic mutations in useSocket, stores and GameContainer.
2. Consume only R04 versioned schemas and R09 session behavior; define one sendAction state model for pending, uncertain, rejected and confirmed.
3. Create a single socket lifecycle owner with requestId/revision handling and a projection revision gate; no new mutation queue while offline.
4. Migrate one representative action end-to-end, showing pending until committed ACK/projection and retrying only the same uncertain requestId.
5. Replace screen-level connection failure with scoped recoverable state while preserving confirmed board projection.
6. Test ACK/broadcast reordering, duplicate/out-of-order snapshot, reconnect, failed action and ten-client reconnect; retain compatibility adapter until migration completes.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
