# R14 Coin ledger và rollback

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R07, R13

## Goal

Ledger delta/reason/round, idempotent gift/reward và checkpoint/compensation.

## Current evidence

Coin type/bounds, reward dedupe và rollback hiện có thể sai/double; handler sửa reward trực tiếp.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R14)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R07, R13.
- be/src/modules/game/commands/GiveCoinCommand.ts; be/src/modules/game/commands/NTGVoteCommand.ts; be/src/modules/game/commands/ShareReflectionCommand.ts; be/src/modules/game/services/RewardCalculator.ts; be/src/modules/game/engine/GameEngine.ts; be/src/socket/handlers/gameHandlers.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`request receipt → validate amount/type → atomic ledger delta → snapshot/compensation → projected balance`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R14.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked bởi OQ-03/OQ-05 về red coin, reward stacking/mute và rollback window.

## Implementation plan

1. Inventory every gift, reward, balance mutation and rollback reversal, including direct handler writes and current log-derived arithmetic.
2. Wait for OQ-03/OQ-05 to approve red coin, stacking/mute and rollback window; create fixtures with unknown outcomes marked blocked.
3. Define an immutable ledger entry and business operation key with amount/type bounds, phase/round context and compensation linkage.
4. Move one approved gift/reward path through R07 atomic receipt+ledger commit; derive projected balances from committed entries.
5. Implement checkpoint/compensation only for approved boundaries, retaining audit history and rejecting invalid dependency rollback.
6. Test ACK-loss retry, duplicate/cross-round reward, invalid amounts/types and repeated prev/next; do not use clamping to hide mismatch.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
