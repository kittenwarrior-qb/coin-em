# R06 Unified state machine

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R04

## Goal

Một phase registry với guards và domain command start/end/next/prev/reward.

## Current evidence

StateMachine và TurnManager có bảng phase riêng; handler có mutation terminal/timer rời rạc.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R06)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R04.
- be/src/modules/game/engine/GameEngine.ts; be/src/modules/game/engine/StateMachine.ts; be/src/modules/game/engine/TurnManager.ts; be/src/socket/handlers/gameHandlers.ts; be/src/modules/game/PhaseTimer.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`command + phase instance → registry guard → transition/domain effect → persisted projected state`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R06.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked bởi OQ-01 và OQ-05 cho phase/rollback; chỉ hợp nhất cấu trúc theo ADR đã duyệt.

## Implementation plan

1. Characterize current StateMachine, TurnManager, handler and timer transitions, including terminal and skip behavior, without treating either table as law.
2. Block phase/order/rollback semantic changes until R01/OQ-01/OQ-05 are approved; list every unresolved transition explicitly.
3. Design one registry keyed by approved phase identifiers with entry/exit guards, capability, phase-instance and rollback policy.
4. Route a single approved transition through domain commands and remove only the duplicate path covered by characterization tests; preserve compatibility boundary.
5. Add valid/invalid/terminal/skip/stale-phase tests and prove no handler mutates terminal state directly on migrated paths.
6. Publish registry contract and migration order for R07/R10/R20; do not implement unapproved rewards.

## Implementation report

Plan revision 2026-10-02: thêm PhaseRegistry.ts, Room phaseInstance và service endGame vào scope. StateMachine/TurnManager dùng một registry; engine NEXT/PREV/END theo cùng approved baseline. Manual end và final-round end dùng cùng domain effect, actor/terminal guards, collect/history và một GAME_ENDED log. Invalid phase bị từ chối, terminal không quay lại role-reveal. ApprovedBaseline test giữ deck/phase/skip/rotation và manual/final end; vẫn chờ toàn bộ R04/shared capability contract và audit.

QA evidence: `docs/qa/2026-10-02-p0-progress.md`.

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
