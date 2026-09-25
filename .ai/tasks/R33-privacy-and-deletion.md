# R33 Privacy và deletion

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R05, R09, R11

## Goal

Data map, policy/routes, authenticated deletion/revocation, retention and log scrubbing.

## Current evidence

Guest IDs, sessions, rooms, logs, analytics, images and backups lack documented lifecycle.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R33)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R05, R09, R11.
- game.md; fe/index.html; fe/src/utils/userId.ts; be/src/persistence.ts; be/src/modules/room; be/src/modules/game; fe/src/components/site/SiteHeader.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`data inventory → consent/purpose/retention → authenticated delete/revoke → tombstone/backup-safe enforcement`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R33.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by OQ-08/OQ-10: audience, consent, contact, retention, owner; no legal conclusion without approval.

## Implementation plan

1. Inventory personal/pseudonymous data across rooms, sessions, Redis/JSON, backups, logs, analytics, assets and support channels; classify purpose/access/retention evidence.
2. Wait for OQ-08/OQ-10 owner decisions on audience, lawful basis/consent, contact, retention and deletion authority; obtain appropriate legal review rather than make legal claims.
3. Define authenticated request/delete/revoke flow tied to R05 identity, R09 token generations and R11 tombstones/migrations.
4. Implement minimization and structured log scrubbing before adding telemetry/admin views; ensure deletion prevents ordinary restore resurrection.
5. Add access-control, deletion/revocation, tombstone/backup and redacted-log regression tests using synthetic data only.
6. Publish approved policy/support language and operational runbook with retention limitations; mark any legal or backup exception explicitly.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
