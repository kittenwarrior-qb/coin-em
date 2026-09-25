# R22 Design system

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R21

## Goal

Token/size/state API, badge anchor và page/game variants.

## Current evidence

Sprite, badge, token và styles phân tán, dễ vá offset theo từng màn.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R22)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R21.
- fe/src/components/cartoon/CartoonButton.tsx; fe/src/components/game/GameMenuModal.tsx; fe/src/index.css; fe/src/components/site/SiteHeader.tsx; fe/src/pages/About.tsx; CARTOON_GUI_SYSTEM.md

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`design tokens → primitives/states → game/site variants → components consume stable API`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R22.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Brand/content owner phải duyệt token/asset usage; không đổi gameplay semantics.

## Implementation plan

1. Inventory repeated color/type/spacing/motion/sprite/badge rules and identify shared versus game/site-only usage.
2. Get brand/content approval for token naming and asset use; document variants without changing game meaning or content.
3. Define token primitives and component state API, including visual-pill badge anchoring rather than page-specific offsets.
4. Migrate one primitive and its highest-risk consumers with visual baseline comparisons before removing legacy styles.
5. Separate site and game variants so `/about`/gallery do not inherit board constraints; preserve responsive shell rules from R21.
6. Test focus/disabled/pending/badge states and route snapshots; record rollback as token alias restoration rather than broad CSS reset.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
