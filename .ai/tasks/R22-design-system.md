# R22 Design system

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R21

## Goal

Token/size/state API, badge anchor và page/game variants.

## Current evidence

Sprite, badge, token và styles phân tán, dễ vá offset theo từng màn.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R22)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R21.
- fe/src/components/cartoon/CartoonButton.tsx; fe/src/components/game/GameMenuModal.tsx; fe/src/index.css; fe/src/components/site/SiteHeader.tsx; fe/src/pages/About.tsx; CARTOON_GUI_SYSTEM.md

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`design tokens → primitives/states → game/site variants → components consume stable API`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R22.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Brand/content owner phải duyệt token/asset usage; không đổi gameplay semantics.

## Implementation plan

### Plan revision 2026-10-10 — complete A UI surface migration

Follow latest R40 full-UI owner direction. Scope extends to all cartoon primitives, TableBoard/GameBoard decorative backgrounds, CardInventory outer panel (NOT card face/crop/content), site CSS/shared native UI controls and theme coverage tests/docs. Root theme attribute selects the non-card semantic CSS layer; component/context registry controls sprites and modal/table/backdrop mappings, with explicit legacy rollback. Preserve event/phase/auth/room/state contracts, original dimensions/mobile-first placement, disabled/pending/focus/native semantics and game semantic colors. Do not rewrite raw --c-* or card imagery. A must now cover all known pill/circle variants and visible UI panels, not only green/pink.

### Plan revision 2026-10-10 — owner selects A, extensible control themes

Owner explicitly selects A first and requests multiple-theme capability. Admit new controlThemes.ts, ControlThemeProvider.tsx, main.tsx provider activation, adjacent component tests and asset-preparation script/provenance. Registry owns named theme overrides; provider is React-scoped (no socket/room/preference persistence), legacy fallback remains intact, A active at app entry. First slice migrates green/pink pill controls only; orange/purple/teal/circle assets retain their current semantic variants pending a later reviewed slice. Keep original dimensions, labels, refs, disabled/pending/submit/reduced-motion contracts and global/game/Coin palette. Scoped A focus/badge/label styling must not recolor protected imagery. Add A→legacy rerender regression and retain existing legacy sprite tests. This is not full-site reskin or a completed theme picker/B/C.

QA scope extension: controlThemeContext.ts separates hooks from provider for React refresh; dev-only BoardPreview.tsx uses the same selected default provider and existing check-board-shell.mjs adds assertions for actual decoded A sprites/dark ink/focus. No new production QA route. Run existing nine-viewport suite unchanged in size/geometry/rule requirements.

### Plan revision 2026-10-10 — green/pink brand token seam

Owner requests brighter, youthful, restrained green/pink variants and progressive color refactoring. Add provisional non-card brand primitives and semantic aliases to index.css, with an adjacent CSS contract test and docs/design/green-pink-direction.md. Keep these separate from legacy --c-*, global shadcn semantics, player/role/Coin colors and existing sprite mappings. No consumer activates the candidate palette before variant selection; no global replace, layout change or image integration. Use dark label ink on future pastel controls, then verify actual composited contrast/focus/states when each consumer migrates. Rollback only the new token block/tests/docs. R22 broad migration remains in progress.

### Plan revision 2026-10-09 — behavior-preserving control token seam

Admit `fe/src/components/cartoon/controlTokens.ts` and adjacent existing primitive tests. Extract only existing height classes, sprite-shadow and press/hover/return spring values into one non-rendering typed token module; keep all existing pill/circle sprite mappings, text/color/DOM/badge anchors/fonts/CSS/layout byte-for-byte in effect. Reuse one disabled/pending/reduced-motion state resolver. Fix caller `aria-busy=false` overriding an actually pending control; pending must announce true while explicit caller busy remains supported when not pending. Preserve callback/ref/default-submit behavior and existing circle badge counts. No new visual anchor, image/font/CSS replacement or site/board migration; owner-approved cartoon direction overrides the skill's new-anchor selection for this non-reskin slice. Verify all sizes/colors, legacy motion tokens, busy precedence, explicit disabled after pending clears and both ref targets. Broad site/token migration and device/visual acceptance remain separate, not done.

### Plan revision 2026-10-02 — existing-art button state primitive

Resolve stale source paths: GameMenuModal is `fe/src/components/lobby/GameMenuModal.tsx`; GUI reference is `fe/src/components/cartoon/CARTOON_GUI_SYSTEM.md`. Preserve current approved cartoon palette/type/button artwork (no new brand choice). Add opt-in pending and sprite-surface badge API, default non-submit type, visible keyboard focus and reduced-motion-safe press states to existing primitives. Migrate menu “MỚI” badge only; site/about and card imagery remain unchanged. Primitive unit tests and local synthetic fixture screenshots are scoped; full token/site migration remains.

1. Inventory repeated color/type/spacing/motion/sprite/badge rules and identify shared versus game/site-only usage.
2. Get brand/content approval for token naming and asset use; document variants without changing game meaning or content.
3. Define token primitives and component state API, including visual-pill badge anchoring rather than page-specific offsets.
4. Migrate one primitive and its highest-risk consumers with visual baseline comparisons before removing legacy styles.
5. Separate site and game variants so `/about`/gallery do not inherit board constraints; preserve responsive shell rules from R21.
6. Test focus/disabled/pending/badge states and route snapshots; record rollback as token alias restoration rather than broad CSS reset.

## Implementation report

2026-10-10 A Puffy v2 — Typed registry now covers all pill/circle variants; root provider manages scoped data-ui-theme with cleanup and nested legacy isolation. mintBlushTheme.css supplies shared non-card semantic styles/native controls/site chrome; generated six-asset A set replaces non-card sprite/panel/table/backdrop mappings. Original raw --c-* constants and protected imagery remain. Existing control geometry/native callbacks/pending/ref/focus retained. Legacy standalone path resolver repairs nonexistent dynamic asset URLs. Detailed coverage/prompts/provenance in docs/design/green-pink-direction.md.

2026-10-10 A selection — Typed control theme registry and scoped provider now activate mint-blush at main.tsx. Green/pink pills consume versioned sprites/dark live ink/scoped focus/badge styling; all other variants stay legacy. Default provider-free consumers retain original art; nested legacy provider and A→legacy rerender preserve native ref/pending/labels. No global palette/game/Coin/room change or theme preference storage. Theme sources/prompts/rollback in docs/design/green-pink-direction.md. First slice only; broad consumer migration, circle/site art and end-user theme picker/B/C remain unfinished.

2026-10-10 — Adds provisional mint/blush primitives and non-card semantic aliases in index.css; no consumer activation, no global legacy semantics changed. Adjacent brandPalette test checks independent dark-ink aliases, solid-color label contrast and preservation of old game/Coin/global values. Direction/migration/rollback/three full image prompts recorded in docs/design/green-pink-direction.md. This is the first palette seam, not completed site/game consumer migration or owner variant approval.

2026-10-09 — Existing pill/circle heights, identical shadow and six press/hover/return configurations now share `controlTokens.ts`; one state resolver retains native disabled and reduced-motion behavior. Sprite mappings/DOM/label/badge/style/class values unchanged. Pending overrides contradictory caller aria-busy while explicit caller busy still works outside pending; it does not invent pending or prevent ordinary activation by itself. Native ref/default-submit and meaningful circle-count semantics retained. frontend-design informed preservation of real state semantics and approved cartoon direction, not a new visual anchor or R40 reskin. Broad site/consumer migration remains unfinished.

Implemented an opt-in `pending` state on CartoonButton/CircleButton (native disabled + aria-busy, stable labels, no assumed command completion), default type=button with explicit submit still supported, keyboard focus token and prefers-reduced-motion-safe press/hover. Pill sprite/label/badge share a relative surface, so menu “MỚI” no longer depends on page-specific right-14 offset/full-width parent. Existing art URLs/colors/fonts retained. Site and card layouts unchanged; broad token/consumer migration and brand/a11y audit remain.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-10 A Puffy v2 — FE654tests/60files/typecheck/lint/build PASS; theme tests cover full19variant mapping, provider root/nested legacy cleanup, native callbacks/disabled state and eight real legacy standalone paths. Browser9viewports + production public-info/admin PASS; actual mobile/desktop/landscape screenshots inspected. Original573image hash and current581image strict audit PASS. Image-wide/device/screen-reader/release acceptance not inferred.

2026-10-10 selected-A slice — Focused19tests PASS24.60s; full59files631tests PASS23.81s; full ESLint0diagnostics/TypeScript build-mode exit0; Vite production build PASS24.94s. Owned Chromium147 nine-viewports board shell YM7hpx PASS/errors[]/decoded260×99 A sprites/dark ink/keyboard-focus color/centered430px desktop/scroll/badge/dialog/guide/original tutorial. Main inspected320menu and1280menu screenshots; readable dark labels and retained badge. Synthetic dev fixture/no backend/physicalDevice=false; not full gameplay/device/screen-reader or image-wide contrast certification. First browser run T1YtgD fails focus-color assertion because programmatic focus followed pointer modality; explicit Tab before focus fixes QA modality, not application behavior, failed screenshots retained. No complete-41/release claim.

2026-10-10 — Pinned Node22.23.3: brandPalette 2tests PASS2.17s, focused ESLint exit0, TypeScript build mode exit0, Vite production build PASS22.75s. Strict original573image/15516248byte hash7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8/missing0/decode0/reskins0 and manifest80checks/200faces PASS. No new browser/device/composited bitmap contrast or fresh full regression claim for this unused token seam. Prior625FE/602BE/11browser proofs remain separately scoped, not rerun here.

2026-10-09 final verification — full53files584FEtests PASS16.97s, ESLint0diagnostics/TypeScript build-mode exit0/Vite production build PASS29.80s. Adjacent13primitive tests include7new regressions. Owned Chromium147 board-shell TdZKoo exits0 across all9viewports:320/360/390/430/768/1280/1440px plus short/landscape; ten synthetic seats scroll-reachable, no horizontal overflow/avatar overlap, centered430px desktop cap, badge anchoring, Coin dialog/guide scroll reachability and original tutorial path all pass/errors[]. Main agent inspected320menu/1280menu/844landscape guide screenshots: original sprites and readable content retained. Dev fixture/no backend/physicalDevice=false; not a fresh full9case production-preview gameplay matrix, reduced-motion motion benchmark, screen-reader/contrast or device certification. Read-only post-build manifest80localchecks/200faces and strict573images/15516248bytes/original aggregate SHA7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8/reskins0/missing0/decode0 all PASS. No R40 sample/art or release action.

2026-10-09 — focused primitive13tests PASS31.75s plus TypeScript build mode exit0. Seven new tests cover both primitive busy precedence, both native refs, all7size renderings/19original sprite paths, exact legacy spring/shadow tokens and state/reduced-motion combinations. No visual/device proof inferred from jsdom. Full FE tests/lint/build in progress; protected asset audit before this source-only extraction retains original573image hash/200faces/reskins0, to be reconfirmed after build. R30 final-refinement short fixture F7sCV5 failed HYDRATION_TIMEOUT after the recorded tool interruption; it is not a pass or proven runtime root cause. Fresh load O5i3eZ fails Docker preflight with no resources allocated while local engine unavailable; Docker startup is pending, not a reason to mark R30 done.

2026-10-02: full frontend 12 files / 110 tests pass, zero skipped; new primitive suite 6 tests. Build passes; lint has 0 errors and the same 8 baseline warnings. Isolated Chromium 9-viewport menu snapshots assert badge anchors to pill surface; `C:/Users/Admin/AppData/Local/Temp/emcoin-board-qa-dwPw8r/report.json`. Geometry does not prove full screen-reader contrast, image-failure fallback, zoom or reduced-motion device audit. No release/done approval claimed.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

Codex self-review2026-10-09 under owner authorization, not independent approval: existing props spread allowed caller aria-busy=false to contradict native disabled pending state. Both primitive paths now extract callerBusy and give pending precedence; explicit busy outside pending does not silently become disabled. Shared token seam retains original geometry/shadow/press/hover/return values and19sprite paths, confirmed by component tests and inspected9viewport shell evidence. No globalCSS/site/board/card behavior or image mutation. Rollback is targeted source reversion of this seam/busy handling, not asset/database reset. Remaining site-consumer/token/full accessibility/device/release and R40 sample gates are not waived.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
