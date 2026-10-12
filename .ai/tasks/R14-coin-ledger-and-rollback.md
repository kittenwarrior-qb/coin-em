# R14 Coin ledger và rollback

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R07, R13

## Goal

Ledger delta/reason/round, idempotent gift/reward và checkpoint/compensation.

Plan revision 2026-10-01: ưu tiên luật đã chốt tại `docs/adr/R01-coin-cycle-approved.md`: pool 20/20/20; Người Trao Gửi giữ đỏ, người còn lại chia xanh/vàng, bỏ dư; nhận coin giữ nguyên màu; ghi nhận cuối lượt rồi thu hồi/chia lại. Bản mới không tạo coin tự động từ vote/reflection/role. Reskin R40 thực hiện sau khi runtime/UI và regression coin pass.

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

Phân phối/ý nghĩa/thu hồi đã chốt; owner xác nhận non-regift, checkpoint prev lock và giữ non-coin runtime baseline ngày 2026-10-01. Còn universal command receipts/ACK replay, session/auth và toàn bộ distributed command migration; không mở lại policy vừa được chốt.

## Implementation plan

Plan revision2026-10-03 — read-only history color correction: include existing FE GameBoard GIVE_COIN history-detail renderer and nearby regression tests. Finite transfer logs carry coinType and retain color; old legacy logs explicitly carry receiverGainsGreen. Render exact committed coinType unless that legacy receipt field exists, in which case keep its explicit green gain. No ledger mutation, new reward/conversion policy or saved-log rewrite; unknown type uses neutral coin wording. Coordinate R19 HistoryModal extraction/R23 pending lifecycle, preserving all images.

1. Inventory every gift, reward, balance mutation and rollback reversal, including direct handler writes and current log-derived arithmetic.
2. Dùng coin ADR ngày 2026-10-01 làm nguồn luật: cấp 20 đỏ cho NTG, floor(20/(N-1)) xanh và vàng cho mỗi seat khác; phần dư không cấp. Chốt mute/rollback và phân biệt số có thể trao với số đã nhận trong contract.
3. Define an immutable ledger entry and business operation key with amount/type bounds, phase/round context and compensation linkage.
4. Chuyển cả ba màu qua R07 atomic receipt+ledger; đỏ từ NTG tới người phản hồi, xanh tới NTG, vàng giữa người chơi; giữ màu nhận và không tự cộng thưởng. Chốt sổ nhận cuối lượt đúng một lần, thu hồi cả coin chưa trao và cấp lại ở lượt mới.
5. Implement checkpoint/compensation only for approved boundaries, retaining audit history and rejecting invalid dependency rollback.
6. Test ACK-loss retry, duplicate/cross-round reward, invalid amounts/types and repeated prev/next; do not use clamping to hide mismatch.

## Implementation report

2026-10-03 read-only history correction: GIVE_COIN detail no longer hardcodes green for finite red/yellow transfers. Uses committed coinType unless explicit legacy receiverGainsGreen receipt is present, then renders its green amount. Five actual-Board regressions pass for red/yellow/green/legacy/unknown and assert no gift command or log mutation. UI only; no CoinCycle/ledger/rules/card image change.

2026-10-02 — Frontend authenticated confirmation now requires the exact committed GIVE_COIN fingerprint in a valid same-room snapshot. ACK-only/invalid proof cannot clear pending Coin or show success; same-ID manual retry, journal cleanup failure recovery and late old-connection guards are tested in R17 (no ledger/rule schema change). Existing production-handler original/replayed ACK test confirms that snapshot/log contract and no second write/revision/broadcast. This supersedes the historical mounted-only/browser-reload-pending note below for authenticated guest sessions; complete browser/durable universal command coverage remains.

2026-10-02 — Continuation: socket receipt replay no longer writes a second revision or broadcasts a second appreciation event. FE retries only the same uncertain operation ID/fingerprint, can recover from the projected committed log and never infers success from balance arithmetic. Exact same round/actor/target/color/amount remains required. Pending browser-reload recovery and universal receipts are not complete; no Coin rule or ledger-history schema changed.

2026-10-02 — Update: owner confirmed non-regift receipts and checkpoint prev lock; no longer temporary/unapproved. Redis revision CAS and real Redis recovery/retry evidence added. FE disables prev and explains the approved boundary; docs/qa/2026-10-02-p0-progress.md supersedes earlier pending-rule/no-CAS notes.

2026-10-01 — Implemented coin-cycle-60/v1 và rulesVersion web-16-coin60/v1 cho ván mới; explicit legacy/v0 giữ compatibility. Cấp đúng 20 mỗi màu tính cả phần dư; gift giữ màu, ghi receipt/requestId/round; no role/Healer/NTG/reflection auto bonus; collect một lần và giữ history, round sau cấp lại. FE đủ ba màu, kiểm ACK rồi mới báo success, summary dùng số đã nhận thay vì số dư thu về 0. Chính sách tạm: không tái trao Coin đã nhận và khóa prev sau gift/collect, đang hỏi owner; không coi phần này đã được duyệt. Distributed atomicity/compensation còn pending.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

2026-10-08 — R29 QMyRqa current-source actual5guest/5round/15gift browser PASS254.49s. In addition to red ACK-loss/reload exact receipt recovery without resend, first green gift explicitly retries unchanged same-ID/full payload over the wire while giver projections are held; duplicate ACK validates exact receipt and clears journal, spendable decrements once. Original1ACK dropped per fault; final per-seat/color receipts match only15planned gifts, no doubled Coin. Backend command/storage unchanged; mockRedis/disabled limits/blockedCDN/simulated Chromium, not real Redis duplicate durability/device/general packet-loss proof. Scoped R17 fix removes only stale Coin-warning after confirmation, no ledger/rules/art mutation.

2026-10-08 — R29 MDqvvv positive5case PASS233.43s with one actual matching gift ACK plus sender projection dropped. Pending journal survives reload; explicit UI check confirms exact hydrated receipt without a second give_coin emission. Red remains19, all5rounds total15gifts/15received and exact per-seat/color summaries. Real browser protocol to registered handlers but mocked Redis/rate limiter disabled; not real durable commit/wire duplicate replay/offline gifting/general packet-loss certification. R21 notice-only responsive repair does not alter ledger or transaction semantics; task remains in progress.

2026-10-08 — R29 ten-guest ueBCBh PASS557.12s total:30actual UI gifts/receipt viewers across10rounds, exact own-round/final per-seat/color summaries, share2each green/yellow reallocation and reload1remaining/checkpoint lock. Original pool formula leaves2unused per green/yellow; report records expected allocation, not direct storage instrumentation. This extends positive receipt proof to maximum approved room size; mockRedis/disabledlimits/device/ACK-loss/universal command limitations remain. No ledger/runtime change and no task/release sign-off.

2026-10-08 — Additional R29-owned actual UI evidence: three-color terminal fixture YIm8k6 PASS1case/213.41s total,15gifts/15received previews across5rounds, all own-round and final per-seat/color receipts match independent planned transfers. Round allocations20red/5green/5yellow re-established; giver cold reload retains4green/4yellow, previous remains disabled. Original optional zero-gift scenario separately passes. This closes the bounded positive UI receipt gap, not universal command receipt migration, ACK-loss browser recovery, actual Redis browser durability, physical devices or task/release acceptance. No ledger/runtime/art change; full report and preserved failed precursor are in R29.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
