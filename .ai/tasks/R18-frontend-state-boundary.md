# R18 Frontend state boundary

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R15, R17

## Goal

Server-view store, session store và local UI/draft boundary với stable selectors.

## Current evidence

Room/player/phase/card đang bị copy ở nhiều hook/store/type.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R18)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R15, R17.
- fe/src/stores/gameStore.ts; fe/src/stores/socketStore.ts; fe/src/stores/uiStore.ts; fe/src/stores/types.ts; fe/src/hooks/useGameState.ts; fe/src/hooks/useGameFlow.ts; fe/src/types/game.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`projected server view → normalized selectors → local draft/UI only → render`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R18.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Không; owner state phải theo projection R17, không tái tạo luật FE.

## Implementation plan

1. Map every room/player/phase/card owner and duplication across hook, stores, components and legacy types.
2. Define canonical projected server view, session state and local UI/draft ownership; forbid gameplay authority in draft/UI state.
3. Introduce normalized selectors keyed by stable player ID and revision; migrate one read-only consumer before changing action consumers.
4. Move card/phase/coin rendering to projection-derived selectors and keep modal/focus/animation progress local only.
5. Remove a duplicated state copy only after hydration, rollback and new-room regression fixtures prove equivalence.
6. Test new room reset, stale snapshot gate, resume/rollback card consistency and render profiling; do not redesign layout in this task.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
