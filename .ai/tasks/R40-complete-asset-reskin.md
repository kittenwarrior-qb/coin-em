# R40 Reskin hình ảnh ngoài thẻ và UI

**Priority:** P1
**Status:** in progress
**Owner:** Codex implementation
**Dependencies:** R14, R22, R24, R25, R26, R29, R38
**Nguồn:** chỉ dẫn chủ dự án ngày 2026-10-01: “cuối cùng là reskin toàn bộ hình ảnh asset”.

## Latest owner-approved correction — 2026-10-10

### Owner addition2026-10-17 — Candy Clouds packaging theme

Owner requests a third selectable theme based on the supplied pink/sky watercolor
EmCoin box and turquoise/yellow coin logo. Admit `candy-clouds` to the existing
theme registry/preference/chooser/admin selector, narrowly shared brand selectors,
new isolated CSS/vector controls and generated original decorative background.
Reuse the existing `public/logo.svg` unchanged: it is the supplied brand family,
not an AI replacement. Preserve the two published themes/default, all card faces,
Coin semantic colors, original avatar identities, gameplay and pending/Back rules.
No production deploy or native rebuild in this visual slice. Add focused switch/
asset tests and owned-loopback mobile/desktop/menu/gameplay/admin geometry QA.
Generated background source/prompt and runtime optimization belong in
docs/design/candy-clouds-theme.md. The earlier native keyboard plan remains
separate and is not marked completed by this theme request.

Verification2026-10-17: new theme geometry PASS65viewport+51phase+42popup+
20admin+21nested=199cases. Shared baseline16cases across all4registered directions
(including legacy) PASS. Actual three-viewport selection/reload/Back/Escape and
return-to-Workshop PASS (FUMGJA). This found a real stale preview URL issue:
popup history restored the initial `?theme=emotion-orbit`, overriding a newly
persisted choice after reload (qdrWPf failed, retained). ThemePreference now strips
only that stale override on popstate after explicit UI selection, preserving
router state/popup IDs/other query fields and all pending guards. No default change.
Current FE808tests/83files PASS; final lint/type/build recorded in the design note.
Screenshots Home/menu/give-Coin inspected; original logo.svg remains unchanged.
These are local synthetic UI checks, not production, native or all41acceptance.

Compact-pill/contrast follow-up: reuse approved A1 bitmap family through horizontal three-sliced endcaps for explicit badge/tab/status/room/dropdown/navigation chrome; clear selected rectangular underlays; Host/Quản trò opt in without role/Coin recoloring. Strengthen secondary text, accent text and field edges; add non-color selected-tab underline. Targeted browser measurements on320/430/1280 join fields: text7.87, placeholder6.38, edge4.02 contrast ratios.675 frontend tests pass. Exact scope, limitations and QA in `docs/design/a1-pill-contrast.md`. No image regeneration, card/gameplay/deploy changes; no blanket accessibility certification claimed.

Later button-style follow-up: owner points out straighter blue versus curved pink pills. Generated blue/cream/blush-soft siblings directly from approved pink reference; shared registry/CSS now uses versioned `sky-pink-a1/pill-*-v2.png`. Old assets retained. Exact prompts/paths and latest QA in `docs/design/a1-button-style-match.md`: 674 tests,135 screen,75 scroll,15 public/admin pass; TS/lint/build pass;594-image audit missing0/decode0; original573 hash unchanged. This is a visual family match, not guaranteed pixel-identical geometry. No card/gameplay/deploy changes.

Owner requests blue–pink matching extracted About source, not green/mint. Applied Sky–Pink A1 to shared chrome: four new versioned assets (pill/circle/table/backdrop), blue tokens and progress/switch/slider/radial styling; kept existing pink/support sprites and puffy A1 direction. The historical `mint-blush` theme key remains compatibility-only. Home's mint halo replaced by a sky/pink backing. No card, Coin/role identity, avatar art, logo or tutorial content changed. Exact imagegen prompts/generated originals/runtime paths: `docs/design/a1-sky-pink.md`. Frontend674/63 tests, TS, lint, production build pass; synthetic135 screen,75 scroll,15 public/admin and4 wheel cases pass. Original573 hash unchanged; strict591-image audit missing0/decode0. This palette correction does not mark physical-device/release/rights gates or all41 tasks complete; no deployment performed.

## Goal

Reskin chỉ hình ngoài thẻ và UI/button/pill trong app/game/site theo phong cách cartoon 2D ấm áp đã duyệt, sau kiểm chứng dependency kỹ thuật. Báo chủ dự án trước khi sản xuất/tích hợp ảnh. Giữ nguyên toàn bộ hình liên quan đến thẻ, cặp mặt, URL, byte, crop, texture/model/fallback và nội dung/ID. Hoàn tất trước gate phát hành; không thay luật hoặc tự phát hành.

## Current evidence

2026-10-01: `fe/public` có 594 file (bao gồm cả file không phải hình ảnh);
`fe/src/constants/cardImages.ts` còn nhiều URL Cloudinary. Phải kiểm inventory theo usage,
không coi số file local là toàn bộ asset đang hiển thị.

## Scope

**Owner override 2026-10-02:** Không reskin bất kỳ hình ảnh liên quan đến thẻ: mặt trước/sau, role card, card texture/fallback, cặp mặt thẻ và mapping hiện tại phải giữ nguyên. Chỉ reskin hình ngoài thẻ, giao diện button/pill và asset trang trí UI. Các bước cũ nhắc tới thay thẻ phía dưới là lịch sử, không còn được phép thực hiện. ADR: `docs/adr/2026-10-02-owner-scope-and-audience.md`.

Đọc: `fe/public`, card image/constants/data, CDN URL helper, preload hook,
siteContent/characterModels, các component cartoon/game/site và R22/R24–R26/R38.
Cho phép sửa: asset hình ảnh, manifest/mapping và component/style cần thiết để tích hợp;
tài liệu provenance/license, preview, visual regression và các task liên quan.
Không đổi nội dung/canonical ID thẻ, luật coin, role/socket/persistence, workflow hoặc production.
Đọc skill frontend-design cho UI và imagegen khi tạo bitmap mới; kiểm ảnh trước khi edit.

## Implementation plan

### Active-screen A1 application pass — 2026-10-10

Final sweep also themes standalone public offline.html with CSS-only mint/cream/blush chrome and puffy reconnect link, preserving Coin borders/text and avoiding new cache/network dependencies.3offline screen widths pass; final135-case screen run passes explicit native-circle/header ink/decoded flip checks. This applies A1 to all currently registered screens and the approved offline surface, not dormant historical pages or protected artwork.

Owner requests full screen coverage. Extended restored puffy A1 to splash/route loading, waiting own row, own-role frame/title, history, give Coin +/- and headers, role/round/end sheets, native phase navigation, inventory filter/preview chrome, transport/PWA notices and shared native card shells. No protected image/3D/role/Coin/data/action change. docs/design/a1-screen-qa/README.md records active-screen matrix and limits.669FE tests/63files, lint/typecheck/build,135synthetic screen cases and original573hash/manifest80checks pass. Production excludes dev qa-screens entry. Active-screen implementation pass complete; R40 remains in progress for owner/device/accessibility/rights acceptance, not deployment or41task release completion.

### Application-wide A1 chrome rollout — 2026-10-10

Owner asks full reskin after reverting the bean experiment. Use approved puffy A1 across shared native/site action variants, navigation/dropdown portals, catalog filters/preview controls,3D bottom/chip controls/panels, room selection, badge families, create headings/checkbox labels, gameplay popup shells, guide navigation and admin panels/forms. Scope/QA:docs/design/a1-chrome-qa/README.md.664FE tests/62files, lint/typecheck/build and board9/public-admin15browser checks pass; original573art hash unchanged. No protected imagery, room/auth behavior or deploy change. Status remains in progress pending owner visual acceptance/device/uncommon-state and remaining usage/rights audit, not41-task completion.

### Owner rollback — 2026-10-10

Owner rejected the bean-shaped organic pills and requested prior puffy A1. Restored v2 mint/blush and a1 cream/blush-soft mappings, previous Menu plaque and pill/CartoonBadge CSS. Organic files remain inactive rejected experiments.30 targeted tests pass. Preserve the prior A1 design; no further contour experiment authorized by this rollback.

### A1 contour correction — 2026-10-10

Owner rejected smooth capsule silhouettes despite puffy volume. Four new irregular pill bitmaps are integrated across seven A pill mappings; Mới/CartoonBadge/Menu plaque reuse soft-blush organic sprite behind live labels. Preserve all original art and legacy mappings; round icon buttons remain v2. Sources/prompts/hashes: docs/design/theme-a-organic-source/README.md. FE657 tests, TypeScript, ESLint, build pass; board9viewports and refreshed preview9cases pass. Original573 image hash unchanged; inventory587/missing0/decode0 and manifest80checks/200faces pass. Final A1 screen inspected after local Vite restart removed stale imported-CSS cache. R40 remains in progress; no deployment/full-reskin completion claim.

### Owner visual refinement — puffy organic A, 2026-10-10

Owner's attached UI comparison identifies loss of old button plump volume and uneven personality. Keep A mint/blush palette but replace first thin pill proposal with versioned puffy pills: gently irregular capsule silhouette, domed body, thick lower rim, curved highlight. Reference attached controls for volume only, not colors or text. Carry this tactile language into table/panel/circle/decorative chrome. No changes to control bounds, press contracts or protected game images. This is additive feedback to the full-UI request, not a pause or scope reduction.

### Plan revision 2026-10-10 — owner requires complete UI theme, not two pills

Owner corrects the incomplete first slice: all buttons/pills, UI images, table and entire interface must follow A. Admit all non-card cartoon primitives, game board/TableBoard, non-card panel shells, shared site styles and native UI controls; add theme-wide stylesheet and UI-coverage tests. All pill/circle variants resolve explicitly through A registry (no unreviewed legacy fallback for known variants). Generate separate mint/blush circle sprites, one decorative home/day backdrop and one empty table surface, preserve source/optimized versions. Native vector UI icons may use existing code-native icon system; no raster stand-ins for requested illustrated backdrop/table assets. Theme activation/rollback must include portal panels and site/form controls. Preserve all card images/content/mappings/models/textures/tutorials/fallbacks and Coin/role meaning; original assets remain byte-identical. Keep avatar identities/logo/supporter marks and game-related role/Coin imagery, reskin their surrounding UI only; no fabricated new character or sponsorship logo. Verify full FE regressions/build and actual viewport screenshots, report any remaining coverage explicitly instead of claiming completion from two controls.

### Plan revision 2026-10-10 — A selected, first runtime pill pair

Owner approves A and asks to start there with an extensible multi-theme architecture. Generate one mint and one blush transparent sprite separately using the approved A study as style reference only. Persist original sources/provenance and versioned optimized production derivatives; do not overwrite any original. Integrate only green/pink pill mappings through R22 registry/provider. Retain all Coin/card/role/tutorial/model/fallback assets, old variants and rollback. Audit old assets separately from newly admitted files (the full inventory hash must now change honestly). Verify transparent derivatives, focused/full FE checks and local rendered evidence when available. Remaining circle/site/decorative reskin is unfinished, no release/deploy claim.

### Plan revision 2026-10-10 — additional bright green/pink samples

Latest owner feedback supersedes the dark-green prototype direction: brighter youthful restrained green/pink. Generate three separate preview-only UI concept images (A mint/blush, B garden/peach, C mint/rose soft pop), one built-in imagegen call per variant. These are style studies, not production sprite sheets: no slicing/import/preload/runtime replacement. Existing card-related imagery and all Coin semantic colors remain unchanged. Record complete prompts/artifact paths in docs/design/green-pink-direction.md and prepare R22's separate brand token seam. Sample selection is still required before scaling or activating the new palette.

### Plan revision2026-10-10 — preview-only single non-card pill sample

Owner was notified before artwork after current625FEtests/lint/typecheck/build and all11short browser cases437.09sPASS, original573image hash/200faces/80manifest checks retained. Begin ONE fresh green pill bitmap as preview-only using built-in imagegen, not an edit/copy of protected art or integration into public/runtime mappings. Known /cartoon/buttons/pill namespace is a UI candidate; no Coin/role/card/tutorial/model/sticker/texture/fallback/avatar/logo/unknown-rights asset is admitted. Warm2D cartoon direction is owner-approved and overrides selecting a conflicting frontend-design anchor. Deep green blank text area, rounded matte rim, soft hand-illustrated volume; preserve current live React labels/fonts/semantics in future integration, no baked text or new icons/characters. Keep output at built-in preview artifact path and show inline for owner approval; no mass variants, sprite replacement, CSS/layout/manifest/preload/code mutation before approval. Remaining R22 broad consumer migration, actual Rive/device/performance/rights/public operator/privacy/native/store/release gates are not silently deferred or declared done. This prototype is not full web/41task acceptance or production release readiness.

### Plan revision 2026-10-02 — protected card inventory

Inventory chia thành `protected-card` và `reskin-ui/non-card`. Không thay URL, byte ảnh, crop, texture, nội dung, ID hay cặp front/back của nhóm protected-card. Bước tích hợp mới: coin/UI → avatar/nền ngoài thẻ → landing/tutorial/decorative assets; loại toàn bộ mặt thẻ và card-related 3D texture khỏi danh sách thay. Coverage cuối phải chứng minh protected-card không đổi, ngoài việc kiểm mapping/QA cho nhóm reskin. Chưa sản xuất reskin; dependency và QA cuối giữ nguyên.

1. Sau R14/gameplay QA và thông báo chủ dự án, khóa inventory hình đang dùng. Tách protected-card (mọi mặt/cặp/URL/texture/model/fallback/hình hướng dẫn liên quan thẻ) khỏi non-card/UI; candidate chưa rõ quyền/scope không mặc nhiên được thay. Inventory không phải sản xuất reskin.
2. Dùng art direction đã được chủ dự án xác nhận ngày 2026-10-01: cartoon 2D ấm áp, rõ nét trên mobile; giữ nội dung thẻ và ba màu coin đỏ/xanh/vàng. Ghi palette, typography, shape, texture và mẫu đại diện trước nhân rộng.
3. Tạo mapping logical ID → asset mới chỉ cho non-card/UI đã xác minh scope/quyền; giữ nguyên mọi protected-card mapping và chữ/nội dung thẻ. Tách chữ hướng dẫn ngoài thẻ khỏi ảnh khi phù hợp để tiếng Việt sắc nét.
4. Tạo toàn bộ bộ hình theo art direction nhất quán, giữ source và provenance; không overwrite mất bản gốc khi chưa có mapping/rollback.
5. Tích hợp theo nhóm non-card: button/pill/UI → avatar/nền ngoài thẻ → landing/decorative/support được xác minh. Coin/role/tutorial/model/texture/fallback có liên quan thẻ nằm ngoài phạm vi thay, kể cả URL CDN và local; không có bước reskin thẻ.
6. Tối ưu kích thước/format/crop và loading; kiểm mobile/desktop, dark/background contrast, reduced-motion, offline/fallback và pairing.
7. So sánh inventory trước/sau để chứng minh mọi hình trong scope đã thay hoặc có lý do loại khỏi runtime; không xóa asset chỉ dựa vào search tên file.
8. Chạy FE lint/test/build, visual screenshots, R29 smoke và full coin/gameplay regression; chốt preview, manifest hash và rollback theo version.

## Acceptance criteria

- [ ] Một art direction nhất quán cho UI/asset ngoài thẻ; inventory phân biệt rõ protected-card với reskin.
- [ ] Mọi hình trong phạm vi reskin có mapping cũ/mới và provenance; hình liên quan đến thẻ được chứng minh giữ nguyên.
- [ ] Ba màu coin và nội dung thẻ chính xác; ảnh mới không làm phát sinh luật hay thông tin role lộ ngoài contract.
- [ ] Preview mobile/desktop được kiểm; font/ảnh lỗi vẫn dùng được game; budgets R24/R25 đạt hoặc có evidence giải thích.
- [ ] Build/test/visual QA pass; rollback mapping khôi phục bộ cũ mà không đổi state game.

## Test plan

`cd fe; npm run lint; npm test; npm run build`; manifest coverage/hash/face-pair checks;
R29 screenshots mobile/desktop và missing-asset/offline test; R27/R14 gameplay/coin checks.

## Risks and rollback

Ảnh có thể sai nội dung tiếng Việt, nhầm mặt thẻ, nặng hoặc còn URL cũ. Khóa logical IDs,
so sánh preview và giữ bộ cũ theo asset version; revert mapping/artifact riêng, không đụng dữ liệu phòng.

## Open questions

Logo/brand cần giữ, source catalog/rights và phạm vi 3D nếu có. Art direction cartoon 2D ấm áp đã chốt.

## Implementation report

2026-10-10 Home-to-game finishing — Reused the approved A1 puffy raster family for remaining room/dropdown/badge/tab/status chrome, Home logo halo and waiting panel depth. Explicit neutral/accent ink hooks unify player names/profile labels/modal titles while preserving original avatar, role, Coin and all card imagery. Added computed-style browser guards and two FE palette-boundary regressions. FE674/63, typecheck/lint/build and original573-image/strict587 inventory guards pass. Updated active-screen/scroll reports are separate from owner physical-device acceptance and release; R40 remains in progress for those external gates.

2026-10-10 A1 selected — Owner approves balanced mint/blush/cream menu and matching all button materials. Two built-in imagegen hue edits from inspected mint source produce cream/soft-blush versioned sprites; all four menu actions now use shared CartoonButton, with smaller separated exit and unchanged confirmation/ACK. Original573images unchanged; no protected art/bulk color/deploy change. Exact prompts, paths, hashes and limits in docs/design/green-pink-direction.md. Full657FEtests/typecheck/lint/build, board-shell9viewports, preview9cases,583image strict audit and80check/200face manifest PASS. R40 remains in progress, not all41/release completion.

2026-10-10 A Puffy v2 — Supersedes the two-pill slice below. Owner's all-UI/volume feedback implemented through six individually generated raster assets and scoped A design system: all5pill/all14circle variants plus standalone controls, modal/panel/headline/table/backdrop, avatar frames, site/admin/showcase chrome. Protected card/Coin/role/tutorial/model/character/photo/logo art remains original. Sources/exact prompts/derivative paths/budget/rollback recorded docs/design/green-pink-direction.md. Total active derivatives142633bytes. Original573image aggregate byte-identical. No room/socket/rule/schema or deployment change; no all41/release-complete claim.

2026-10-10 A selected — First runtime slice integrates TWO freshly generated transparent pill sprites via R22 registry (green→mint, pink→blush). Originals/source prompts/versioned derivatives retained; prepare-theme-a.mjs performs only mechanical fitting/encoding and refuses overwrites. Each derivative260×99,20363/19598bytes (39961bytes total); full provenance/paths/SHA/rollback in docs/design/green-pink-direction.md. No card/Coin/role/tutorial/model/texture/fallback art change. All remaining circle/icon/site/decorative groups are unfinished; B/C not built. Existing audit reskins=0 is a legacy metadata constant, not evidence of zero newly integrated art.

2026-10-10 — Latest feedback fulfilled with three fresh built-in imagegen previews A/B/C, shown inline and visually inspected. Full prompts, artifact paths and differences recorded in docs/design/green-pink-direction.md. Brighter green/pink prototype direction replaces the dark-green proposal, not protected assets. These opaque component compositions are approval studies, not production sprites. No image imported/copied into public or activated; candidate token seam prepared under R22. Selection/scaling/integration gates remain open.

2026-10-10 — Owner notified BEFORE generation. Built-in imagegen creates ONE preview-only green pill, no text/icons/cards/characters/logo and no existing image supplied as a generation reference. Artifact retained at `C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-19551050-d228-4893-ac06-5ad44e2e4c09.png`; not copied into public/imported/preloaded or integrated. No current URL/mapping/CSS/label/font/card/game behavior changed. R40 begins prototype work (in progress), not full reskin/done. frontend-design informs real-content discipline and preservation of approved warm cartoon direction, not selection of a different anchor; imagegen supplies a genuine raster approval sample. Mass production/integration waits for owner's sample approval.

### Final generation prompt (built-in tool; preview-only)

Use case: stylized-concept. Asset type: ONE preview-only game UI pill button sprite, not an entire interface or a sprite sheet. Primary request: create an original warm, friendly 2D cartoon green pill button for EmCoin, a mobile-first in-person emotional sharing game for ages 6–18. Subject: exactly one horizontally elongated rounded capsule, front-on, about 2.7:1 width-to-height, centered and fully visible with comfortable clear alpha padding. Style: polished hand-illustrated 2D cartoon, soft matte painted surface, gentle rounded beveled rim, restrained shallow volume, crisp mobile-readable silhouette; not photorealistic or a glossy plastic 3D render. Color palette: a deep leafy green central surface around #267341, darker green lower rim around #174E35, a thin soft lighter-green upper edge; the center must remain uncluttered and sufficiently dark for future white HTML button labels. Lighting: gentle diffuse highlight, no large white glare, no baked cast shadow beyond a very subtle edge. Backdrop: genuinely transparent alpha background, no checkerboard drawn into the image. Text: NONE; the application will render its existing Vietnamese labels separately, so leave the broad central area blank. Constraints: ONE button only; original artwork, no existing sprite copied, no coins, playing cards, card faces, roles, tutorials, mascots, characters, logos, symbols, icons, decorations, labels, letters, watermarks or additional objects. This is a design approval sample only; do not depict fabricated app data or a full screen.

Đã tạo brief và dependency; chưa tạo/thay asset vì chủ dự án yêu cầu reskin ở bước cuối.

2026-10-01 — R24 đã có read-only inventory: 573 hình local, 142 remote static-reference candidates; hash/dimensions/mapping pending/provenance chưa xác minh. Đây không phải runtime coverage hay reskin completion; art chưa thay. Tool `fe/scripts/audit-assets.mjs` sẽ dùng để so mapping cũ/mới ở bước cuối.

## QA report

2026-10-10 A Puffy v2 — FE654tests/60files, TypeScript, ESLint, Vite production build PASS. Strict581image audit missing0/decode0; manifest80checks/200faces and six-asset/original-hash verification PASS. Chromium147 board-shell9viewports PASS (iM08X8 report), public-info/admin production browser2suites PASS; menu320/1280 and landscape guide visually reviewed. History teardown wait fixed a browser-script race without changing popup application behavior. No physical-device, bitmap-wide contrast, screen-reader or release certification. Full provenance and limitations in design record.

2026-10-10 selected-A — verify-theme-a.mjs PASS: all573pre-existing image hashes retain exact aggregate7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8, both new derivatives alpha/corners0/dimensions/budgetPASS. Total inventory575images/15556209bytes/newSHA18c4af7c8fd96023b759ddeae32e88b8a2a6e04dac6d9486f2273c7d94d7f6fb/missing0/decode0; manifest80checks/200facesPASS. Full631FEtests/lint/typecheck/build and nine-viewports actual Chromium synthetic-shell PASS; limitations and first pointer-modality QA failure recordedR22. Remote hashes/rights, full image-wide contrast/device/gameplay/release checks not inherited. This is first A pill integration, not full reskin completion.

2026-10-10 — Preview visually inspected: one matte green capsule, blank text area, no extra/card/character content. Read-only Sharp metadata2061×763/PNG/hasAlpha=true/all4cornerAlpha0/1276210bytes; SHA256d9380778d2c2dd429bf61e74ba721adb1c6f86f68e7b39edf307ce8561bc2082. CenterRGBA42,113,70,254; theoretical white-vs-centerRGB contrast5.92:1 is ONE pixel sample, not actual composited text/whole-button/device/accessibility certification. Raw large preview is not a production size/budget approval. No derivative, compression, crop or runtime integration performed. AFTER generation read-only runtime573image hash7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8/15516248bytes/200faces/80manifest checksPASS/missing0/decode0/reskins0. Generated preview outside runtime explains why old inventory remains unchanged; it is not zero newly generated art. Owner approval and full consumer/visual/asset integration verification remain required before scaling. All41tasks not complete.

Chưa chạy: bước sản xuất reskin chưa bắt đầu.

## Decision log

2026-10-04 — Owner accepts web-first continuation after the explicit web→sample/reskin versus native/store/deploy ordering question. Keep R32/R34/deploy gates deferred, not complete; finish relevant web dependency QA and notify owner BEFORE the representative sample. This is ordering approval, not approval of an unseen sample or mass replacement. All card-related assets remain protected.

2026-10-03 — Owner numbered answers20–22 confirm inventory/rebuild non-card button/icon/UI image assets, rights to existing Rive, defer new characters, and approve one representative sample BEFORE scaling final reskin. All card-related image/content/pair protection stays unchanged; Rive rights do not automatically clear other fonts/models/logo art. No sample/art generation or integration yet.

2026-10-03 — Owner explicitly requests notification when reaching the reskin step. Continue technical dependency implementation/QA first; announce before producing/integrating R40 art. No image replacement is authorized as an unnoticed intermediate operation; all card-related assets remain excluded.

2026-10-02 — Owner thu hẹp scope: không reskin hình liên quan đến thẻ, chỉ hình ngoài thẻ/button/pill/UI asset. Owner xác nhận quyền sở hữu trí tuệ bộ thẻ; không suy rộng sang font/logo/art khác.

2026-10-01 — Đưa reskin toàn bộ hình ảnh thành task cuối R40, theo yêu cầu chủ dự án.
2026-10-01 — Chủ dự án xác nhận hướng cartoon 2D ấm áp, đọc rõ trên mobile, giữ nội dung thẻ và ba màu coin.
