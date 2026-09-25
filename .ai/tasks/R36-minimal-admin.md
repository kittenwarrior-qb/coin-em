# R36 Minimal admin

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R05, R08, R33, R35

## Goal

RBAC admin metadata/presence, audited close-room command and no direct coin mutation.

## Current evidence

Umami is not a game admin and current API does not define least-privilege operations.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R36)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R05, R08, R33, R35.
- be/src/index.ts; be/src/modules/room; be/src/modules/game; Caddyfile; admin API/UI modules

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`admin auth/RBAC → read metadata/projected view → command pipeline close-room → audit/telemetry`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R36.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Admin identity, hosting owner and data access retention require OQ-08/OQ-10 approval.

## Implementation plan

1. Wait for approved admin identity, hosting/data-retention authority (OQ-08/OQ-10); inventory existing Umami and distinguish it from game administration.
2. Define least-privilege roles and recipient-safe metadata view; enumerate allowed commands, explicitly excluding direct coin/role/story mutation.
3. Route close-room or other approved action through R05 auth, R07 command pipeline, R08 commit and R35 audit telemetry.
4. Build read views from allowlisted projections and record actor/reason/time/revision for each action without secrets.
5. Add RBAC, outsider, stale session, audit completeness and no-direct-mutation tests using isolated data.
6. Do not expose operational/admin UI or data until privacy/deletion and alert ownership controls are approved.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
