# R01 ADR luật và rules version

**Priority:** P0  
**Status:** blocked  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R00

## Goal

ADR versioned, bảng 5–10 người, coin, EMPASS và số lượng card.

## Current evidence

game.md, README.md và source hiện mâu thuẫn về quy mô người chơi, role, phase, coin và catalog.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R01)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R00.
- game.md; README.md; be/src/modules/game/engine/RoleManager.ts; be/src/modules/game/engine/TurnManager.ts; be/src/modules/game/services/RewardCalculator.ts; be/src/constants/cards.ts; fe/src/constants/cards.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`rules version → phase/role/coin/card fixtures → contract và test golden`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R01.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

OQ-01..OQ-05 chưa có quyết định của product/gameplay owner; task không được sửa luật trước khi ADR được duyệt.

## Implementation plan

1. Inventory every contradiction in game.md, README and the listed engines/catalogs with file/line evidence; do not resolve it in code.
2. Draft a versioned ADR template listing only decisions OQ-01..05 require: player/narrator count, phase flow, role/rotation, coin/reward, EMPASS/rollback and catalog counts.
3. Run a product/gameplay-owner review using concrete golden scenarios for each approved player size; record decision owner/date and rulesVersion.
4. Translate only approved choices into a traceable rules fixture/spec, including unchanged legacy behavior and explicitly deferred cases.
5. Add golden tests from the approved fixture, then publish migration/compatibility impacts for R04/R06/R12–R15.
6. Keep status planned/blocked until the ADR and owners actually approve it; no gameplay source change in this task.

## Implementation report

2026-09-09 — evidence/ADR pass only; **blocked** pending product/gameplay-owner decisions.

- Created `docs/adr/R01-rules-version-draft.md`. It labels `draft-r01-unapproved` as a documentation-only marker, not a runtime/persisted rules version.
- Audited the scoped guide, README, role/turn/reward sources and FE/BE card constants. The ADR records file/line evidence for player counts, roles, phase flow, coins/rewards, EMPASS/privacy and card counts.
- Added parameterized golden-scenario skeletons only. No fixture/test/source was added because doing so would select unapproved expected rule outcomes.
- Preserved invariant: no gameplay, socket schema, catalog mapping, dependency, deployment or production change was made.
- Checks run: scoped `rg` evidence searches and manual line inspection of cited files. No build/test run: this is documentation-only and no executable artifact changed.

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

| Date | Decision | Status | Evidence / owner needed |
|---|---|---|---|
| 2026-09-09 | Created draft ADR at `docs/adr/R01-rules-version-draft.md`; proposed marker `draft-r01-unapproved`. | Draft, non-binding | Product owner + gameplay owner must decide OQ-01..OQ-05 and approve a semantic `rulesVersion`. |
| 2026-09-09 | No golden fixture or test expected value created. | Blocked | Any concrete expected outcome would be an unapproved gameplay decision. |
