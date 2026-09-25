# R23 Overlay và accessibility

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R17, R21

## Goal

Scoped overlay root, viewport-centered loading, inline errors và focus/ESC/back policy.

## Current evidence

Modal/loading scope không nhất quán; action error có thể thay cả board.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R23)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R17, R21.
- fe/src/components/cartoon/CartoonModal.tsx; fe/src/components/game/AssetPreloaderScreen.tsx; fe/src/Router.tsx; fe/src/components/game/GameModals.tsx; fe/src/pages/GameContainer.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`action/loading/error state → scoped overlay or inline feedback → focus/back lifecycle → preserved board`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R23.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Mobile back and nested-modal policy needs product approval; do not hide recovery state.

## Implementation plan

1. Inventory modal, portal, loading, error and navigation paths; capture cases where board unmounts or focus is lost.
2. Obtain product approval for nested-modal and mobile back policy; define defaults that retain recovery state and close only the top eligible overlay.
3. Create scoped overlay roots and an overlay state contract separating screen loading, panel modal, popover and inline action error.
4. Migrate one modal/loading/error path at a time, restoring focus and preserving confirmed board state across reconnect.
5. Add keyboard/ESC/back, focus trap, screen-reader labels, nested modal, mobile keyboard and error recovery tests.
6. Coordinate safe-area sizing with R21 and action lifecycle with R17; do not hide server rejection in a generic overlay.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
