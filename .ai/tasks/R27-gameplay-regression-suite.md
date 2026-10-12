# R27 Gameplay regression suite

**Priority:** P0  
**Status:** qa
**Owner:** Codex implementation  
**Reviewer:** Codex self-review (owner-approved; not independent audit)
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

Plan revision2026-10-04 — bounded deterministic Coin model: add adjacent `CoinModel.test.ts`, with six sizes × three fixed seeds ×100mixed transfers, comparing actual GameEngine results with an independent original-allocation/spent/received model of approved20/20/20 rules. Assert input immutability, conserved color including reserve, exact receipt replay, conflicting retries/rejections, non-regifting, collection once/history and fresh next-round allocation. Pure domain fixtures only; no production rule/source/package/phase/UI mutation. Run after the source-stable browser suite, not as concurrent performance work. This is bounded seeded regression, not exhaustive proof or real Redis/browser Coin-loss coverage.

### Plan revision 2026-10-04 — every approved room size, enabled limiter

Extend the existing isolated ten-seat protocol test into six explicit5–10-seat cases, each traversing its full seat-count rounds and applicable registered phases. Expected allocation/reserve derives directly from owner20/(n−1) floor rule; explicitly assert no healer phase below7 and one/two Silencer voter exclusion at8. Keep canonical card IDs, actual guest admission, replacement at round5, optional gifts/receipt replay/locked rollback/collection/terminal and local disk recovery. Source review finds global Vitest DISABLE_RATE_LIMIT=true, so the old ten-seat fixture's claimed enabled limits were inaccurate: set only this test's environment false with scoped restoration and assert an actual premature card action is RATE_LIMITED without revision/state change before the paced next choice. Retain controlled clock/test-only heartbeat grace/mockRedis and all existing assertions; no runtime rule/source/package/art/deploy change, no silent skip or timeout increase. Clear client fixture references between cases.

### Plan revision 2026-10-02 — actual handler ten-seat ten-round protocol fixture

Add `be/tests/integration/ten-seat-game.test.ts` using the existing isolated production-handler factory, real loopback Socket.IO clients, server-issued guest admission and namespaced temporary disk with mocked Redis. Deterministic Math.random and controlled Date.now keep action rate limits distinct and persisted post-action deadlines in the future until manual transition clears them. Do not disable rate limits/scheduler or silently skip. Traverse ten rounds/all registry phases, select canonical cards, transfer finite optional coins, replace/resume a seat, verify terminal and receipt invariants. This is protocol/gameplay evidence, not browser/device or real Redis durability.

1. Catalog current unit/integration/advanced coverage and link every existing bug to a deterministic fixture, seed and clock.
2. Turn approved R01 rules into golden scenarios only after owner sign-off; keep non-rule invariants (terminal, identity, bounds, receipt) progressing.
3. Build fixture/builders that create stable player IDs, phase instances, catalog versions and isolated storage via R03.
4. Add characterization tests before each R06–R16 behavior migration, then property/fuzz cases for invariant boundaries.
5. Run every approved player size/round/role fixture and assert projection secrecy, ledger deltas and no silent skip.
6. Record unresolved rule expectations as blocked; never update expected values merely to match implementation.

## Implementation report

2026-10-04 — Added independent original-allocation/remaining/received model,6sizes×3fixed transfer seeds×100mixed commands (18cases/1800attempts). Expected results derived from approved original spending capacity/color routing/amount/self/membership rules, not from balances under test. Every operation checks input immutability, exact model balances/received ledger/conserved20each color, unique receipts, successful exact replay and rejected conflicting amount, then single collection/history and fresh round allocation. These are seeded domain regressions, not exhaustive combinations or transport/durability/load proof. Focused model plus showcase-boundary19tests PASS2.98s/buildPASS; full copied matrix pending.

2026-10-04 — Existing actual-handler protocol fixture now passes every approved5–10-seat size,45full rounds/709applicable phase visits total. Checks exact per-size remainder/allocation, no healer phase below7, one/twoSilencer voter exclusion, all canonical selections/night actions,45red receipt replays and locked rollbacks,6authentic round5narrator replacements, finite optional three-color gifts/collection/history/disk recovery and unchanged ended rejection. No runtime source/art or rule changes. Fixture explicitly overrides only its rate-limit environment to false and restores it after every case; each round demonstrates premature emotion-card RATE_LIMITED without snapshot mutation before a paced valid selection. All6cases pass35.88s with existing30s per-case limit and no skips.

2026-10-02 — Actual isolated Socket.IO ten-seat ten-round scenario passes: server-issued guest seats, all 160 phase visits, night action for each applicable shared slot, canonical situation/emotion/reflection/selfcare selection, response/reflection, seven eligible voters per ten-seat approved deck (two silencers), optional red gift per round plus first-round green/yellow, exact receipt replay without revision, locked rollback, collect/reset/history with no role mint, narrator replacement/resume at round 5, unique sender/narrator rotation and ended mutation rejection. Temp disk recovery retains ten score rounds; Redis mocked. First extra vote assertion assumed only one Silencer; fixed to approved R12 ten-seat deck of two rather than changing production eligibility. This is not the full multi-browser/real-Redis/restart/device release gate.

2026-10-02 — Latest full suite: 372 BE tests/31 files, zero skipped; FE 48 tests/6 files. Added approved night baseline, session admission/forgery/expiry/replacement/stale-generation/ownership, persisted presence and recipient secrecy over every phase/count, plus frontend cold-resume/revision/terminal regression tests. Real Redis workers also recover session hashes after kill/restart. These are not full device/browser or two-socket-backend proof; catalog/night stale-envelope/deletion and release matrix remain.

2026-10-02 — Update: 347 BE tests/27 files pass. ApprovedBaseline covers deck quotas/rotation/unique stable IDs/registry/manual vs final end; AutoAdvanceRecovery and actual socket stale-phase callbacks added. R28 now supplies separate real Redis CAS/restart evidence, not part of mocked Vitest count. Full browser/auth/catalog/night matrix remains.

2026-10-01 — 321 BE tests/24 files pass trong isolated loopback/temp root, Redis mocked. Golden coin-cycle (19 tests) kiểm nhóm 5–10, toàn bộ round tới ended, conservation/collect/history, idempotency, no-mint và rollback không trừ bonus không tồn tại. FullGameFlow giữ legacy/v0 explicit thay vì che assertions của luật mới. Chưa bao đủ approved role/night/card/privacy matrix; R01 vẫn là dependency.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

Final2026-10-04 copied clean **Y6TNuF PASS** all9install/lint/build/test commands, pinned Windows22.23.3/npm10.9.9, unchanged3locks: BE54files/581tests and FE53files/570tests. Includes all6full-round protocol cases,18model cases and1showcase boundary guard. R27 moves to QA for this bounded approved regression scope, not done/released; native/physical browser/production-SLO/migration/universal command-contract acceptance remain separate tasks. Runtime/card/asset source unchanged in this continuation.

2026-10-04 — After6size protocol expansion, main full52files/562tests PASS37.37s/buildPASS. Subsequent model/static guard add19passing focused tests; do not inherit562-source full-suite status as their final verification. Latest copied current matrix follows separately. No runtime/rules/images/card mappings changed by this continuation.

Correction2026-10-04: the earlier ten-seat fixture did NOT prove enabled rate limits: inherited Vitest DISABLE_RATE_LIMIT=true was never overridden. Earlier ten-seat gameplay assertions remain historical valid mocked-storage coverage, but their limiter claim is superseded by the explicit false environment and actual negative limiter checks above. This suite controls domain clock and test-only Engine.IO ping grace; it remains mockRedis/loopback protocol, not actual-clock/load/browser/physical-device evidence.

Fixture clock caveat: this protocol scenario injects only longer Engine.IO pingInterval/pingTimeout through the test-only isolated factory. Advancing global Date.now for rate-limit boundaries otherwise expires the client's unrelated 45s heartbeat deadline within seconds of real execution. Production ping configuration is unchanged; this is not heartbeat/real-time timeout proof. Resume uses its actual session-only ACK plus separate room_state hydration event; the replaced old socket is forcibly disconnected, so a post-disconnect ACK must not be expected. Initial fixture failures were these contract/clock mistakes, not evidence justifying weakening runtime assertions.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

2026-10-04 Codex self-review: six room sizes execute every applicable phase and all rounds without fake seats or silent skips; independent spending model distinguishes original allocation from appreciation received, protects color conservation and input immutability, checks exact retry and collection. Fixed the false historical limiter claim instead of inheriting it. Fixtures restore environment/mocks and close only owned sockets/server/temp state. Model seeds govern transfer generation; role roster is taken from actual engine assignment, not a claimed exhaustive role permutation. QA scope is documented; this is self-review, not Claude/independent approval or full41-task completion.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
