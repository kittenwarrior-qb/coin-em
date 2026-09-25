# R31 PWA

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R17, R21, R24, R29

## Goal

Installable PWA, public guide/card cache, offline read-only and deferred in-game update.

## Current evidence

No manifest/SW/offline update policy; private room state must not be cached.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R31)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R17, R21, R24, R29.
- fe/vite.config.ts; fe/index.html; fe/src/App.tsx; fe/src/Router.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`public shell/assets → service worker cache → offline read-only → reconnect/controlled update`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R31.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Offline scope/update UX must be approved; no cache of private socket/API response.

## Implementation plan

1. Inventory public shell/assets versus private room/socket/API data and define cache allowlist/denylist with R24 hashes.
2. Obtain owner approval for offline/update UX; state explicitly that gameplay mutations are unavailable offline and private projections are never cached.
3. Add manifest/install metadata and a service worker that precaches only versioned public assets and uses safe bounded runtime cache policy.
4. Implement update detection that defers activation during an active room and offers an explicit refresh at a safe boundary.
5. Use R17 reconnect state to present offline read-only experience and recover only from server snapshot when online.
6. Test install/update, cold/offline public routes, private-cache inspection, mid-game update, asset rollback and browser storage eviction.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
