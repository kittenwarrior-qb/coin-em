# Nghiên cứu animation nhân vật 2D cho EmCoin

**Ngày nghiên cứu:** 2026-09-09  
**Phạm vi:** web React/Vite hiện tại, đường mobile PWA/Capacitor sau beta; không thay đổi gameplay, dependency hay source.  
**Câu hỏi:** tạo 7 nhân vật cảm xúc mang tính thương hiệu theo cách tiết kiệm, có thể dùng trong gameplay nhưng không khóa gameplay vào một vendor.

## Kết luận ngắn

Không có bằng chứng để chọn Rive làm mặc định, hoặc để hứa AI làm trọn vẹn “ảnh phẳng → 7 rig production” không cần người. MVP nên tách **contract runtime** khỏi gameplay, xây static PNG/WebP fallback trước, rồi thử một nhân vật. Rive và Spine là candidate production có authoring/runtime mạnh; Rive có official React/native runtimes nhưng editor shipping hiện có chi phí, Spine rất mature nhưng license riêng. Iki là lựa chọn hiếm có MCP/auto-rig và format mở, song chính repo mô tả 0.x/chưa production-ready. Stretchy Studio tốt cho thử PSD/mesh/auto-rig, nhưng là authoring experiment; Inochi2D open-source established nhưng native/D-first không phải React web path đơn giản.

## Ranh giới cần giữ

| Khái niệm | Agent/AI có thể hỗ trợ | Vẫn là human/product gate |
|---|---|---|
| Tạo asset | concept/moodboard/variant, có thể đề xuất layer decomposition | style guide, quyền/IP/consent, không dùng text/card canonical chưa duyệt |
| Tách layer | dự đoán/tạo PSD/PNG layers, rename/manifest validation | inpaint phần che khuất, edge/alpha, draw order, anatomy và final source cleanup |
| Auto-rig | generate skeleton/parameter initial (Iki/Stretchy công bố) | pivot, mask, mesh weights, eye/mouth, extreme poses, polish và review trên thiết bị |
| Runtime | scaffold adapter, loader, fallback, test/benchmark collection | visual quality, real device QA, motion semantics/accessibility, release acceptance |
| E2E | validation/export hash, lint/schema, adapter contract/effect dedupe | không có bằng chứng one-click pipeline cho arbitrary EmCoin art ra rig production; creative/rights approval không tự động hóa |

Animation không thay đổi phase, reward hoặc authority. Gameplay chỉ phát `committed event ID`/projection; controller dedupe theo policy; adapter gọi engine; lỗi/degrade không block action game.

## Contract đề xuất (vendor-neutral)

```ts
export interface CharacterMotion {
  setEmotion(emotion: string, options?: { intensity?: number }): void;
  playAction(action: 'idle' | 'blink' | 'signature', options?: { eventId?: string }): void;
  react(reaction: 'success' | 'acknowledge', options?: { eventId?: string }): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
}
```

- Các string thực tế phải lấy từ catalog/version được duyệt, không hardcode cảm xúc thành luật game.
- Engine adapter map contract này sang state machine/animation clip/parameter riêng. Adapter PNG/WebP luôn tồn tại để asset/WebGL/vendor error không biến thành gameplay outage.
- `eventId` không là ID runtime toàn cục: chỉ controller dùng để không replay `reaction` sau hydrate/reconnect. `idle` và pose baseline không cần replay event lịch sử.

## Matrix lựa chọn

| Lựa chọn | License/cost | Editor, input, export | Web/React và mobile | State/maturity | AI/agent | Kết luận |
|---|---|---|---|---|---|---|
| PNG/WebP sprite + CSS | Không có license runtime mới; mỗi asset vẫn cần rights record | Photoshop/GIMP/Figma tùy team; raster versioned assets | Browser React, PWA và Capacitor WebView; không cần WebGL | CSS keyframe/state in adapter; mature nhất vì ít moving parts | Tốt cho manifest/crop/state mapping; không phải rig | **Baseline và fallback bắt buộc**, rẻ nhất nếu chỉ idle/blink/action ngắn |
| [Rive](https://rive.app/docs/runtimes/getting-started) | Official runtimes MIT, nhưng [pricing](https://rive.app/pricing) hiện ghi editor free để tạo và paid plan để ship/export `.riv`; verify again at purchase | Rive editor; PNG/JPG/WebP/SVG import, `.riv` runtime export, `.rev` backup; docs không chứng minh PSD import/auto-rig/MCP | Official [React](https://rive.app/docs/runtimes/react/react) WebGL2/canvas wrappers; official Apple/Android/React Native runtimes | Editor state machine/data binding; current docs mark legacy Inputs deprecated for new projects; high ecosystem maturity | Platform has Agent plans, but no evidence here for production PSD→rig agent CLI/MCP pipeline | Strong production candidate when authoring/cost accepted; **not default** |
| [Spine](https://esotericsoftware.com/spine-runtimes) | Proprietary editor/runtime agreement; distributor needs correct Spine license at integration; version lock-step recommended ([runtime repo](https://github.com/EsotericSoftware/spine-runtimes)) | Editor exports JSON/binary + texture atlas; JSON human-readable but larger/slower than binary ([format](https://esotericsoftware.com/spine-json-format)) | Official TypeScript/Web Canvas/WebGL plus Pixi/Phaser; official iOS/Android/Flutter/toolkit list | Animation state, blend/procedural skeleton; very mature repo/tool ecosystem | JSON can be inspected/tooling-assisted; no official auto-rig/MCP claim found | Best when an animator and budget already exist; not low-cost first experiment |
| [Iki](https://github.com/zeikar/iki) | MIT; `.iki` documented JSON and team owns models | Layered role-named PNG/PSD, headless editor, validates/exports `.iki` | TypeScript/WebGL2 npm runtime; mobile is browser/WebView hypothesis needing test, not official native SDK evidence | Parameter-driven blink/gaze/lipsync/head-turn; 0.1.x/v1 schema still settling and repo says not production ready | Documented `@ikijs/mcp` stdio server + `auto_rig_from_layers` | Best bounded R&D/agent prototype; do not make beta dependency |
| [Stretchy Studio](https://github.com/MangoLion/stretchystudio) | MIT source tool; decomposition source/art rights separate | PSD/PNG or `.stretch`, mesh deformation, may export Spine 4 JSON per README | Browser editor/WebGL; no official standalone app runtime/native support found in source reviewed | Timeline-first mesh animation; early/small project; its auto-rig plan says no tool fully solves arbitrary polished auto-rig | See-Through + DWPose/heuristic auto-rig; README explicitly asks users to refine joints/mesh | Use to explore authoring/export, not as EmCoin runtime default |
| [Inochi2D](https://github.com/Inochi2D/inochi2d) | BSD-2-Clause SDK; [legal info](https://github.com/Inochi2D/inochi2d/wiki/Legal-Info) says model license is set by artist/rigger | Inochi Creator/pup standard; layered art mesh parameters | SDK written in D with native static/dynamic builds; official Godot binding documented. No official React/web path confirmed here | Established OSS real-time puppet standard; releases exist, but web integration mismatch | No official MCP/auto-rig evidence found | Consider for native/Godot project, not current React MVP |

## Evidence notes by option

### Rive

- Rive says official runtimes are MIT and cover Web, React, React Native, Apple and Android; its React package wraps WebGL2 and exposes control through `useRive`. Sources: [runtime licensing/platform list](https://rive.app/docs/runtimes/getting-started), [React runtime](https://rive.app/docs/runtimes/react/react).
- Rive editor produces a binary `.riv`; state machines are visual state/transition graphs. Current editor docs prefer Data Binding over legacy Inputs for new work. Sources: [format](https://rive.app/docs/runtimes/advanced-topic/format), [state machine overview](https://rive.app/docs/editor/state-machine/state-machine).
- “Runtime MIT” does not mean authoring/ship is cost-free: pricing is a live business term. The observed page says Cadet is $9/seat/month and includes `.riv` export; record the date/plan at purchase rather than copying price as a permanent fact. [Pricing](https://rive.app/pricing).
- Rive state machine must remain a visual implementation. It may receive adapter calls, but it must never decide EmCoin phase/reward, because Rive itself notes state is indirectly controlled at runtime and is meant to avoid breaking designer changes. [State machine playback](https://rive.app/docs/runtimes/state-machines).

### Spine

- Spine officially supports web routes including TypeScript, Web Canvas/WebGL, Pixi and Phaser, plus Android/iOS/Flutter and game engines. It exports skeleton data (JSON/binary) and atlas; JSON is inspectable but binary is smaller/faster. Sources: [runtimes](https://esotericsoftware.com/spine-runtimes), [JSON format](https://esotericsoftware.com/spine-json-format).
- It is a mature production candidate, but license is not simply open-source: the official runtime repo describes licensing rules and recommends freezing editor/runtime versions together. [Spine runtimes repository](https://github.com/EsotericSoftware/spine-runtimes).
- No official source reviewed here establishes an auto-rig, agent or MCP workflow. Treat generated Spine JSON as an engineering format, not proof that agent-generated rigs are safe or supported.

### Iki

- Iki advertises MIT license, layered PNG/PSD import, WebGL2 TypeScript runtime and `.iki` plain documented schema. Its MCP server supports read/validate/`auto_rig_from_layers`; the auto-rigger can wire blink/gaze/lipsync/head-turn/brows. [Iki repository](https://github.com/zeikar/iki).
- The same source explicitly labels packages 0.1.0, schema still settling and “not production ready.” This outweighs the attractive automation path for beta risk.

### Stretchy Studio / layer decomposition

- Stretchy Studio is MIT, accepts PSD/PNG and emphasizes See-Through segmentation, DWPose/heuristic auto-rig, mesh deformation and Spine 4 export. [Repository](https://github.com/MangoLion/stretchystudio).
- The cited project says See-Through is trained for anime/VTuber-style art and may not decompose other styles correctly. Its own [auto-rig plan](https://github.com/MangoLion/stretchystudio/blob/master/docs/live2d-export/AUTO_RIG_PLAN.md) says polished rigs from arbitrary styles still need human finishing. Do not send proprietary art to an external demo/model without owner permission.

### Inochi2D

- Inochi2D deforms 2D meshes from layered art through parameters and is BSD-2-Clause; the official repo documents native D builds and Godot binding. [Repository](https://github.com/Inochi2D/inochi2d), [license](https://github.com/Inochi2D/inochi2d/blob/main/LICENSE).
- That proves a credible open source runtime, not a verified React/WebGL package or agent workflow. Its legal page also separates tool license from model rights. [Legal info](https://github.com/Inochi2D/inochi2d/wiki/Legal-Info).

## Recommended staged plan

1. Establish names, silhouettes, source rights and layered-art naming conventions for the seven characters; do not change card/gameplay catalog.
2. Build only the adapter and static fallback contract. Use a non-authoritative local controller driven by committed events.
3. Select one representative character and produce an approved layered source plus fallback frames.
4. Prototype at most two engines: low-budget path = static fallback + Iki experiment; only add Rive or Spine if the owner accepts its live license/cost. Stretchy can produce an export experiment but is not the in-app runtime decision by itself.
5. Measure transfer/decode, FPS/frame time, context-loss/fallback, reduced motion and mobile WebView. Keep source, export, engine and measurements versioned.
6. Choose one engine only if it passes the R25 gate. Otherwise ship the static fallback and retain upgrade path. Rig the remaining six only after the representative production rig and QA are signed off.

## Prototype metrics and accessibility

| Area | Provisional gate | Evidence |
|---|---|---|
| Artifact | compressed character <= 500 KB; static fallback <= 250 KB | network transfer + decoded memory estimate; artifact/version/hash |
| Rendering | median >=55 FPS; p95 frame <=25 ms; no recurring character-motion long task >50 ms during 30s idle + 10 bursts | named low/mid Android + desktop Chrome 4x CPU throttle; profiler trace/video |
| Load | does not block first gameplay interaction; compare cold/warm and simulated slow network | trace with lazy path and fallback timing |
| Lifecycle | no reaction replay on hydrate/reconnect; event ID max once; WebGL/error/context loss static fallback remains interactive | unit/contract + browser test/video |
| Accessibility | `prefers-reduced-motion` gives static/non-looping equivalent; non-motion text/status; pause/degrade hidden/off-screen | manual a11y checklist + automated media query test |

Thresholds are budgets to prove a representative slice, not performance promises for every mobile device. Any exception needs recorded owner decision and an equally usable fallback.

## Decision record template

Before production adoption, record: selected engine/version and reason; editor/license evidence date; asset owner/rights; source PSD/layer manifest hash; exported model and fallback hash; adapter action mapping; device/browser results; known failures; rollback (switch adapter to static fallback); and who approved the rig/brand/a11y review.

