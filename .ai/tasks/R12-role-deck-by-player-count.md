# R12 Role deck theo số người

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R06

## Goal

Role deck 5–10, stable seat/player ID và base/current role semantics.

## Current evidence

Giới hạn người chơi và deck/rotation hiện mâu thuẫn, đặc biệt 8–10 có hai Silencer.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R12)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R06.
- be/src/modules/game/engine/RoleManager.ts; be/src/modules/room/services/RoomService.ts; be/src/socket/handlers/roomHandlers.ts; fe/src/pages/WaitingRoom.tsx; be/tests/helpers/mockData.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`approved size/deck → seat assignment → round role state → capability projection`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R12.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked bởi OQ-02 và OQ-04; không tự chọn quota/rotation.

## Implementation plan

1. Freeze current role assignment/rotation behavior in characterization fixtures for each observed room size.
2. Wait for OQ-02/OQ-04 and R01/R06 approval of player count, narrator inclusion, quota and rotation; do not choose a two-Silencer policy.
3. Model an approved deck table separately from stable player/seat identity and explicitly define base versus current role semantics.
4. Apply the approved table at room start/round transition through the registry, then project only allowed capabilities/role data.
5. Add exhaustive approved-size/deck/rotation tests plus identity stability and secret-projection regressions.
6. Write a compatibility/migration note for existing rooms and reject unsupported sizes rather than silently reshuffling.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
