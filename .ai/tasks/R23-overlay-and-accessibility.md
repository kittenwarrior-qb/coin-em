# R23 Overlay và accessibility

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R17, R21

## Goal

Scoped overlay root, viewport-centered loading, inline errors và focus/ESC/back policy.

## Current evidence

Modal/loading scope không nhất quán; action error có thể thay cả board.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R23)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R17, R21.
- fe/src/components/cartoon/CartoonModal.tsx; fe/src/components/game/AssetPreloaderScreen.tsx; fe/src/Router.tsx; fe/src/components/game/GameModals.tsx; fe/src/pages/GameContainer.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`action/loading/error state → scoped overlay or inline feedback → focus/back lifecycle → preserved board`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R23.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Owner approved topmost Back/Esc + opener focus return and no dismissal/navigation while pending on 2026-10-03. Full custom-overlay/screen-reader/device audit remains; do not hide recovery state.

## Implementation plan

Plan revision2026-10-03 — terminal leave presentation: include GameContainer's existing leavePending prop handoff to GameBoard, existing EndedOverlay and adjacent component/container tests. Ended explicit leave currently lacks busy/disabled presentation although parent transport rejects duplicates. Name the blocking terminal panel, preserve original full-board layout/summary/art, do not turn Back/Esc into leave. Pending/offline/exit lock its explicit button; combine parent leavePending with existing phase controller/popup lock so other mounted controls cannot start a command while leaving. No new terminal permission, retry, session clearing or game transition; parent remains confirmed leave owner.

Plan revision2026-10-03 — caller/overlay audit finds remaining inline initial own-role revelation in GameBoard (original FlipCard auto-flip/art) not on popup stack, plus reflection-card explicit confirmation directly calls nextTurn. Add presentation-only `features/game/components/OwnRoleRevealModal.tsx`/adjacent tests: exact original DOM/layout/back/front/450ms autoFlip, named topmost/pending/exit-safe local dismissal keyed by existing action scope, no secret-role reconstruction. Route reflection confirm through existing bounded controller/server capability/offline checks, preserve selected cards/rejected drafts and original CTA. No game/card/art/rule/session/wire changes. Prior889-source clean/browser proof stays separately scoped.

Plan refinement2026-10-03 — same listed PhaseOverlays scope also covers the existing local-only role-revelation popup: named/topmost focus lifecycle, pending Back/Esc/close guard, unchanged closing animation; late exit completion must not open reward preview in a newer phase. Keep role metadata/projected players/votes/art/counts untouched, no permission inferred from display metadata, no server command on dismissal. Key that instance by existing action scope and add adjacent real-animation/pending/focus regressions.

Plan revision2026-10-03 — remaining phase overlays: scope adds existing `components/game/PhaseOverlays.tsx`/GameBoard integration and adjacent tests. Current RewardOverlay directly invokes nextTurn outside the confirmed-action controller; route this explicit button through the existing bounded controller/capability/offline guard, never let Back/Esc advance a round. Name/focus-trap the existing blocking summary as a persistent dialog; pending/exit disable the button and stale handlers. GuessSilencer remains a nonmodal bottom region, locks pending/exit votes without adding history/focus trap or inventing vote permissions. Keep every existing image/layout/summary/Coin count and backend rule unchanged. Docker/clean proof for preceding877-source remains separately scoped.

Plan revision2026-10-03 — include existing NtgRewardPicker/RoleRewardPicker/RandomSituationFan and focused tests. Ntg picker close only cancels local selection: eligible Back/Esc when not pending. Role picker onClose advances the server phase: register a persistent named dialog WITHOUT Escape-to-onClose, preserving existing explicit buttons/backdrop behavior, never implicitly skip. Situation fan is a non-modal partial board region, use group semantics not a trap/sentinel; disable selection/confirm/drag/wheel/browse during pending or animated exit with latest presence guards. Preserve original facedown images/card order/gesture math/transitions/callbacks; no domain rules or reskin.

Plan revision2026-10-03 — inspection found GiveCoinPicker still lets close/backdrop/recipient/type/amount change while awaiting its Coin callback. Include existing GiveCoinPicker, parent GameBoard identity key and adjacent tests: synchronous duplicate guard, no success unless strict true, truthful unexpected-error alert, pending/animation-exit locks, named parent and topmost success child with focus return. Preserve existing finite eligibility/allocation/re-gift exclusion, original icons/amounts/art/command signature. Unmounted/exiting confirmation cannot decorate a replacement picker; no rollback/retry/new receipt policy.

Plan revision2026-10-03 — continue approved popup migration with existing `CoinCarousel.tsx`/GameBoard calls/tests: named dialog, explicit keyboard close, pending/exit navigation/drag/flip/backdrop locks; retain exact original Coin URLs/counts/order/poses/transitions and no Coin mutation. Shared lifecycle regression must cover immediate popup replacement while owned history traversal is pending, retaining original router state/opener without a stale sentinel. Scope includes usePopupLifecycle and actual component tests. Owner requests notification before R40 production; no reskin starts in this slice.

CoinDisplay scope refinement: add descriptive accessible names/type=button to its existing three coin preview openers, preserving icons/counts/order and callbacks. This permits authentic mobile-browser viewer/open/next/Escape/Back/focus checks without selecting by fabricated counts or hidden state.

Plan revision 2026-10-03 — migrate existing selected-card and role-card preview shells in GameBoard to adjacent `BoardPreviewModal.tsx`, keeping exact original artwork, FlipCard pose/size, navigation list, revelation authority and drag thresholds. Add only named/topmost/pending/animation-exit lifecycle and an explicit close button for keyboard users. Scope includes shared popup opener-lineage handling and component tests: when History is replaced by preview, retain its connected page opener rather than focus a detached thumbnail. Never expose a concealed face or turn Back/Esc into a game command. No reskin or card-content/image modification.

Plan revision2026-10-03 — HistoryModal follows R19 extraction: scope includes the adjacent component and tests, named dialog/topmost Back/Esc/opener return, pending and exit controls blocked. Do not dismiss into a preview while command pending or mutate/log-filter outside GameBoard. Original panel/card art/layout and recipient secrecy preserved; new selected/role previews remain separately tracked.

Plan revision 2026-10-03 — migrate existing GameModals notice/night confirmation/phase navigation to the same lifecycle using unconditional refs and animation presence. Named dialog + topmost Back/Esc, pending/exit protection, focus return; unchanged controls/art/commands. Reflection reward is a mandatory game decision: Escape must NOT call onSkip or onConfirm (either advances gameplay), so register a persistent named dialog without a dismiss callback. Existing noninteractive success toast gets status semantics, not a modal/focus trap. Add real-component pending/nested/Back/decision regressions; no new reward/rules policy.

Scope refinement for approved pending rule: include GameBoard's existing phase-action pending controller and GameContainer's start/leave/admission/Coin pending states via a non-visual history guard. It must not create a dialog, steal focus, submit anything or change timeout/uncertainty policy; it only consumes Back/Esc while the bounded command is pending, including commands that have no popup.

Plan revision 2026-10-03 — approved popup lifecycle: owner approved topmost Back/Esc dismissal, focus return and no dismissal while server confirmation is pending; ADR `docs/adr/R23-R31-popup-and-offline-approved.md`. Add a shared registration/lifecycle manager for existing CartoonModal and adjacent legacy GuideBook/CardInventory overlays, with topmost keyboard/focus trap, named dialogs and one same-URL history sentinel for nested popups. Programmatic close consumes only the owned sentinel without triggering a route leave; persistent pending popup consumes Back/Esc without closing, and lower popup cannot react. Preserve router history state and original card/art/phase interactions. Tests cover nested ownership, pending, focus return/trap, popstate and unmount cleanup. Broader custom game-overlay migration/device screen-reader audit remains separately tracked.

### Plan revision 2026-10-02 — deterministic scoped portal target

First slice fixes CartoonModal's non-reactive portalRef: first opening previously rendered inline until another state update; subsequent relocation remounted content. Resolve a reactive target before rendering open content, with optional explicit container, existing game/screen/body fallback and fixed viewport overlay for body. Add short-viewport scroll bounds without changing card content. Tests cover first open, explicit scoping, subsequent state updates and body fallback. Source path correction: AssetPreloaderScreen is `fe/src/components/AssetPreloaderScreen.tsx`. Nested Back/Esc/focus policy awaits the owner question; do not claim a complete accessible dialog or introduce a mobile-history workaround in this slice.

1. Inventory modal, portal, loading, error and navigation paths; capture cases where board unmounts or focus is lost.
2. Obtain product approval for nested-modal and mobile back policy; define defaults that retain recovery state and close only the top eligible overlay.
3. Create scoped overlay roots and an overlay state contract separating screen loading, panel modal, popover and inline action error.
4. Migrate one modal/loading/error path at a time, restoring focus and preserving confirmed board state across reconnect.
5. Add keyboard/ESC/back, focus trap, screen-reader labels, nested modal, mobile keyboard and error recovery tests.
6. Coordinate safe-area sizing with R21 and action lifecycle with R17; do not hide server rejection in a generic overlay.

## Implementation report

2026-10-03 terminal leave continuation: GameContainer now passes its confirmed leavePending into GameBoard. Board combines this with phase-local pending and disables the phase controller while leaving; EndedOverlay has named persistent dialog semantics and uses the existing pending/presence guard, no implicit Back/Esc leave. Original terminal totals/art/full-board classes remain; explicit leave CTA is busy/disabled pending/offline and parent still owns ACK/session teardown. Three new terminal/actual-board tests plus existing container waiting/playing/ended leave tests verify handoff, offline/pending, original totals, no implicit leave and detached-control safety. Full FE39files410 PASS, lint0errors/0warnings/TypeScript/actual production Vite15.55s PASS; BE494 unchanged, combined904. This is implementation-owned jsdom, not endgame browser/device/audit proof. Clean-copy/current browser verification follows separately; no reskin.

2026-10-03 — initial own-role popup now named "Vai trò của bạn", participates in existing topmost Back/Esc/focus lifecycle, disables old close/flip handlers while pending or during original animation exit. No backdrop dismissal newly invented; only existing button and approved keyboard/history dismissal local to round. Original role face pairs/art/size/450ms auto-flip/role label/layout remain, parent retains authorized own-role lookup. Reflection confirm now waits through existing controller, preserves selected card after rejected ACK and honors denied server capability. Five added regressions and full400-FE suite pass, no new callback protocol/rule/asset. Authenticated initial-popup Escape/mobile Back extension follows separately.

2026-10-03 — existing summary is now named/focus-trapped persistent dialog: no Back/Esc skip/advance, pending/capability/offline/animation-exit locks; explicit confirmation routed through existing Board controller. GuessSilencer stays nonmodal, original vote options/avatar images preserved and disabled during pending/exit. Revelation named local-only dialog uses topmost Back/Esc/focus, original closing animation; synchronous closing and completion refs prevent duplicate callbacks, newly pending operation defers local preview, unmount/old action scope cannot open stale reward preview. No role secrecy/metadata/card/Coin rules/art/layout changes.11 added component/Board regressions; no claim these phases were exercised by prior authenticated browser cases.

2026-10-03 second continuation: legacy NtgRewardPicker has named/topmost/pending-safe local dismissal; RoleRewardPicker is named/persistent because its onClose issues nextTurn, so Back/Esc never becomes an implicit phase advance. Explicit existing buttons/backdrop remain unchanged. Situation fan is a nonmodal group, not a focus trap; pending/exit disables selection/confirm/drag/wheel/browse, including delayed handlers through latest presence refs. Existing facedown art/order/gesture math/ephemeral unmount notification retained. Coin viewer capture/latest guards also block outgoing-face interaction without altering transitions. Full role/phase/custom overlay/device audit still remains.

2026-10-03 continuation: CoinCarousel now named/topmost with keyboard close and pending/exit flip/drag/navigation locks; original Coin faces/counts/order/sizing/transitions retained. CoinDisplay gains truthful accessible opener names. GiveCoinPicker inspection found unguarded pending close/backdrop/type/amount/recipient controls; these now lock with synchronous duplicate protection. Strict true alone opens the named success child; Escape/Back returns to picker, not another gift or parent exit. Unexpected callback rejection retains draft and shows truthful alert, no automatic retry. Presence/unmount guard prevents late receipt decorating an exiting instance; Board keys picker by existing room/viewer/round/phase identity. No Coin balances, allocations, eligibility, receipt protocol or art change. The fast-popup-replacement regression passed, including deferred browser-like history traversal; no unproven lifecycle rewrite was made.

2026-10-03 selected/own-role preview shells extracted into BoardPreviewModal, named/topmost and pending/animation-exit protected. Explicit close uses the existing icon library; authorized FlipCard pairs, sizing, reveal/flip permission and horizontal60px/vertical100px drag thresholds are retained. Stable shell navigation preserves focus ownership while keyed FlipCard resets the selected face. Shared lifecycle retains opener ancestry so detached History thumbnail falls back to its connected page opener. Parent still determines recipient-authorized content and navigation; no gameplay/socket mutation or reskin. Own-token keyboard semantics and remaining mandatory/reward/Coin/custom overlays still need separate migration/audit.

2026-10-03 — GameModals notice, night confirmation and phase navigation now register named dialogs with animation-presence cleanup, pending/exit controls, topmost Back/Esc and opener focus. Nonce replacement re-registers the actual notice node. Mandatory reflection reward stays persistent: Back/Esc never becomes a skip/reward command; only existing explicit controls act. Success toast is role=status, no focus trap. Art, gameplay and command callbacks retained. Source scope migration is still not a full screen-reader/device or all custom-overlay claim.

2026-10-03 approved lifecycle slice: shared same-URL history/focus manager names/traps CartoonModal, GuideBook and CardInventory/preview dialogs. Only top eligible popup handles Back/Esc; lower dialogs are inert except ancestors of a nested legacy preview. Router history state is preserved, programmatic close consumes only its owned sentinel, and opener focus is restored after history traversal. Pending admission/start/leave/Coin/phase commands add a non-visual navigation guard, without socket mutations or focus stealing. Card preview/navigation/backdrop locks pending and retains original artwork. Other bespoke role/history/phase overlays remain migration work, not a blanket a11y completion.

Reactive pre-render portal target replaces effect-mutated ref, with explicit container override and existing game/screen/body fallback. Body overlays are fixed viewport scope; screen overlays remain absolute to their shell. Child state does not remount when parent updates after first opening. Panel now scrolls within dynamic viewport bounds; no card assets or state commands changed. No Back/history/ESC/focus-trap policy implemented pending owner's answer; this slice is not an accessible-dialog completion claim.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

Current own-role/reflection continuation2026-10-03: FE39files/400 PASS, zero skips, unchanged BE42files/494 yields894 regular.24 focused own-role/phase-overlay/controller-Board tests pass, including three new presentation/pending/focus/real-exit tests (FlipCard props mocked locally, actual animation shell retained) and two real-Board reflection ACK/capability regressions with frozen real card data. Full FE lint0errors/0warnings, TypeScript and actual Vite build PASS26.47s. Strict573images/hash/200protected faces/280static/142remote unchanged, zero missing/decode/reskins; no private role or card art reconstructed. Earlier889 clean/browser proof remains separate; latest corrected offline matrix/new initial-role browser extension follows separately, not device/full-phase/independent acceptance.

Current phase-overlay continuation2026-10-03: FE38files/395tests PASS, combined unchanged backend42files/493=888 regular, zero skips.11 added summary/vote/revelation/actual-Board regressions cover pending/capability/offline, duplicate click, rejected ACK retention, old-instance ACK ownership, nonmodal votes, original avatars/counts, local closing/focus, pending during closing and unmount without stale preview. Initial test pass emitted a real hook-order warning (short-circuited useIsPresent); corrected unconditional hook call and clean rerun. One test expected outgoing revelation DOM although its original phase removal has no exit animation; retain original immediate unmount and assert detached disabled control/no callback. Wrapped animation wait in act; unsupported Testing Library `exact` option caught by TypeScript and removed while retaining exact-string query semantics. Full lint0errors/0warnings, TypeScript and actual Vite build PASS11.62s; strict573-image/200protected-face audit unchanged/zero missing/decode/reskins. Current network clean copy fails npm ECONNRESET separately; earlier877-source clean/browser proofs not inherited, owned offline-cache clean rerun follows separately. No physical-device/full-phase-browser/independent approval.

Final current877-test-source authenticated browser rerun2026-10-03 PASSED:5guests88.413s/10guests149.044s. Owned reports `emcoin-room-browser-qa-s3bu0F`/`emcoin-room-browser-qa-sVs4ys` under relocated D: QA root; details/limitations in R29. Coin preview mobile390x844 next/Escape/Back/focus assertions and existing self-role/Menu/History checks pass. Viewed current Coin screenshot, count/close/arrows/2of3 fit; deliberately blocked CDN means no original-art delivery claim. Gift/legacy/fan pending/exit correctness remains regular-test evidence, not newly claimed authenticated browser transfer/legacy flow coverage. No reskin or card alteration.

Final latest regular verification2026-10-03: FE37files/384tests + BE42files/493tests =877 pass, zero skipped. FE lint0errors/0warnings/TypeScript/actual Vite production build pass; strict573-image aggregate hash/200protected faces unchanged, zero missing/decode/reskins; diff --check exit0. Adds11regressions over866-test source (one fast lifecycle replacement, six Coin components, two legacy keyboard decisions, two fan pending/exit). Fast replacement also passes with deferred browser-like history traversal, no reproduced bug/no unnecessary manager rewrite. Clean-copy matrix still belongs to earlier866-test source; current authenticated browser rerun is separate. Local/jsdom/mock storage evidence is not all-overlay/device/independent acceptance.

2026-10-03 mobile Coin viewer browser source passes5guests75.952s/10guests132.644s,2cases/zero skips/exit0. Reports under owned QA prefix in `emcoin-room-browser-qa-jgPgFk/report.json` and `emcoin-room-browser-qa-eAXQLa/report.json`; additional390px Coin screenshot inspected: count/header/close/arrows/counter fit without overlap, remote artwork deliberately blocked so not art-delivery evidence. Actual local viewer next/Escape/Back/opener focus/current phase checks pass, existing own-role/Menu/History/session recovery retained. This run predates subsequent legacy/fan/capture changes; those need separately scoped verification, not inherited browser coverage. Full FE36files/380tests passed at that earlier source.

Second continuation focused22tests pass:2legacy Back/Esc decision regressions and2nonmodal fan pending/exit regressions, plus prior actual Coin/controller tests. Existing exiting-picker tests now explicitly include hidden inert controls while retaining disabled/no-command/eventual-unmount assertions. Latest full/lint/build results follow separately. Neither legacy automatic rewards nor mandatory onClose are introduced into the finite60Coin path.

2026-10-03 focused13tests pass:6real Coin display/viewer/picker regressions +7shared lifecycle checks. Initial11pass/1fail was an unsupported Vitest matcher; replaced with separate exact count/args assertions, not waived. Initial full FE36files/379tests passes; additional opener regression brings expected380, latest full/build/browser verification recorded separately after completion. Lint0errors/0warnings, original573images/hash/200faces unchanged; zero reskins. Tests cover eligible recipient/draft/count/art invariants, pending Back/Esc/controls/duplicate, success topmost, unexpected rejection and exiting late receipt. No all41 acceptance/device/durable-transfer claim.

Final preview browser rerun2026-10-03: actual5/10 authenticated guests pass67.988s/134.395s, zero skips/errors; own-role named popup/original face label/Escape/explicit close retain role-reveal, existing Menu/History and gameplay/recovery slices pass. Exact reports and retained initial wrong-name-selector failures in R29/consolidated progress. Own-token keyboard semantics, other bespoke overlays and device/independent audit still remain; no blanket a11y or41-task completion.

2026-10-03 preview regular verification: full FE35files/373tests pass, prior unchanged BE42files/493tests gives866 regular; FE lint0errors/0warnings, TypeScript and actual Vite build pass. Three actual-shell regressions verify pending Back/Esc/close/child locks with exact original faces, animated History replacement/navigation/opener lineage and inert exiting controls. First focused15pass/1fail found fixture child click bubbling into backdrop (actual Board inner motion already stops propagation); fixture now mirrors that boundary, not a waived assertion. New authenticated role-preview browser verification is recorded separately; no device/independent/all41 acceptance.

2026-10-03 History-source actual browser matrix passes all5 cases/zero skips on Node22.23.3: authentic5/10-guest menu and History topmost Escape/Back/focus route retention, public-guide root/subpath and showcase. Reports and fixture limits in consolidated QA progress. This predates the subsequent selected/role preview migration, which needs its own focused/full verification; no all-overlay/device/independent sign-off.

Final R23 component rerun2026-10-03: full FE32files/361tests pass (four new custom-dialog regressions), BE41files/491tests pass, total852 regular tests/zero skips. TypeScript, actual Vite production build and ESLint0errors/0warnings pass. Inert exiting controls are still asserted disabled/no command and eventually unmounted. Original573image hashes unchanged. This is jsdom/component evidence, not a new all-phase browser/device or independent acceptance claim.

2026-10-03 — four actual-component regressions added for pending night Back/Esc, nested custom-phase focus restoration, mandatory reward no implicit skip and notice replacement. Initial focused run caught a parent animation-readiness assertion and lint caught a bare ternary; corrected by waiting for actual visible animation and explicit if/else, no lint waiver. Full run360pass/1fail exposed existing exit-animation test using accessible lookup for a deliberately inert/aria-hidden exiting dialog; it now explicitly includes hidden controls and retains disabled/no-command/unmount assertions. Full rerun required; do not claim this intermediate run passed.

2026-10-03: six lifecycle unit regressions plus a pending CardInventory-preview regression pass; full FE26 files/328 tests, BE41 files/491 tests =819 regular tests, zero skipped. FE production build passes; lint0errors/8 unchanged warnings. Found/fixed history traversal overriding synchronous opener focus with a post-popstate restoration. First expanded actual-browser 5/10 run failed at a nonexistent waiting-room Menu selector; synthetic traces retained in `emcoin-room-browser-qa-80xzrs`/`emcoin-room-browser-qa-DkqWA9` under host temp. Menu exists on GameBoard, so scenario moved after authentic role reveal; rerun recorded separately, not treated as product failure or waived assertion. Asset hash remains original; no cards/reskin/deploy or independent approval.

2026-10-02 five new portal tests pass: first open, explicit shell, body fixed, lobby fallback and stable child state. Full frontend 14 files / 118 tests pass, zero skipped, build and lint pass (8 unchanged warnings and baseline font/CSS warnings). Isolated 9-viewport menu/Coin geometry still passes after the portal fix, `C:/Users/Admin/AppData/Local/Temp/emcoin-board-qa-itk4W1/report.json`. Nested/keyboard/focus/back/device audit remains. No deploy/independent audit approval.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
