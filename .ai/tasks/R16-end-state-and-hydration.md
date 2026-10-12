# R16 End state và hydration

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R04, R08, R09, R15

## Goal

Một terminal snapshot/coin summary và projector chung cho join/resume/event.

## Current evidence

game_ended có nhiều shape; FE có thể về lobby/mất ended state và summary khi refresh.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R16)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R04, R08, R09, R15.
- be/src/modules/game/services/GameService.ts; be/src/modules/room/services/RoomService.ts; fe/src/hooks/useSocket.ts; fe/src/pages/GameContainer.tsx; fe/src/components/game/PhaseOverlays.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`end command/final round → terminal commit → recipient projector → ended UI/resume hydration`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R16.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

End-of-game/rollback disclosure policy phụ thuộc OQ-01/OQ-05.

## Implementation plan

Plan revision2026-10-04 — add actual terminal browser evidence through R29-owned fixture: `be/tests/browser/terminal.browser.ts`,5independent authenticated UI guests, full5rounds/75applicable phases using actual narrator controls and required emotion-card picker/confirmed canonical selection each round. No gifts/optional story/night actions are forced: assert exact zero appreciation summary, collection, terminal on every seat, real reload/cold hydration, persistent Back/Esc and explicit leave without changing other ended guests. No fabricated snapshot/socket injection/role override, new rule or runtime/art change. New full-game-only case has bounded390s owned watchdog/420s outer (existing short fixtures/limits unchanged), unique temp/mockRedis/loopback Vite/CDNblocked and scenario-specific artifacts. Admit CI terminal artifact prefix and existing BrowserCIGuard to preserve evidence; no workflow execution/deploy. Pure socket/domain receipts and real Redis remain separate proofs; this is not positive browser gifting or device/WebKit acceptance.

Fixture correction: uthLaz FAIL at round1story-telling because selected emotion already schedules the approved server auto-advance, while the test also clicked manual NEXT after it. Await actual story-telling on every seat after confirmed selection instead; keep real clock/scheduler enabled, never synthesize or skip a phase. Source audit also confirms narrator navigation can stay mounted but disabled behind terminal panel: assert existing controls disabled, not falsely demand no DOM node. Existing case bounds and all75phase/summary/hydration/leave assertions unchanged; retain failed report/screenshots.

Second fixture correction: smv6MJ FAIL at round1give-coins because the actual auto-opened Coin picker intercepts the narrator's underlying NEXT. For the approved optional no-gift case, verify each actual picker then close it with Escape via its real popup lifecycle before advancing; no forced click, automatic gift, runtime/UI change or skip. Retain the failed report; this is required UI interaction, not suppressed product failure.

Third fixture correction: rDmj7P FAIL at round2role-reveal with reward still confirmed; source has an existing800ms client navigation cooldown, and direct next-round click followed the preceding navigation too quickly. Pace each next command from observed confirmed phase time (850ms bounded real-clock polling), never retry silently or alter throttling. After reward button, assert actual expected next phase on all5guests before incrementing completedRounds. This exposes existing fast-navigation rejection, not a passed next-round action or reason to remove the guard; retained failed evidence and unchanged runtime/case limits.

1. Inventory all end paths, `game_ended` payload shapes, listeners and the behavior of refresh/reconnect/ended UI.
2. Wait for R01/OQ-01/OQ-05 to define end and post-reveal rollback/disclosure; preserve existing semantics until approved.
3. Define one terminal commit and recipient projector containing only approved summary and capability state; terminal must reject later gameplay commands.
4. Route manual and final-round end through the same R07/R08 persistence path, then hydrate join/resume from the same projector.
5. Migrate FE ended view to remain mounted from confirmed projection rather than logging or routing away.
6. Test end per path, late ACK, terminal mutation rejection, refresh/resume and recipient secrecy.

## Implementation report

2026-10-01 — game_ended cập nhật roomState, GameContainer giữ GameBoard cho ended; manual/final-round end collect Coin, giữ history và từ chối terminal mutation. FE round/end summaries đọc receipts. Member get_room_state hydration đã được socket test; browser refresh/resume/private projection chưa kiểm đủ.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

2026-10-08 — Post-notice-layout R29 MDqvvv PASS1/filtered2,233.43s: controlled first red-gift ACK/projection loss, same journal across reload and exact hydrated receipt check without retransmission, then all5rounds/15gifts/15received and exact final totals/reload/Back/Escape/explicit leave retained. This is current-runtime five-seat proof after R21 responsive notice fix, not inherited latest10case/zero/browser matrix or manual-end/realRedis/device certification. No terminal/game rule/art change; task remains in progress.

2026-10-08 — R29 additional ten-guest terminal case ueBCBh PASS1/filtered2,557.12s total:10rounds/160phases/30UI gifts/30receipt viewers/exact nonzero summary on all10guests. Giver reload/checkpoint, mobile final reload/Back/Escape and explicit leave with nine retained terminal guests pass. Three partial-scrolled screenshots inspected/10traces retained; no one-screen layout/accessibility claim. MockRedis/disabledlimits/blockedCDN/simulatedChromium, not manual end/durable/device/ACK-loss acceptance. Existing5case bounds unchanged; separate terminal CI job configured locally, not executed on GitHub. Full592/build and protected manifest pass; task stays in progress.

2026-10-08 — R29 positive terminal fixture separately PASS213.41s command total/1case (zero-gift filtered, earlier unchanged zero scenario separately passed). YIm8k6:15actual UI gifts/15recipient receipt viewers over5complete rounds/75phases; independent expected exact round/final received totals on all5guests. Giver reload retains4green/4yellow spendable plus locked previous; terminal mobile reload/Back/Escape retains exact nonzero summary, explicit leave preserves the other4ended guests. Three screenshots inspected/five traces retained. Partial mobile summary screenshot is not full visual/control-fit proof; all screenshots use blocked CDN and original artwork. Prior combined failed mJRgAJ preserved; mockRedis/disabledlimiter/simulatedChromium boundaries remain, not manual-end/device/durable/ACK-loss acceptance. Full BE581/build pass after fixture changes, no runtime/art edits. R29 brief owns plan/results, R16 remains in progress.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

2026-10-04 — Final owned terminal browser `ObiP8g` PASS201.19s: five actual UI guests finish five rounds/75 applicable phases/five required emotion selections, with all five Narrators rotating exactly once. Exact zero-gift received totals on all terminal summaries; mobile cold reload, Escape and Back preserve the ended panel/route. Explicit UI leave returns only that guest to the lobby, the remaining four stay ended. Five trace archives/report and mobile/desktop screenshots retained under `tmp/qa-642988e27c6c48068406edd3bd04cc49/emcoin-terminal-browser-qa-ObiP8g/`; both screenshots inspected, mobile captures only part of the scrolled summary and is not all-controls-fit evidence. Actual Chromium147/real clocks/loopback handlers, mocked Redis/temp disk, rate limiter disabled, external CDN blocked, reduced motion, simulated viewports. Not positive browser gifting, manual-end browser proof, real-storage durability, WebKit/device/load/release acceptance. Current full default BE54files581tests PASS32.95s and TypeScript build PASS. Failed fixture attempts and corrections in the plan are retained; runtime rules and assets were not changed. Task remains in progress for its other acceptance boundaries.

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
