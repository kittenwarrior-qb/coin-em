# R03 Test harness isolation

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R00

## Goal

Fixture inject được storage root, clock, Redis namespace và server factory thật.

## Current evidence

Test hiện có thể dùng JSON data chung và Redis mock, nên không chứng minh isolation.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R03)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R00.
- be/tests/setup.ts; be/vitest.config.ts; be/src/persistence.ts; be/tests/integration; be/tests/advanced; be/src/index.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`test run ID → temp storage/namespace/clock → full handler server → teardown không leak`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R03.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Không có; vẫn phải giữ dữ liệu working tree ngoài test root an toàn.

## Implementation plan

1. Map all current filesystem, clock, Redis and process globals touched by setup, persistence and integration/advanced tests.
2. Introduce a per-run test context that supplies an explicit temporary storage root, Redis namespace, clock and handler server factory; reject production-like roots.
3. Migrate one representative unit, integration and advanced test to the context before moving the remaining suites.
4. Add teardown that closes sockets/timers/clients and removes only the verified per-run temporary root; assert no writes to be/data or shared Redis.
5. Run tests concurrently twice with distinct IDs and prove fixture, timer, socket and namespace isolation in reports.
6. Keep real-Redis fault claims for R28; this task only creates the safe harness.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
