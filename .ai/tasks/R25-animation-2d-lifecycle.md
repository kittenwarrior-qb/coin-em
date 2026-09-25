# R25 Animation 2D lifecycle

**Priority:** P1  
**Status:** planned  
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

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
