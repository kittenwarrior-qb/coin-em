# R32 Capacitor native shell

**Priority:** P2  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R31, R30, R33

## Goal

Bundled FE and lifecycle/token/link adapters with safe area/native back.

## Current evidence

No native shell or platform boundary evidence.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R32)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R31, R30, R33.
- fe/package.json; fe/src/App.tsx; fe/src/hooks/useSocket.ts; fe/src/components/game/GameMenuModal.tsx; capacitor/android modules; capacitor/ios modules

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`native lifecycle/link/network → platform adapter → session/socket resume → safe-area/back/external navigation`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R32.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by OQ-08/OQ-10 for audience, permissions, signing owner and iOS capability.

## Implementation plan

1. Wait for OQ-08/OQ-10 signing, audience, permissions and iOS capability decisions; do not create distributable signing artifacts.
2. Define platform adapters for lifecycle, network, safe area, back behavior, external links and R09 session storage without changing domain rules.
3. Package the already-tested web bundle only after R31/R30/R33 gates; keep native navigation separate from web router assumptions.
4. On foreground/relaunch, validate token/session and fetch confirmed projection rather than assuming a persistent socket.
5. Test Android and iOS target flows for cold/warm launch, deep link, back, keyboard/safe area, offline/reconnect and external navigation on named devices.
6. Record platform/tool versions and known gaps; no store upload, credential handling or permission expansion in this task.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
