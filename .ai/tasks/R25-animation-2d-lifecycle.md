# R25 Animation 2D lifecycle

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R17, R19, R24

## Goal

Đưa motion vào lifecycle an toàn và tạo đường character/brand 2D có thể thay runtime: 7 nhân vật iconic là mục tiêu nội dung, nhưng MVP chỉ có **một** nhân vật với `idle`, `blink`, một signature action và `success/reaction`. Không mặc định Rive: chọn engine sau prototype gate có bằng chứng file/load/FPS, mobile, accessibility, license và khả năng duy trì.

## Current evidence

Effect có thể replay/stall qua next/prev/hydrate; asset load có thể chặn game.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R25)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R17, R19, R24.
- fe/src/components/game/FlipCard.tsx; fe/src/components/game/RandomSituationFan.tsx; fe/src/components/game/TableBoard.tsx; fe/src/components/game/PhaseCelebration.tsx; fe/src/hooks/useCoinRewardPreview.ts
- `docs/research/open-source-2d-character-animation.md` (matrix và source).

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`committed event ID → transition controller → motion/reduced-motion branch → cleanup/fallback`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

Character presentation flow (đề xuất, không phải gameplay contract):

`committed projection/capability → CharacterMotion adapter → engine mapping hoặc PNG/WebP fallback → visual completion only`

```ts
type Emotion = 'neutral' | 'joy' | 'calm' | 'sad' | 'surprised'; // catalog owner chốt
type CharacterMotion = {
  setEmotion(emotion: Emotion, options?: { intensity?: number }): void;
  playAction(action: 'idle' | 'blink' | 'signature', options?: { eventId?: string }): void;
  react(reaction: 'success' | 'acknowledge', options?: { eventId?: string }): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
};
```

Tên emotion/action cuối cùng, mapping event và policy dedupe lấy từ catalog/contract được duyệt. `eventId` chỉ để controller dedupe effect; runtime không được ACK, advance phase, cộng coin hay trở thành nguồn sự thật.

## Technology decision matrix

| Option | License/cost risk | Web/React | Mobile | AI automation + input | Maturity/maintenance | Recommendation |
|---|---|---|---|---|---|---|
| **PNG/WebP sprite + CSS** | Asset license còn phải quản; runtime không thêm vendor cost | Native React/CSS, không WebGL | Web/PWA/Capacitor qua browser; ít GPU | Agent có thể tạo manifest/crop/state mapping; không phải auto-rig | Cao, ít dependency | **Baseline/fallback bắt buộc** và lựa chọn tiết kiệm cho MVP nếu motion đơn giản |
| **Rive** | Runtime MIT, nhưng editor/ship/export và mức giá phụ thuộc plan; kiểm lại trước mua | Official React wrappers cho WebGL2/canvas, `.riv`, state machine/data binding | Official Apple/Android/React Native runtimes | Không thấy bằng chứng official về PSD import, auto-rig CLI/MCP end-to-end; editor-driven | Cao, nhiều runtime official | Candidate mạnh nếu designer chấp nhận editor/cost; **không mặc định** |
| **Spine** | Proprietary editor/runtime license; freeze editor/runtime cùng version | Official TypeScript/Pixi/Phaser/WebGL paths, JSON/binary + atlas | Official Android/iOS/Flutter và nhiều engine | JSON inspectable, nhưng không có claim official auto-rig/MCP; rig vẫn artist work | Rất cao | Candidate production nếu đã có animator/license; không phù hợp ngân sách tối thiểu đầu tiên |
| **Iki (`zeikar/iki`)** | MIT, model do team sở hữu | TypeScript + WebGL2 npm engine, `.iki` documented JSON | Chỉ WebGL web evidence; Capacitor browser cần benchmark riêng | Role-named PNG/PSD → auto-rigger; bundled stdio MCP `auto_rig_from_layers` | Early 0.x, schema settling, repo nói chưa production ready | Prototype/agent R&D only; không ship default cho beta |
| **Stretchy Studio** | MIT tool; asset/See-Through model rights tách riêng | Browser editor/WebGL; repo nêu Spine 4 JSON export, không runtime package claim cho app | Chưa có evidence official native runtime; benchmark web only | PSD/PNG, See-Through, DWPose/heuristic auto-rig; human refine explicitly required | Early/small project | Dùng để explore/authoring/export test, không chọn runtime EmCoin cho MVP |
| **Inochi2D** | BSD-2-Clause SDK; model license do artist/rigger quyết định | SDK D/native-first; không có official React/Web runtime path được xác nhận trong nghiên cứu | Official Godot binding; native SDK releases | Layered art/mesh parameter rig; không thấy MCP/CLI auto-rig official | Established OSS, nhưng integration mismatch | Reserve nếu chuyển native/Godot; không phải đường React MVP |

Source/nuance đầy đủ ở research document. “AI automation” chỉ mô tả khả năng tool công bố, không phải cam kết chất lượng final.

## AI-assisted asset pipeline and human gates

1. **Concept:** AI có thể tạo moodboard/variant theo brief đã duyệt. Human owner duyệt bản sắc 7 nhân vật, văn hóa/độ tuổi, quyền sử dụng và tránh text/card gameplay sai.
2. **Layered asset:** AI có thể đề xuất/tách lớp PNG/PSD hoặc dùng tool decomposition; human cleanup phần bị che (tóc/cổ/tay), alpha halo, symmetry, naming/draw order và anatomy. Một ảnh phẳng không tự trở thành production rig.
3. **Rig:** Iki/Stretchy có auto-rig documented; agent có thể gọi MCP/CLI khi tool đã cài. Human rigger kiểm pivot, mask, mesh, blink/miệng, deformer và tất cả extreme pose. Không claim “PSD → polished 7 characters” E2E.
4. **State mapping:** Agent có thể tạo manifest, validate filenames/schema và skeleton adapter fixture. Human + gameplay owner duyệt emotion/action semantics; committed event mới được map effect.
5. **Web runtime:** Agent có thể implement adapter, lazy loader, dedupe, error/fallback and tests. Human QA chạy Chrome/Safari/Android/iOS/Capacitor device; WebGL/context-loss và visual feel không được suy từ unit test.
6. **Production:** E2E tự động hóa thực tế nhất là validation/export hash/asset budget/adapter tests; art cleanup, creative approval, final rig QA và rights clearance vẫn là human gates.

## Prototype gate (before choosing a vendor or rigging all 7)

### Deliverable

- One approved character, source-layer manifest and rights record; runtime artifact version/hash and a separate PNG/WebP fallback.
- `idle`, randomized/periodic `blink`, one signature action, one success/reaction; no dependency on a game phase timer.
- Engine adapter plus a fake adapter contract test; normal and `prefers-reduced-motion` behavior.

### Exit criteria

- **Correctness:** `setEmotion` retains/replaces visual state as specified; each committed `eventId` causes at most one action/reaction; hydrate/reconnect renders baseline only; engine load/error/WebGL context loss leaves game interactive and shows static fallback.
- **Performance measurement:** report cold/warm cache transfer bytes and decoded bytes for the single-character path; target compressed character artifact **≤ 500 KB** and fallback **≤ 250 KB** (exceptions require owner sign-off). On one named low/mid Android device plus desktop Chrome at 4× CPU throttle, record 30 s idle + 10 action bursts: median frame rate ≥ 55 FPS, p95 frame time ≤ 25 ms, no recurring long task > 50 ms attributable to character motion. These are provisional budgets, not claims about all devices.
- **Loading:** motion must not block first game interaction; report asset load completion and fallback time under fast and simulated slow network. Lazy load only when character is visible/needed; no preload of all seven.
- **Accessibility:** honor `prefers-reduced-motion` by static pose or one short non-looping transition; do not encode essential instruction/status only in motion; keep alt/text equivalent where character conveys outcome; pause/degrade off-screen/hidden animation where engine supports it.
- **Product/operations:** license/cost checked on the purchase date; lock exported artifact/runtime versions; test one mobile web and one Capacitor/native route if native remains in scope. No vendor adoption until evidence is attached to QA report.

## Low-budget decision

Start with layered PNG/WebP + CSS/sprite fallback and the adapter, then prototype **Iki** only as a bounded agent-automation experiment if its toolchain can produce the approved character. Rive/Spine enter only if their prototype materially wins the stated gate and the owner accepts current editor/license cost. This avoids paying/rigging seven characters before proving mobile fit; it does not promise Iki auto-rig will reduce human cleanup.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R25.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Motion direction and budgets need UX approval; no reward popup before committed event.

## Implementation plan

Plan revision2026-10-09 — after the frozen-source short matrix completes, admit existing useBoardController and adjacent controller tests for presentation dedupe. Derive forward progression only from server phaseView.position plus room/viewer/currentRound/status, without a frontend phase-order table. Hydration/reconnect/new room/viewer/invalid projection baseline without motion; same-round rollback/revisit cannot replay completion; uninterrupted next round retains existing role-reveal celebration. Use one bounded previous-snapshot/high-water ref and the existing CELEBRATE_ON_ENTER list/local run counter. Add before-fix rollback/reentry/scope/next-round regressions. No socket/phase/role/Coin mutation, new visual/art/vendor or forged phase-instance fields. This is existing completion lifecycle, not the deferred new-character/device gate.

Plan revision2026-10-09 — existing celebration deadline only: PhaseCelebration currently restarts its duration timer when durationMs changes, even after a completed run. Preserve original Rive artifact/state machine/layout and runId API; capture one monotonic deadline per run, mark completed runs skipped, and rearm remaining time rather than restarting on same-run effect reconfiguration. React StrictMode cleanup/setup must still rearm the active remaining deadline, not suppress the only timer. Add adjacent tests for mid-run duration changes, after-completion changes and StrictMode cleanup. No new character/art/vendor, gameplay/phase trigger change, per-phase completion acceptance or real Rive/device-performance claim. Apply only after the owned model/sticker browser run finishes so its source remains stable.

Plan review/revision 2026-10-02 — begin only existing finite-Coin feedback lifecycle against implemented R17/R19 and read-only R24 inventory. Extend scope to GameBoard hook options and nearby tests. Replace legacy automatic-bonus popup guesses with visible committed GIVE_COIN under approved web-16-coin60/v1. Hydration, room/round/viewer changes and reconnect baseline history; duplicate/revisited phases cannot replay receipts. Presentation only, no mutation/ACK/phase authority or card asset changes. Existing reveal callback remains no-op because role/guess bonuses are zero. Character/engine/prototype/device gates remain deferred; existing Rive usage does not select a vendor. This review permits only the bounded lifecycle slice.

1. Inventory the current FlipCard/fan/table/celebration/reward effects and record which confirmed projection or committed event, if any, owns each visual trigger.
2. Define a small controller that consumes only confirmed projection plus a dedupe policy for event IDs; hydration/reconnect establishes a baseline and never replays history.
3. Implement the engine-neutral `CharacterMotion` adapter and a static PNG/WebP adapter first; keep phase, reward and socket authority outside the adapter.
4. Define the Rive/Spine/Iki/Stretchy prototype candidate and exact artifact/license/version record from the matrix; do not add a vendor runtime before that selection is approved.
5. Prepare one approved layered character and fallback frames, then rig only `idle`, blink, signature and success/reaction; human review validates layer cleanup, rights, mesh/pose and emotional semantics.
6. Lazy-load the selected runtime only when visible, honor `prefers-reduced-motion`, and provide static fallback on load error, WebGL/context loss or off-screen degradation.
7. Test continuous next/prev, repeated committed event, stale hydrate/resume, unmount/navigation, reduced motion and runtime failure; assert gameplay stays interactive and effects never become an ACK/transition gate.
8. Benchmark the specified cold/warm transfer, decoded bytes, 30-second idle plus ten bursts, FPS/frame-time and long tasks on the named Android/desktop throttle; capture browser/mobile evidence.
9. Attach artifact hash, source/license record, contract tests, profiler/video, fallback result and rollback-to-static decision to QA; select the engine or defer all remaining six characters only after every prototype exit criterion passes.

## Implementation report

2026-10-09 existing phase-completion presentation follow-up: useBoardController now tracks server phaseView.position high-water within room/viewer/round. Rollback/reentry cannot create a fresh completion burst; reconnect/new room/viewer/invalid position/missing round/status baseline without motion. Continuous adjacent new round retains existing role-reveal celebration; jumped-round history does not. Baseline/offline cancels active old-scope motion via run0, while a separate monotonic local sequence prevents recycled run IDs colliding with completed/skipped PhaseCelebration state. No phase-order table/wire/gameplay/asset changes. Constant-size refs only; deferred character/device work unchanged.

2026-10-09 — existing PhaseCelebration captures one performance.now deadline per run. Same-run duration reconfiguration rearms only remaining time and completed runs stay skipped; StrictMode effect cleanup/setup preserves one timer. Original Rive URL/state machine/layout/default2800ms, hidden/reduced-motion suppression and pointer-events-none retained. No phase trigger/gameplay authority, artifact or character changes; full phase-instance dedupe and real runtime/device acceptance remain separate.

2026-10-02 — Finite-Coin receipt feedback now uses only newly visible committed GIVE_COIN with current round, receipt ID, valid positive integer amount and original color under web-16-coin60/v1. Dedup uses round/receipt rather than timestamp. First hydration, reconnect, room/round/viewer/rules changes baseline logs; phase revisits and duplicate receipts do not replay. Legacy NTG/role/guess/Silencer automatic-bonus guesses and receiver-green conversion no longer generate a popup in this rules version. Reveal completion callback is a compatibility no-op, not a reward authority. No server balance or Coin contract changed.

Existing confetti no longer fires on first board hydration/reconnect/terminal phase. PhaseCelebration honors reactive reduced motion, clears idle/unmount/hidden timers and does not replay a skipped run when motion/tab visibility returns. Existing Rive artifact/runtime/imagery are untouched; this does not choose a character engine. 18 receipt-hook + 4 celebration lifecycle regressions pass. Frontend-design guided preservation of approved cartoon assets and non-essential motion semantics. Character adapter/approved layered asset, lazy/error fallback, full phase-instance completion dedupe, vendor/license decision, Android/desktop profiler and physical-device prototype gates remain. No acceptance/done.

Type scope extension: `fe/src/components/game/types.ts` adds optional data.requestId to the existing projected log type, matching actual CoinCycle committed GIVE_COIN receipts already consumed by useSocket; no new wire field. Test-only legacy reward fixtures now supply required actorId rather than weakening the contract. Initial build caught both omissions; corrected before re-verification.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

Observed2026-10-10 final phase-source browser matrix all11short casesPASS507.97s, including real5/10guest rollback/reentry/reconnect/room replacement plus public/PWA/showcase/admin boundaries. Original limits preserved, no app/build mutation or concurrent owned heavy suite. Reports/limits in R29; current copied clean verification runs afterwards. This does not turn mocked Rive tests into real Rive/error/device or deferred character acceptance.

Final stable-phase source2026-10-09: fullFE57files623testsPASS24.81s, r25-final-phase-frontend.json; TypeScriptbuild exit0, full lint earlier exit0 and final four changed-file lint exit0 after optional-round guard. ViteproductionbuildPASS33.41s. Five controller regressions cover rollback, room/viewer/invalid/missing round, adjacent-next-round once-only, reconnect/history jumps, and cancellation with monotonic fresh run IDs; seven deadline/component tests include StrictMode/reducedmotion/hidden/unmount. Rive mocked, not real runtime/device profiler. Entire current11short browser repeat follows after source/build frozen; prior536.52s browser run is pre-phase-dedupe evidence only.

Phase-dedupe pre-fix controller regression2026-10-09 **4FAIL/9PASS**, r25-phase-before.json retained: rollback, room/viewer scope, repeated next-round role entry and skipped-round hydrate replay. Initial fix focused20PASS2.71s; TypeScript correctly rejects optional currentRound assigned to numeric snapshot. Added explicit finite-positive round guard and missing-round regression, no type suppression; fifth test ensures offline/new-room cancellation and monotonic fresh run IDs. Intermediate fullFE623PASS23.26s predates this final guard/test edit; final stable-source verification is recorded separately.

Final current-source2026-10-09: full ESLint0diagnostics/TypeScript build-mode exit0, ViteproductionbuildPASS28.68s. FE618/BE602 regular tests passed separately; not combined clean-install/Linux/full-browser or real Rive/device acceptance.

2026-10-09 — before fix, two new duration-replay tests FAIL as expected (5PASS/2FAIL, report r25-deadline-before.json retained); after fix all7focusedPASS1.74s including StrictMode. FullFE57files618testsPASS27.40s (r25-deadline-frontend.json); Rive mocked, not real runtime/FPS proof. Read-only asset manifest80local/200faces and full573images/15516248bytes/originalhash7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8/missing0/decode0/reskins0PASS. TypeScript/lint/build result recorded after completion separately.

Implementation verification: full frontend 17 files / 155 tests pass, no skipped; backend 40 files / 478 tests rerun passes. Both builds pass, frontend lint 0 errors/8 baseline warnings. The 22 new jsdom tests cover receipt hydration/reconnect/scope/duplicate timestamps, legacy bonus suppression, malformed/out-of-round/missing receipt/terminal/unknown rules, idle deadline, reduced-motion return, hidden return and unmount. Rive is mocked: no real runtime/error/FPS/device/brand approval claim. Audit script confirms 573 images, 15,516,248 bytes, original aggregate hash `7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8`, no image reskins/decode errors. Rollback is targeted UI source reversion only, without changing persisted receipt/balance/catalog data.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

Phase-presentation self-review2026-10-09: server positions supply ordering; highestPosition never decreases within the current admitted round, so rollback cannot manufacture a completion event. Room/viewer discontinuity/reconnect/invalid optional round resets baseline and active presentation, not server state. One-step next-round continuity retains the existing eligible role-reveal burst, skipped history does not replay it. Local sequence stays monotonic even when run0 cancels motion, avoiding collision with skipped/completed run IDs. Constant-memory refs, no identity/role/Coin/phase command or new artwork. Still not device/runtime-error/new-character acceptance.

2026-10-09 owner-approved self-review: durationMs must configure the next run rather than extend/replay an already-started run. Monotonic per-run deadline survives development StrictMode cleanup/setup; expiration marks the run skipped so later reconfiguration cannot remount motion. Bounded constant ref state, no server/event/Coin mutation or new artwork. Mocked Rive tests do not close real asset-error/device/prototype gates. Frontend-design skill guided preservation of existing cartoon motion and real presentation semantics, not a new visual direction.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
