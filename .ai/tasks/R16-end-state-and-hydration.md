# R16 End state và hydration

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R04, R08, R09, R15

## Goal

Một terminal snapshot/coin summary và projector chung cho join/resume/event.

## Current evidence

game_ended có nhiều shape; FE có thể về lobby/mất ended state và summary khi refresh.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R16)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R04, R08, R09, R15.
- be/src/modules/game/services/GameService.ts; be/src/modules/room/services/RoomService.ts; fe/src/hooks/useSocket.ts; fe/src/pages/GameContainer.tsx; fe/src/components/game/PhaseOverlays.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`end command/final round → terminal commit → recipient projector → ended UI/resume hydration`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R16.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

End-of-game/rollback disclosure policy phụ thuộc OQ-01/OQ-05.

## Implementation plan

1. Inventory all end paths, `game_ended` payload shapes, listeners and the behavior of refresh/reconnect/ended UI.
2. Wait for R01/OQ-01/OQ-05 to define end and post-reveal rollback/disclosure; preserve existing semantics until approved.
3. Define one terminal commit and recipient projector containing only approved summary and capability state; terminal must reject later gameplay commands.
4. Route manual and final-round end through the same R07/R08 persistence path, then hydrate join/resume from the same projector.
5. Migrate FE ended view to remain mounted from confirmed projection rather than logging or routing away.
6. Test end per path, late ACK, terminal mutation rejection, refresh/resume and recipient secrecy.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
