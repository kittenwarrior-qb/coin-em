# R27 Gameplay regression suite

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R03; add alongside R06–R16

## Goal

Deterministic fixtures/seed/clock, property tests and regression repros.

## Current evidence

Existing tests do not fully cover approved rules, rollback, all sizes/roles.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R27)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R03; add alongside R06–R16.
- be/tests/unit/GameEngine.test.ts; be/tests/unit/CoinRewards.test.ts; be/tests/unit/RoleManager.test.ts; be/tests/unit/FullGameFlow.test.ts; be/tests/unit/ActionValidator.test.ts; be/tests/builders; be/tests/helpers/mockData.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`approved fixture/seed → command/state transition → assertion of projection/ledger/invariant`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R27.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by unresolved OQ-01..OQ-05 only for expected outcomes; keep non-rule invariants progressing.

## Implementation plan

1. Catalog current unit/integration/advanced coverage and link every existing bug to a deterministic fixture, seed and clock.
2. Turn approved R01 rules into golden scenarios only after owner sign-off; keep non-rule invariants (terminal, identity, bounds, receipt) progressing.
3. Build fixture/builders that create stable player IDs, phase instances, catalog versions and isolated storage via R03.
4. Add characterization tests before each R06–R16 behavior migration, then property/fuzz cases for invariant boundaries.
5. Run every approved player size/round/role fixture and assert projection secrecy, ledger deltas and no silent skip.
6. Record unresolved rule expectations as blocked; never update expected values merely to match implementation.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
