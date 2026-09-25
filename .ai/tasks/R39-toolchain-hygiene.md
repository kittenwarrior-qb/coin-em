# R39 Toolchain hygiene

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R00, R03

## Goal

Pinned supported toolchain, BE lint, clean install gate and legacy retirement after usage audit.

## Current evidence

Toolchain/image drift exists, BE lint is absent and legacy index.js has uncertain usage.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R39)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R00, R03.
- be/package.json; fe/package.json; e2e/package.json; package-lock.json; be/src/index.js; be/tsconfig.json; be/Dockerfile.prod; fe/Dockerfile.prod; .github/workflows

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`lock/runtime inventory → clean install/lint/build/test → usage audit → pin/retire with rollback`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R39.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Tool/version choice requires compatibility evidence; do not delete legacy entry before import/runtime audit.

## Implementation plan

1. Inventory Node/package-manager/runtime/image versions, scripts, CI invocation, lockfiles and actual references to legacy entry points.
2. Choose supported pins only after compatibility evidence; document mismatch and do not alter a lockfile just to satisfy a plan.
3. Add a reproducible clean-install matrix and an actual BE lint command/config with warnings accounted for, not hidden.
4. Audit imports/runtime/container/CI use of legacy `index.js` before marking it deprecated; preserve a reversible compatibility path.
5. Run clean install, lint, build and focused tests on the pinned environment; record versions and platform boundaries.
6. Retire legacy code only after usage audit and owner review; use targeted revert rather than destructive resets if regression appears.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
