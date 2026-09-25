# R19 GameBoard decomposition

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R18

## Goal

GameBoard composition cùng controller/hooks/phase views rõ trách nhiệm.

## Current evidence

GameBoard 1,658 dòng gánh render, phase, draft, animation và actions.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R19)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R18.
- fe/src/pages/GameBoard.tsx; fe/src/components/game/TableBoard.tsx; fe/src/components/game/PlayerLayout.tsx; fe/src/components/game/GameModals.tsx; fe/src/hooks/useCoinRewardPreview.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`transport/store selectors → board controller → phase/player/modal components → action callbacks`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R19.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Không thay layout/luật trong khi tách; visual direction cần giữ với R21/R22.

## Implementation plan

1. Capture visual/action baseline for all observed role/phase states and identify responsibility seams in GameBoard.
2. Use R18 selectors and R17 actions to extract a controller first; retain present layout and DOM semantics unless a tested bug requires change.
3. Split existing TableBoard, PlayerLayout, GameModals and PhaseOverlays by explicit props/capabilities, not by copied room state.
4. Move draft/animation/overlay behavior to local feature hooks and ensure unmount/reconnect preserves confirmed projection.
5. Migrate one phase at a time with screenshot/action contract comparisons; keep temporary adapters time-bounded.
6. Run component/controller regressions, profiler and multi-client smoke; defer responsive restyling to R21 and new motion to R25.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
