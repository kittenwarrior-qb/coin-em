# R26 Showcase 3D

**Priority:** P2  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R24, R25

## Goal

Separated renderer/loader/controller, dispose/cancel, bounded cache and 2D fallback.

## Current evidence

Showcase 3D có ref/dependency/pose/zoom/GPU lifecycle cần audit.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R26)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R24, R25.
- fe/src/pages/CardShowcase.tsx; fe/src/pages/characterModels.ts; fe/public/models; fe/public/stickers

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`catalog asset → async loader/cancel → renderer controller/cache → 2D/context-loss fallback`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R26.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

OQ-09 catalog/license and device performance budget must be approved before release.

## Implementation plan

1. Inventory CardShowcase renderer creation, async asset load, refs, RAF/listeners, cache and current context-loss behavior.
2. Wait for OQ-09 catalog/license and a named device performance budget; do not replace approved card faces/models by inference.
3. Separate loader/cancellation, renderer lifecycle and interaction controller behind a catalog asset interface; bound cache and dispose resources deterministically.
4. Add a static 2D fallback for unsupported WebGL/context loss/load failure that keeps front/back semantics.
5. Migrate pose/zoom/reset behavior only from a written approved spec; preserve existing interactions until visual regression evidence exists.
6. Test 100 deck/model switches, navigation/unmount, load cancellation, context loss, cache cap and fallback across mobile/desktop; no 3D asset preload on game startup.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
