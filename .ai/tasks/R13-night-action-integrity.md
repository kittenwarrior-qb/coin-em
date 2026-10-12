# R13 Night action integrity

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R12, R07

## Goal

Actor-scoped night actions, resolver và tie-vote policy.

## Current evidence

Heal trước silence không bảo vệ; mute state/reward giả định một Silencer.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R13)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R12, R07.
- be/src/modules/game/engine/ActionValidator.ts; be/src/modules/game/commands/HealCommand.ts; be/src/modules/game/commands/SilenceCommand.ts; be/src/modules/game/commands/VoteCommand.ts; be/src/modules/game/services/RewardCalculator.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`night actor intent → command queue → resolver by approved rule → scoped effects/capabilities`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R13.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Owner-approved web baseline giữ target restrictions/shared night slot và heal-before-silence hiện tại; không tự thêm future protection, multi-actor resolver hoặc tie policy mới. Outcomes khác vẫn cần ADR riêng.

## Implementation plan

Plan revision 2026-10-02: ADR `docs/adr/R01-web-coin60-baseline-approved.md` supersedes the proposed new multi-actor resolver. Characterize and secure the approved shared-slot behavior first; no new outcome or coin reward is introduced. Add `be/tests/unit/ApprovedNightBaseline.test.ts` alongside R27. Stale action envelopes and full socket/fault matrix remain dependencies on R04/R07.

1. Characterize Heal, Silence, Vote and reward behavior, including multiple actors and missing/disconnected targets.
2. Wait for OQ-02/OQ-04 to specify targets, protection order, tie/zero/disconnect and Guide behavior; make each unresolved outcome blocked.
3. Represent actor intents per phaseInstance and resolve them once through R07 command serialization rather than global booleans.
4. Implement approved validation/capabilities, then a deterministic resolver that emits scoped effect records for subsequent rewards.
5. Add fixtures for heal-before-silence, two Silencers, duplicate/stale/unauthorized action, tie and disconnect according to approved rules.
6. Do not change rewards or public secrecy until R14 and the approved rule fixture consume the resolver output.

## Implementation report

2026-10-02 — Characterization fixtures for 5–10 seats: phase/actor/self/public/missing target rejection, immutable rejected state, exactly one shared Silence completion (including two Silencers), self-heal, duplicate Heal, frozen heal-before-Silence outcome and no new Coin minting. This is not a new resolver and does not certify the complete transport/fault matrix.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
