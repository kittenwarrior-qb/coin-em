# R29 Browser QA suite

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R17, R20, R21, R23

## Goal

Mobile Chromium/WebKit + desktop Playwright projects with semantic selectors.

## Current evidence

Current selectors/fake player coverage and mobile evidence are insufficient.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R29)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R17, R20, R21, R23.
- e2e/helpers; e2e/tests/01-lobby-and-room.spec.ts; e2e/tests/02-game-start-and-phases.spec.ts; e2e/tests/03-realtime-sync.spec.ts; e2e/tests/04-role-based-actions.spec.ts; e2e/tests/05-reconnect.spec.ts; e2e/tests/06-spam-prevention.spec.ts; e2e/playwright.config.ts; e2e/README.md

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`browser contexts → real socket room → action/reconnect/navigation → semantic assertions/artifacts`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R29.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

WebKit/device availability and approved rule fixtures must be confirmed; do not substitute fake players for real contexts.

## Implementation plan

1. Inventory current selectors, fake-player use and missing real-room flows; create an approved isolated room fixture strategy.
2. Add desktop Chromium and mobile Chromium/WebKit projects with semantic test IDs/roles only where stable UI contracts exist.
3. Drive 5 and 10 real browser contexts through approved room flow using R17 session/transport, not fake mutations.
4. Cover refresh/reconnect per declared phase, popup/ended/navigation, slow network and accessibility keyboard/focus behaviors.
5. Capture traces/screenshots/video/console/network artifacts with seed, browser and viewport; quarantine flaky environment failures explicitly.
6. Do not claim Safari/device coverage when only WebKit simulation ran, and do not run against production.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
