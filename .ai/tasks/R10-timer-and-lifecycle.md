# R10 Timer và lifecycle

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R06, R08

## Goal

Persisted deadline/phaseInstance, recovered scheduler, cleanup grace và shutdown drain.

## Current evidence

Callback setTimeout có thể stale/mất sau restart và FE có countdown local.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R10)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R06, R08.
- be/src/socket/handlers/gameHandlers.ts; be/src/modules/game/PhaseTimer.ts; be/src/index.ts; fe/src/pages/GameBoard.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`phase transition → persisted deadline/instance → scheduler recovery → guarded timeout command`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R10.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Phase durations/auto advance phải theo R01; shutdown/drain SLO cần OQ-06.

## Implementation plan

1. Inventory every browser/server timeout, its phase guard and lifecycle cleanup; distinguish display countdown from authoritative deadline.
2. Wait for R01 phase duration/auto-advance and OQ-06 drain target; document which phases have no deadline rather than guessing.
3. Persist an approved deadline and phaseInstance at transition, then schedule only guarded domain commands that re-check room revision/status/instance.
4. On startup and reconnect, recover eligible operations once; cancel/ignore stale operations after prev/next/end and keep UI countdown derived from projection.
5. Add fake-clock tests for restart before/after deadline, repeated phase name, prev-next race, terminal state and shutdown drain.
6. Record unresolved duration/drain decisions and keep timer behavior unchanged until their approval.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
