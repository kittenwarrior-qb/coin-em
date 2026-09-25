# R21 Mobile shell

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R19

## Goal

Responsive board safe-area/dvh across portrait/landscape/desktop preserving 10 slots.

## Current evidence

Fixed sizes có thể che 10 người chơi/CTA trên mobile và keyboard.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R21)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R19.
- fe/src/index.css; fe/src/components/cartoon/CartoonScreen.tsx; fe/src/pages/GameBoard.tsx; fe/src/components/game/PlayerLayout.tsx; fe/src/components/game/MiniPlayerToken.tsx; fe/src/pages/CardShowcase.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`viewport/safe area/keyboard → responsive shell → board slots/overlays → accessible CTA`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R21.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Need product decision: mobile-only shell hay desktop adaptive; không tự đảo UI strategy.

## Implementation plan

1. Record visual baselines and overflow/keyboard/safe-area failures at 320, 360, 390, 430, 768, 1280 and 1440 px.
2. Obtain owner decision on mobile-only shell versus desktop-adaptive behavior; do not replace information hierarchy by assumption.
3. Define shell sizing, safe-area, dynamic viewport and keyboard rules independent of phase/gameplay state.
4. Migrate board/player slots and overlays incrementally, retaining ten-player visibility and primary CTA reachability.
5. Test portrait, landscape, text zoom, mobile keyboard, focus and slow network with screenshots on named browsers/devices.
6. Keep component tokens compatible with R22 and leave modal focus policy to R23.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
