# R21 Mobile shell

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R19

## Goal

Responsive board safe-area/dvh across portrait/landscape/desktop preserving 10 slots.

## Current evidence

Fixed sizes có thể che 10 người chơi/CTA trên mobile và keyboard.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R21)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R19.
- fe/src/index.css; fe/src/components/cartoon/CartoonScreen.tsx; fe/src/pages/GameBoard.tsx; fe/src/components/game/PlayerLayout.tsx; fe/src/components/game/MiniPlayerToken.tsx; fe/src/pages/CardShowcase.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`viewport/safe area/keyboard → responsive shell → board slots/overlays → accessible CTA`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R21.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

2026-10-02 owner chose: mobile-first, fluid fit and centered on desktop. No separate wide desktop board.

## Implementation plan

### Plan revision2026-10-15 — follow-up nested/focus/short-height QA

Continue after viewport repair with owned loopback nested menu/theme/guide/inventory
and focused form shrink/restore checks. Admit adjacent CartoonModal geometry and
local-only browser test additions only when a reproduced defect requires them.
Also admit scoped admin viewport rules and an owned metadata-only admin catalog/
editor browser test. Do not stage or rewrite the owner's ongoing admin source edits.
Attempt Android keyboard evidence only on the owned emulator; no browser terms,
system security, production routes or device network policy bypasses. Simulated
viewport changes are not physical keyboard/iOS evidence. Preserve owner edits.

### Plan revision2026-10-15 — viewport and menu scroll repair

Owner reports web/mobile shells exceeding the viewport and unnecessary menu scroll.
Admit scoped viewport CSS, CartoonModal shell geometry, GameContainer notices only
if evidence requires, and an owned-loopback browser regression fixture. Preserve
both approved themes, all card/brand imagery, gameplay and pending/focus/Back rules.
Use dvh with vh fallback; bound game/Home shells, not public editorial pages.
Adjacent permitted files: GuideBook.tsx, WaitingRoom.tsx, GameContainer.tsx,
dev-only ScreensPreview/BoardPreview fixtures, viewportLayout.css, nearest existing
transport/guide unit tests and e2e/scripts/check-{viewport-scroll,overlay-reachability}.mjs.
Long inventory/guide/room lists must retain internal scrolling and reachable CTAs;
do not hide overflow globally to conceal unreachable content. Record baseline,
portrait/desktop/landscape and viewport-resize results; no implicit deployment.

Plan revision2026-10-08 — R29 lost-confirmation screenshot JE6Opf exposes the live transport notice squeezing text into an approximately44px column at390px when both recovery/dismiss buttons share its row. Admit ONLY GameContainer.tsx transport message layout, adjacent GameContainer.transport.test.tsx and R29 actual-browser geometry assertions. Give message a full-width flex row, keep buttons wrapping below; preserve approved cartoon palette/fonts/copy/art, pending/retry semantics and mounted board. This is a responsive defect fix, NOT R40 reskin/new visual anchor. Verify waiting/playing/ended mocked component states, actual390px message width/buttons bounds in the owned fault run, FE full tests/lint/build and disclosed browser limitations.

### Plan revision 2026-10-02 — approved fluid centered shell

Preserve existing information hierarchy, board/player/card assets and role placement. Scope includes local-only `fe/qa-board.html`, synthetic board fixture under `fe/src/test/fixtures`, and `e2e/scripts/check-board-shell.mjs` for an isolated headless browser baseline/verification, without connecting a backend or external account. QA HTML is a dev-only entry, excluded from the default production build; test confirms exclusion. Modify shell/slot CSS and listed components only as evidenced by viewport tests. Synthetic names/data are visibly labelled fixtures; no runtime debug/production route is introduced. Desktop remains centered mobile-first, not a new adaptive desktop layout. Device keyboard/safe-area emulation is not physical-device proof.

1. Record visual baselines and overflow/keyboard/safe-area failures at 320, 360, 390, 430, 768, 1280 and 1440 px.
2. Obtain owner decision on mobile-only shell versus desktop-adaptive behavior; do not replace information hierarchy by assumption.
3. Define shell sizing, safe-area, dynamic viewport and keyboard rules independent of phase/gameplay state.
4. Migrate board/player slots and overlays incrementally, retaining ten-player visibility and primary CTA reachability.
5. Test portrait, landscape, text zoom, mobile keyboard, focus and slow network with screenshots on named browsers/devices.
6. Keep component tokens compatible with R22 and leave modal focus policy to R23.

## Implementation report

2026-10-15 follow-up: reproduced a short desktop catalog footer clipped below its
fixed workspace and editor textareas taller than the remaining editor viewport.
For desktop heights<=600px, preserve the fixed app shell but let the workspace own
vertical scroll, with a bounded table viewport and full-height editor fields.
Normal desktop keeps its existing fixed record table. Found a separate360px-high
mobile document overflow: absolute sr-only filter labels had no containing block
inside the scroll shell. Position the authenticated admin shell relatively; labels
and screen-reader text stay intact, and document height returns526px→360px without
adding a root/body overflow clamp. Changes remain in viewportLayout.css, not the
owner's uncommitted admin restyle. New read-only synthetic browser checks cover
catalog/table pagination and all three detail tabs, nested menus via Escape/Back,
focus return and form draft preservation on300px viewport shrink/restore.

2026-10-15 viewport repair: new isolated viewportLayout.css bounds Home/game shells
to100dvh(vh fallback) without the fixed poster aspect ratio growing the document.
Menu material/brand assets are preserved; rows/gaps/header margins adapt to viewport,
including the live theme preference action. Home decorative logo no longer blocks
Settings at short landscape sizes. Modal padding protects panel animation edges.
GameContainer waiting/playing/lobby now own one flex viewport; connection notices
occupy bounded space and the board receives the remainder, rather than appending
another100dvh. Long lists/boards/dialogs remain internally scrollable. Admin mobile
keeps viewport ownership with workspace scroll, without editing the owner's ongoing
admin restyle. GuideBook is scoped to its containing panel, fixing480px toolbar
overflow beyond the430px game on landscape. No gameplay, card, theme palette,
credential, production deployment or native APK mutation.

2026-10-08 — Fixed confirmed recovery-notice mobile text squeeze: message wrapper uses basis-full instead of flex-1, retaining existing parent flex-wrap so both real action buttons occupy the following row. No message/role/Coin logic, palette/typeface/font/icon/image/card/button asset change. frontend-design informed content readability and preserving real state labels, but owner-approved existing cartoon direction overrides introducing a new visual anchor; this is not R40 reskin. Three component regressions protect waiting/playing/ended notice structure and unchanged retry/dismiss callbacks. R29 controlled packet-loss scenario proves the live fix rather than CSS-only assumptions.

Scope revision: include `TableBoard.tsx` inner horizontal padding only and `GiveCoinPicker.tsx` viewport-bounded scrolling/touch sizes. No card image, card renderer or game rule changes. Low-height viewports use scrolling inside the board to retain readable ten-player slots; simultaneous ten-avatar visibility is not promised where the physical height is insufficient.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-15 follow-up PASS463bounded Chromium cases on final CSS:195 viewport/resize,
84popup reachability,102phase layouts,40mocked admin catalog/editor cases and42nested
menu/focused-form cases. Admin covers both themes at1440x900,1440x400,1024x568,
390x844,390x360; actual button/field rectangles must fit clipping ancestors after
genuine internal scroll only. Nested theme/guide/inventory close via Escape and
browser Back and return focus;300px form shrink preserves draft and reaches submit.
FE758tests/79files, final lint/TypeScript/Vite production build PASS. Fresh CSS rerun follows an owned Vite restart, because
the prior imported stylesheet was stale; interrupted/stale runs retained as failed.
No owner admin file edits staged with this fix. Evidence/failures/source hashes:
docs/qa/viewport-scroll-20261015/follow-up.json. Actual Android keyboard attempt was
denied by tool network policy before page navigation; no bypass, browser agreement,
or device trust change attempted. Owned emulator shut down. Keyboard simulation is
not physical/iOS/native proof; no production deploy or APK rebuild.

2026-10-15 Chromium local synthetic QA PASS381cases:195 viewport/resize across
320x400,320x568,390x844,844x390,1440x900 and three skins;84 real popup control
reachability checks across both approved themes;102 phase layouts(all17phases,
10seats,sender view,three sizes,two themes). Main menu clientHeight=scrollHeight
at every tested size, including live Giao diện link. Genuine internal scroll
ancestors are used to reach controls; clipping with overflow:hidden does not count
as reachability. Admin uses mocked empty metadata, not production authentication.
FE758tests/79files PASS before final guide assertions; nearest24tests rerun PASS,
lint and TypeScript/Vite production build PASS. Public about/cards/story normal
document scroll preserved at390px with synthetic baseline catalog pointer.

Baseline12cases failed5: desktopHome930px in900px viewport, workshop menu390px
client/402px content. Intermediate landscape run exposed logo intercepting Settings;
165case run found two transient popup edge overflows; reachability84case run found
two GuideBook landscape clipping failures. These failures are retained, not waived;
final viewport195/phase102/reachability84 have zero failures. Evidence/limitations:
docs/qa/viewport-scroll-20261015/summary.json. Chromium simulation is not Safari,
physical-device keyboard, native WebView or every possible popup/game state proof.
The working tree includes preserved owner edits outside this fix; no global41task
or clean release/deployment certification.

2026-10-08 — Actual Chromium147 owned R29 MDqvvv PASS233.43s total/1case(2filtered), fault actor explicitly390×844. Previously JE6Opf screenshot had a approximately44px text column with two action buttons. After fix, actual message width358px; both buttons bounded within390px and below the message; uncertain/recovered images inspected. Actual protocol/journal recovery and all5round final receipts still pass. FE53files573tests PASS53.73s plus TypeScript/lint0diagnostics/Vitebuild30.50s PASS; assets80localchecks/200protected faces unchanged/reskins0. Mocked transport component tests are structure/behavior evidence, not geometry. Browser uses mockRedis/disabledlimiter/CDNblocked/reducedmotion/simulated viewport; no320px/zoom/keyboard/WebKit/physical-device/all-phase visual certification. Earlier broader shell/browser proofs retain their own source boundaries; task stays in progress.

2026-10-02 isolated actual headless Chromium 147.0.7727.15, no backend/session, 9 viewports (320×568, 360×640, 390×844, 430×932, 768×1024, 1280×720, 1440×900, 844×390, 390×400). Initial fixture exposed clipped side avatars/Sender on short screens. Repaired shell uses scroll reachability rather than hiding the overflow; test physically scrolls each of ten avatars into the play-area viewport and clicks the main Coin action. No avatar overlap, no horizontal page overflow; desktop cap 430 centered; Coin dialog and its scrolled confirmation fit. Versioned report/screenshots: `C:/Users/Admin/AppData/Local/Temp/emcoin-board-qa-Okg74Z/report.json`. This is a give-coins synthetic geometry regression, not a full game/real mobile keyboard/Safari/200%-text/a11y gate. Public images retain exact baseline hash, zero replacements. Default FE production build excludes QA entry. Full device/phase/focus/slow-network matrix and independent audit remain.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

Owner centered mobile-first choice and engineering low-height scroll policy: `docs/adr/R21-mobile-first-approved.md`. Targeted shell/component forward fix/revert; no global CSS reset or persisted-data rollback.

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
