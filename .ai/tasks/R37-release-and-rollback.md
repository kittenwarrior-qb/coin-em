# R37 Release và rollback

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R02, R11, R28, R29, R35

## Goal

SHA/digest images, staging, compatible drain, smoke and rollback runbook.

## Current evidence

Build-at-VPS and no immutable/smoke/restore gate risk interrupting rooms or corrupting compatibility.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R37)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R02, R11, R28, R29, R35.
- .github/workflows/ci.yml; .github/workflows/deploy.yml; be/Dockerfile.prod; fe/Dockerfile.prod; docker-compose.prod.yml; Makefile; Caddyfile

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`tested digest → staging/smoke → drain/compatible deploy → monitor → safe rollback without old snapshot restore`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R37.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by OQ-06/OQ-10 for release authority, RPO/RTO and host ownership.

## Implementation plan

1. Combine R02 guardrails, R11 migration, R28 real persistence, R29 browser and R35 monitoring evidence into one release evidence checklist.
2. Wait for OQ-06/OQ-10 release authority, RPO/RTO and host ownership; document no-go conditions rather than inventing a drain policy.
3. Build immutable tagged/digested artifacts, run migration dry-run and staging smoke against a compatible data fixture before any deployment.
4. Define drain/compatibility window, health gates, monitoring watch and forward-fix/targeted-revert rollback that never restores old room snapshots over new data.
5. Rehearse the procedure only in approved staging, including failed smoke, abort, compatible rollback and evidence capture.
6. No production deploy/tag/rollback is authorized by this task plan; promote only with owner approval and all dependency reports.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
