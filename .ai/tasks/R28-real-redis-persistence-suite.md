# R28 Real Redis persistence suite

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R03, R08, R09, R10, R11

## Goal

Dedicated real-Redis crash/fault/TTL/two-process suite.

## Current evidence

Global mock cannot prove durability, receipts, restore or race behavior.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R28)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R03, R08, R09, R10, R11.
- be/tests/advanced/reconnect-network.test.ts; be/tests/advanced/persistence-failure.test.ts; be/tests/advanced/concurrent-actions.test.ts; be/tests/integration; be/vitest.config.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`isolated Redis/process → command commit/session/deadline → crash/restart/fault → compare receipt/revision/balance`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R28.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Need isolated Redis infrastructure and OQ-06 durability/RPO target; never flush shared Redis.

## Implementation plan

1. Provision a dedicated disposable Redis namespace/container and two isolated backend processes through R03; verify target is never shared/production.
2. Define fault injection points around commit, receipt, index/delete, session expiry and scheduled deadline with R08–R11 contracts.
3. Run crash/restart immediately before commit, after commit before ACK, during delete and during deadline recovery; compare receipts/revision/balances after recovery.
4. Run concurrent requests through two processes and assert CAS/serialization convergence without relying on mock Redis.
5. Test TTL/revocation/tombstone and corrupted/legacy migration fixtures; collect Redis config/version and teardown evidence.
6. Report achieved durability scope separately from OQ-06 RPO/RTO; do not flush or restore shared Redis.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
