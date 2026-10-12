# R12 Role deck theo số người

**Priority:** P0  
**Status:** qa
**Owner:** Codex implementation  
**Reviewer:** Codex self-review (owner-approved; not independent)
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

Quota/rotation 5–10 and current originalRole compatibility semantics are approved by `docs/adr/R01-web-coin60-baseline-approved.md`; the historical OQ-02/OQ-04 block is superseded. Owner approved Codex self-review, recorded below; do not require an unrequested independent/Claude review. Distributed session, privacy and production migration/release gates remain in their own tasks, not reopened gameplay decisions.

## Implementation plan

Plan revision2026-10-08 — owner-approved Codex self-review identifies missing focused preferred-role quota/empty identity/immutable rejection fixtures despite the historical QA description. Extend only RoleManager.test.ts: preferred assignment for all5–10 counts, over-subscribed Narrator rejection, empty stable ID rejection and missing Narrator/Sender rotation rejection; assert input immutability. Keep approved originalRole/legacy standalone Coin initialization, runtime/deck/production untouched. Execute after the owned10-guest terminal browser finishes to avoid build/test contention. This adds source-level evidence, not independent certification or completion of R06/session/migration/release work.

1. Freeze current role assignment/rotation behavior in characterization fixtures for each observed room size.
2. Wait for OQ-02/OQ-04 and R01/R06 approval of player count, narrator inclusion, quota and rotation; do not choose a two-Silencer policy.
3. Model an approved deck table separately from stable player/seat identity and explicitly define base versus current role semantics.
4. Apply the approved table at room start/round transition through the registry, then project only allowed capabilities/role data.
5. Add exhaustive approved-size/deck/rotation tests plus identity stability and secret-projection regressions.
6. Write a compatibility/migration note for existing rooms and reject unsupported sizes rather than silently reshuffling.

## Implementation report

2026-10-02 — Implementation reconciliation: shared immutable deck table, assignment/debug cap, stable-seat admission and full rotation golden fixtures implement the approved 5–10 baseline. No extra rule or immutable-base-role reinterpretation is needed. Compatibility: getRoleDeck rejects unsupported/non-integer counts; new start uses the shared table. Existing persisted active-room roles are not reshuffled or rewritten by this change; legacy/unversioned compatibility stays under R01/R11. Changing a deck or migrating an incompatible old room requires an explicit version/migration, not automatic reassignment. Moved to qa for independent review, not done/merge/release approval. All acceptance boxes remain reviewer-owned until sign-off.

2026-10-02 — Latest continuation: found and removed a remaining hardcoded 11-seat limit in RoomService.addFakePlayers. Debug additions now cap at the shared MAX_PLAYERS=10; regression verifies a nine-seat room adds only one bot and rejects a further addition. Production debug remains disabled; no deck/quota/rotation rule changed.

Plan revision 2026-10-02: thêm RoleDeck.ts và assignment/room capacity regression. Một deck BE cho assignment/debug; cap 10 dùng chung với engine/admission/list. Không cho seat thứ 11 hoặc seat mới khi đang playing; seat cũ được reconnect khi full. Assignment từ chối stable ID trùng/rỗng. Golden nhóm 5–10 giữ quota, distinct narrator/sender và stable player identity qua toàn bộ rotation. OriginalRole vẫn là current-round compatibility field theo approval, không tự chuyển thành immutable base role. Recipient secrecy/session auth thuộc R05/R09 chưa xong.

QA evidence: `docs/qa/2026-10-02-p0-progress.md`.

## QA report

2026-10-08 — Ten new RoleManager regressions pass as part of full BE54files592tests32.18s/build: preferred-role quotas for every5–10 size, stable ordering/input immutability, unavailable second Narrator rejection, empty stable ID rejection and missing Narrator/Sender flags reject without mutation. RoleManager now33tests. Historical claim of preference coverage in the23-test suite below was overly broad; these are the first focused preferred-selection fixtures. R29 ueBCBh separately proves ten independent UI guests rotate public Narrator/Sender through all ten rounds; mocked storage and optional night actions/device limits are disclosed in R29. No role/deck/legacy Coin/runtime changes; status remains qa rather than release or dependent-task completion.

Implementation-owned verification 2026-10-02: `npm test -- --run tests/unit/ApprovedBaseline.test.ts tests/unit/RoleManager.test.ts tests/unit/RoomView.test.ts` passes 3 files / 44 tests, zero skipped. ApprovedBaseline covers each 5–10 deck across all rotations, shared transition parity, unsupported counts, duplicate stable IDs, narrator/sender separation, immutable returned deck copy, ten-seat admission/list/reconnect and debug cap. RoleManager's 23 tests cover assignment/preference/rotation boundaries. RoomView's 7 tests cover recipient hydration/secrecy for every supported count/phase, not hidden-role inference. Latest full BE result remains 41 files / 479 tests from the preceding verified slice; backend runtime unchanged here. Real R29 browser 5/10 guest role reveal is additional bounded evidence, not a distributed restart or physical-device certification. Independent review pending; session/auth and migrations remain separately scoped.

## Audit report

2026-10-08 — Owner-approved Codex self-review, NOT independent/Claude certification. Approved immutable5–10 deck and current originalRole compatibility remain unchanged. Found missing explicit preferred-role/empty-ID/immutable-rejection tests despite older broad QA wording; added10 regressions and verified the full suite/build. Do not interpret standalone legacy RoleManager coin initialization as the new-game finite pool: actual GameEngine/R27/R29 finite games separately verify allocation. Distributed session, registry/contract, saved-room migration and release acceptance remain in their respective tasks; this review adds no deployment authority and does not assert all41tasks complete. Current review supersedes historical requirement for an independent reviewer; no new owner gameplay question is opened.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

Approved quota/rotation/semantics: `docs/adr/R01-web-coin60-baseline-approved.md`. QA status means ready for independent verification of this baseline, not deployment authority or completion of R05/R09/R11.
