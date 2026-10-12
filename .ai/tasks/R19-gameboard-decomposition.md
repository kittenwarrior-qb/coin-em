# R19 GameBoard decomposition

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R18

## Goal

GameBoard composition cùng controller/hooks/phase views rõ trách nhiệm.

## Current evidence

GameBoard 1,658 dòng gánh render, phase, draft, animation và actions.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R19)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R18.
- fe/src/pages/GameBoard.tsx; fe/src/components/game/TableBoard.tsx; fe/src/components/game/PlayerLayout.tsx; fe/src/components/game/GameModals.tsx; fe/src/hooks/useCoinRewardPreview.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`transport/store selectors → board controller → phase/player/modal components → action callbacks`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R19.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Không thay layout/luật trong khi tách; visual direction cần giữ với R21/R22.

## Implementation plan

Plan revision2026-10-03 — controller/composition seam: admit features/game/controllers/useBoardController.ts and adjacent boardTypes.ts, preserving the current confirmed board's exact hooks/state/effects/handlers/derived values with one admitted projection and existing scoped ACK controller. GameBoard keeps the valid-phase guard and unchanged JSX composition; move only non-render ownership, not into a second store/snapshot. Preserve CARD_DATA/ROLE_TO_IMAGE/phase authority/commands/assets/DOM/classes and the exact celebration policy. Return explicit local bindings used by JSX; transport callbacks keep current signatures/defaults. Verify the original JSX bytes/hash survive relocation and add adjacent controller regressions for scope resets, same-scope drafts, pending/late ACK and cleanup. Full lint/typecheck/tests/build and authentic5/10browser smoke follow independently. No art/reskin/phase timing/rule/role/Coin change and no line-count target or fabricated device timings used as acceptance.

### Plan revision 2026-10-03 — local countdown ownership

Extract existing countdown-player eligibility/key/duration verbatim into pure `features/game/selectors/turnCountdown.ts`; move original animated top-right countdown and its250ms wall-clock display timer into `features/game/components/TurnCountdown.tsx`. Board keeps admitted player/phase/role/capability inputs and AnimatePresence, but no longer owns display ticks. Key timer by existing actionScope plus existing countdown key, so same-phase reentry/new viewer cannot inherit elapsed display. Preserve exact30/60seconds, clamp0, DOM/classes/spring and visibility rules; never advance a phase, award Coin or send commands on expiry. Cancel timers on animation exit/unmount. Add selector/component/React Profiler structural regressions, with jsdom timing explicitly not production/device performance certification. No new gameplay timing rule, asset, layout or reskin.

Plan refinement2026-10-03 — extract existing current-round log slicing/row wording into pure `features/game/selectors/roundHistory.ts`, with explicit admitted player/log arrays and currentRound. Memoize its read-only output in Board across local popup/draft renders, never introduce a store or a second revision gate. Preserve original marker/legacy fallback, names, unknown-event rows, finite Coin color and explicit legacy green conversion, card objects/URLs and all existing text. Add pure marker/name/color/identity/immutability tests; no history reconstruction or reward calculation. Existing real Board History tests must remain green.

Plan refinement2026-10-03 — keep action-renderer table/types in `phaseActionRenderers.tsx` separate from component-only `BoardPhaseActions.tsx`, so extraction introduces no Fast Refresh lint warning. Also move selected-card inline presentation/navigation into `features/game/components/SelectedCardPreview.tsx` and pure `features/game/selectors/previewNavigation.ts` with explicit already-projected cards/phase/preview/pending/scope/local callbacks. Preserve exact original FlipCard pairs/large size/initial face/reveal flag, navigation order, dots, dragElastic0.15/60px threshold and modal focus ownership. No fetch/catalog lookup/private reconstruction/confirmed state copy or reskin; old gesture callbacks must be inert after pending/selection/scope/exit change.

### Plan revision 2026-10-03 — phase action presentation boundary

Extract the existing central action fieldset/navigation/card/Coin openers into `features/game/phases/BoardPhaseActions.tsx` and adjacent component tests. Use explicit admitted phase/capabilities, selected-card counts, local pending/connectivity/checkpoint inputs and existing callbacks. Preserve every current button/arrow/label/class/asset and finite-vs-legacy branch; an exhaustive GamePhase renderer registry owns presentation only. GameBoard keeps all state, capability admission, commands, ACK controller and popup state. Scoped live guard prevents an old renderer callback from opening a popup or sending through an outdated phase instance. No new wire/rule/phase/card/visual direction; independent profiling/full decomposition remain separate.

Plan revision2026-10-03 — paired R23 extraction includes `OwnRoleRevealModal.tsx` and tests, moving only original inline own-role presentation to explicit role/front/back/pending/local-dismiss props. Board retains admitted own-role mapping and round-dismissed state. Exact card autoFlip450ms/layout/URLs/pairs preserved. Reflection-card confirm joins existing controller; do not nest it into multi-step confirmed reward chains or change capability/navigation rules. Complete phase decomposition/profiling still separate.

Plan revision2026-10-03 — paired R23 summary/vote boundary includes listed PhaseOverlays module and adjacent tests. Existing reward next-round button bypasses useConfirmedAction; route only its explicit callback through the existing scoped controller, recheck server advance capability/connectivity and retain summary on false/uncertain/late ACK. Pass pending to original nonmodal vote region; no new store, rule, phase, auto-advance, Coin award, image or layout. Full phase decomposition/profiling remains separate.

Plan revision 2026-10-03 — paired R23 preview-shell extraction adds `features/game/components/BoardPreviewModal.tsx` and adjacent tests. Board retains selected navigation/revelation data; shell owns only presentation/lifecycle and pending/exit locks. Original card pairs, FlipCard sizing and existing drag thresholds remain. Full phase/controller decomposition is separate; no new store/socket or speculative state.

Plan revision 2026-10-03 — extract existing history presentation into `features/game/components/HistoryModal.tsx` with exact existing layout/art/row/card DOM and explicit round/projected-log/close/preview props. Keep log filtering and recipient data authority in GameBoard, no new state/store/commands. Add approved R23 named/topmost/pending/animation-exit focus lifecycle. Scope includes component/Board regressions. During read found GIVE_COIN detail always says green: R14 paired revision fixes only display, taking explicit legacy receiverGainsGreen when present, otherwise original committed coinType. Preserve legacy conversion logs, finite color semantics and original card pairs. Broader Board/controller decomposition remains.

### Plan revision 2026-10-02 — scoped confirmation controller

Extract GameBoard's synchronous pending guard into `features/game/controllers/useConfirmedAction.ts` and nearby hook/component tests. Scope by room, viewer, socket ID, round and phase instance (not every revision). Only the owning still-current intent can complete or release pending; scope/unmount/offline changes must not let an old completion mark new-phase drafts successful. Catch unexpected callback rejection as an inline truthful uncertainty alert, without retry or gameplay projection changes. Reset phase-local navigation/drafts on committed phase-instance/scope change, including same-phase reentry; preserve drafts for ordinary revision updates. Keep layout/art/commands and independent Coin journal unchanged. This is a controller boundary, not complete phase-view decomposition or accessibility approval.

Exit-lifecycle evidence refinement: the navigation popup remains mounted during its existing AnimatePresence exit. Its buttons/backdrop must become non-actionable immediately when no longer present; include the listed GameModals component and test the real exit rather than suppressing animations to conceal stale controls. No Back/Esc policy change.

Type boundary correction includes `components/game/types.ts`: declare the existing optional server revision/phaseInstance fields already used by transport, rather than adding a wire field or weakening TypeScript. Component test queries use Testing Library's supported exact-name matching, not Playwright-only options; asynchronous exit assertions must tolerate the popup already being removed.

### Plan revision 2026-10-02 — night feedback boundary

Scope adds `fe/src/features/game/controllers/useNightFeedback.ts`, `components/FlyingActionIconEffect.tsx` and focused hook/component tests. Extract only the existing night feedback behavior/component from GameBoard, preserving layout/assets/command signatures. Initialize feedback deduplication from the first accepted projection so cold hydration does not replay historic actions; use type/actor/target/timestamp fingerprints rather than timestamp alone. Render night feedback only for a newly committed log visible to its recipient; remove action-handler speculative flying feedback. No new event, phase rule, privacy exposure or animation design; missing projected logs are not reconstructed. Full controller/phase decomposition, screenshots and profiling remain separate work.

1. Capture visual/action baseline for all observed role/phase states and identify responsibility seams in GameBoard.
2. Use R18 selectors and R17 actions to extract a controller first; retain present layout and DOM semantics unless a tested bug requires change.
3. Split existing TableBoard, PlayerLayout, GameModals and PhaseOverlays by explicit props/capabilities, not by copied room state.
4. Move draft/animation/overlay behavior to local feature hooks and ensure unmount/reconnect preserves confirmed projection.
5. Migrate one phase at a time with screenshot/action contract comparisons; keep temporary adapters time-bounded.
6. Run component/controller regressions, profiler and multi-client smoke; defer responsive restyling to R21 and new motion to R25.

## Implementation report

2026-10-04 controller/composition boundary: GameBoard now retains valid-phase admission and original JSX composition, while useBoardController owns its existing projection-derived values, local drafts/effects and scoped ACK actions; boardTypes preserves callback signatures/defaults. The first mechanical split asserted exact original JSX bytes; subsequent extraction moved only four existing fan/skip/navigation/menu callbacks into named controller handlers, keeping their body/guards/ACK semantics and all classes, ordering, pairs, assets and FlipCard props. No domain command call remains inline in GameBoard rendering. Nine new real-hook regressions cover revision draft retention, phase reentry reset, duplicate/uncertain confirmation without speculative flight, old ACK/new intent isolation, stable-identity focus after socket replacement, offline/unmount behavior, admitted navigation/leave and exact fan relay/card identity. Relative import relocation and one obsolete setter binding were caught by TypeScript and corrected, never suppressed. Full FE52files548PASS18.59s/zero-warning ESLint10/TypeScript/Vite36.83s PASS; GameContainer433.15KB/gzip125.99KB, CSS79.73KB/gzip14.68KB unchanged. Later R24 manifest source is a separately verified slice, not inherited from this proof. Physical-device/profiler budgets and full acceptance remain separate.

2026-10-03 local countdown ownership: extracted pure turnCountdown eligibility/keyFor/duration and original top-right animated TurnCountdown. Board no longer owns display tick state; original30/60second wall-clock clamp0/250ms cadence/classes/spring/testID/visibility and per-player keys preserved. Existing actionScope keys top-right timer for same-phase reentry; interval cancels at animation exit/unmount and never sends/advances/awards. Actual GameBoard regression spies on original TableBoard (no replacement) and verifies five1second display updates produce zero further TableBoard renders/commands while a new projected player snapshot still renders without resetting elapsed same-scope countdown. React Profiler child/sibling fixture is structural jsdom evidence only, not device/production timings.21selector+7component+1realBoard tests added. Initial focused run exposed forgotten renderPlayer consumer of extracted keyFor; corrected by returning that same pure function, not duplicating eligibility or hiding tests. Full FE46files501PASS20.58s before additional realBoard test; final focused realBoard1PASS6.31s, lint0errors/0warnings/TypeScript/Vite12.16sPASS. Fresh copied997-source clean matrixLwBbmP passes all9commands, FE includes all502 tests, BE495;904 runtime/test/public/PWA files matched before later R39 copier-only/static-test fix. Original573images/hash/200faces unchanged/0reskins; full controller/composition and browser/device/independent/profiler budgets remain.

2026-10-03 scoped preview timer extracted into useSituationPreview. Previous timer lacked unmount/scope/admission cleanup and could relay an old card after context changed. New explicit actionScope/admission gate cancels queued work on pending/offline/capability loss/committed selection/phase change/unmount; old callbacks remain inert even after disable/re-enable. Same-scope rerenders preserve original250ms debounce and use current transport callback; original CardData identity preserved. Ten hook regressions pass; complete FE44files473 PASS24.16s, BE495 unchanged=968 regular tests. Initial test used a matcher unavailable in pinned Vitest2; changed to equivalent supported call-count/argument assertions, no dependency upgrade or weakened assertion. Prior958 clean/browser evidence is not inherited for this subsequent source. Full decomposition/profiling/device/independent acceptance remain.

### Plan revision 2026-10-03 — scoped preview debounce

Add `features/game/controllers/useSituationPreview.ts` and adjacent hook regressions; replace only GameBoard's existing 250ms situation-preview timer. Preserve the preview callback, original card identity and debounce interval. Cancel queued preview on room/viewer/socket/round/phase-instance scope change, offline, pending command, removed selectSituation capability, committed situation selection and unmount. Old captured callbacks must not schedule previews for a later scope. This relay is transient presentation, not a committed selection or automatic retry. No catalog, art, gameplay rule, socket event, room state or release change.

2026-10-03 — phase actions, selected-card presentation and round-history selector extracted. GameBoard keeps confirmed projection, action scope/capabilities, ACK controller and popup draft ownership; BoardPhaseActions consumes explicit props and an exhaustive17-phase action-renderer table, preserving buttons/arrows/classes/text and finite/legacy paths. Scoped live callbacks cannot act after pending/scope/unmount. SelectedCardPreview receives only already-authorized cards/preview/phase and exact original pairs/large FlipCard/face flags, navigation order/dots/dragElastic0.15/strict60px gestures. Pure previewNavigation never fetches/looks up additional cards. Pure roundHistory preserves existing marker/legacy fallback/row strings/card identities/Coin conversion, memoized in Board across local renders. No state copy, new command/rule/event, catalog/art/layout or reskin.41new tests (25action-matrix/8preview/8history) pass; full FE42files451 + BE494 unchanged=945 regular. Full FE lint0errors/0warnings/TypeScript/Vite15.96s PASS. Initial Fast Refresh warning fixed by separating renderer table/types from component-only module, not disabling the lint rule; one fixture used CARD_DATA.role rather than actual roles, corrected without catalog changes. Current clean-copy/browser proofs separately recorded; full controller/modal decomposition/profiler/device/independent review remain.

2026-10-03 — initial own-role inline presentation extracted into OwnRoleRevealModal with explicit admitted role/back/front/pending/local-close props, original max430/max92dvh/classes/large FlipCard/450ms autoFlip retained. Board keeps role mapping/round-dismissal; shell keys existing action scope and owns only topmost/pending/exit focus lifecycle. Reflection-card confirmation's remaining direct-nextTurn caller now shares handleAdvance with summary, using the existing scoped controller/server capability/connectivity, no new navigation rule. Audit now finds only controller-owned or guarded multi-step nextTurn calls in Board. Five new component/Board regressions pass; full FE39files/400 plus BE494=894 regular PASS. Full phase/controller decomposition/profiling and independent/device gates remain.

2026-10-03 — corrected remaining summary callback bypass: explicit next-round/end label now uses existing scoped useConfirmedAction, with server advance capability and connectivity rechecks; no direct fire-and-forget path, duplicate/old-phase-instance ACK cannot unlock a newer intent. Summary retains original current-round projected Coin counts/layout/art and stays mounted on rejection; original nonmodal voting receives pending/exit locks. Related revelation presentation adds pending/topmost/focus lifecycle and late-completion guard, keyed by existing action scope, not new phase/coin rules.11 new adjacent phase-overlay/Board regressions pass in current full395-FE test suite. Full decomposition/profiling remains separate.

2026-10-03 selected/own-role preview presentation shell extracted into BoardPreviewModal with explicit label/pending/close/children props. Board retains authorized card/nav/revelation/role data and unchanged FlipCard pairs, size, initial face and drag thresholds. Stable shell with keyed FlipCard retains existing face reset without losing popup focus ownership. No state/store/socket/rule/art changes; complete phase/controller decomposition/profiling remain.

2026-10-03 history presentation extracted into HistoryModal with unchanged existing panel/rows/card-thumbnail classes/URLs and explicit projected-log/currentRound/close/preview props. Parent still filters recipient-visible current-round logs; no new history store/private reconstruction/socket command. R23 lifecycle names/focus-traps it, pending and exit block close/preview controls. Original CardData passes back only through existing local preview callback. During extraction found hardcoded green GIVE_COIN detail; now reads explicit legacy receiverGainsGreen, otherwise committed coinType. Finite red/yellow/green retained, legacy conversion preserved, unknown type neutral. Seven added component/Board regressions pass after fixing one leftover variable name caught by tests/typecheck. Full decomposition/profiling/preview-overlay migration still remain; no acceptance claim.

2026-10-02 — Legacy reflection/reward continuation: R17 now supplies boolean ACK results for response/reflection/NTG/role confirmation. Existing legacy pickers lock selections, confirmation and backdrop while pending or exiting. GameBoard waits for reflection, role rewards, then navigation separately; rejection keeps selection and stops advancement. The controller supplies an intent-owned continuation guard, not only a room/phase comparison: offline/reconnect, scope change, unmount or a newer intent invalidate old multi-step work. Finite 60-Coin rounds explicitly exclude these legacy automatic-reward pickers. No card content, images, rules or phase transition changes; the sequence is not a transaction and already committed earlier steps remain committed. Five added Board, four picker and two controller regressions cover this slice. Full decomposition/profiling and independent audit remain.

2026-10-02 — Scoped confirmation controller extracted from GameBoard: synchronous duplicate guard, current room/viewer/socket/round/phase-instance ownership, offline/scope/unmount invalidation and owner-only completion/cleanup. An old Promise cannot set completion flags or release a newer pending intent. Same-phase revision updates retain local intent; committed same-phase reentry clears phase-local navigation/night/situation drafts. Unexpected callback rejection leaves the confirmed board and navigation intent mounted, exposes a truthful inline uncertainty alert and does not automatically retry. Coin journaling and transport ACK semantics remain separate.

Navigation popup uses existing AnimatePresence presence to disable exit-phase buttons/backdrop immediately, preserving its existing art/motion. Common RoomState now declares the existing optional wire revision/phaseInstance fields; no wire fields invented. Fourteen controller regressions plus three real GameBoard component regressions added. Initial component assertions assumed immediate DOM removal during animation; repaired to verify exiting controls are disabled and eventual removal, not disable animations. Full build then exposed missing shared type declarations and unsupported Playwright-style exact query option in Testing Library; corrected types/test API, not diagnostics suppression. Frontend-design guided preservation and truthful inline error copy, with no layout/art reskin or gameplay-rule changes. Complete phase decomposition/profiling remains, so R19 stays in progress.

2026-10-02: Extracted the existing FlyingActionIconEffect verbatim into a feature component and night log effects into `useNightFeedback`. GameBoard retains layout/assets/command signatures but no longer emits speculative night flights on click. Visible committed logs trigger actor/narrator flights and existing silence notices; hydration, room/round/viewer/role changes baseline logs rather than replaying history. Type/actor/target/timestamp fingerprints prevent timestamp-only collisions and revision replay; local animation nonce distinguishes simultaneous-timestamp operations. No hidden log/role is reconstructed. Missing actor/target safely produces no feedback, terminal projection clears it.

8 hook + 3 component jsdom regressions pass, covering hydration, scope switches, duplicate revision, simultaneous timestamps, audience, missing/terminal data and original DOM anchor/motion/asset contract. Full FE: 10 files / 96 tests pass, zero skipped; build passes with existing font/CSS warnings. A new component fixture initially expected target top-left rather than center-minus-18px, and its mock transition argument failed lint; repaired fixture/math without changing runtime animation. Full controller/phase decomposition, generic action ACK states, screenshots/profiling/multi-client smoke remain; not acceptance/done. Frontend-design preservation guidance was followed; no art/style replacement.

## QA report

2026-10-04 preceding controller-only source: current owned offline-cache clean S1E5ij all9commands PASS, BE543/FE548; authenticated5/10Chromium room browser2PASS209.86s with original scenarios/countdown/Back/Esc/focus/leave-resume checks, reports emcoin-room-browser-qa-ETgWdu (5) and MAuwDQ (10). Loopback/mock Redis/disabled limiter/blocked CDN/simulated viewport limits retained; no card/asset/rule change. Subsequent R24 manifest and CI guard edits need fresh evidence; this is not real device/full16-phase browser/release approval.

2026-10-03 final current full source: FE47files502PASS53.04s, BE42files496PASS21.39s, zero skips. Includes29new countdown regressions and actual original TableBoard render spy; not fabricated device performance numbers. FE lint0errors/0warnings/TypeScript/Vite12.16sPASS. Current Chromium5/10countdown/display/previous-reentry/recovery PASS71.854s/90.211s; exact904-file clean runtime copy and Linux production Docker build/entry/static-output proofs scoped separately in R29/R39. GameBoard975lines; remaining controller/modal composition and profiler/device/independent acceptance not marked done. Strict573-image hash/200faces unchanged/0reskins.

2026-10-03 final scoped-preview source verification: full FE44files473PASS24.16s; full ESLint0errors/0warnings, TypeScript and actual Vite production buildPASS24.76s. BE495 source unchanged since its final full pass. Asset audit unchanged573images/hash/200protectedfaces/zeroreskins and diff whitespace checkPASS. This968-test source's hook/Board regressions are separate from preceding958-source clean/browser evidence. No physical device/profiler/independent/full-task completion approval.

2026-10-03 actual Vite production build passes for the863-test History source; authenticated5/10-guest History Escape/Back/focus browser matrix passes77.483s/111.764s as part of five-case suite. Consolidated QA progress records paths and mock Redis/device limits. Subsequent preview-shell extraction is not inherited as tested by this earlier run.

2026-10-03 full latest regular rerun: FE34files/370tests + BE42files/493tests =863 pass, zero skips. Seven new history regressions verify unchanged exact thumbnail/parent preview callback, pending Back/Esc/controls, real opener focus/route retention, finite red/yellow/green, legacy receiverGainsGreen and unknown neutral labels without another gift. Initial extraction typo left the map using visibleRoundLogs rather than logs; component tests and TypeScript caught it, corrected before full green. FE lint0errors/0warnings, TypeScript pass; production Vite result and updated authenticated browser history evidence recorded separately. Existing images/log-authority/commands unchanged, not complete decomposition/device/audit.

Current continuation: 16 controller, 8 Board scope/confirmation and 4 picker regressions pass; full FE 239 and BE 479 tests pass, zero skipped. Both builds pass; lint 0 errors/8 existing warnings. Existing images/catalog/rules remain unchanged. These are implementation-owned jsdom/mock transport regressions; no full decomposition, profiler, physical-device or independent audit approval is claimed.

Latest implementation-owned verification: full FE 20 files / 204 tests pass, zero skipped; production build passes with no font/CSS warnings; lint 0 errors / 8 unchanged baseline warnings. Tests cover duplicate/false/void/throw/reject, room/viewer/socket/round/phase-instance switches, offline/reconnect, unmount, ordinary same-scope rerenders and actual navigation exit/late completion/error behavior. Read-only asset audit remains exactly 573 images / 15,516,248 bytes / aggregate hash `7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8`, zero reskins/decode errors; existing missing avatar remains. Latest R29 owned browser run/report is recorded in consolidated progress; no physical-device/profiler/full phase/independent sign-off claim.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
