# EmCoin Refactor Task Index

Nguồn backlog: `REFACTOR_MASTER_PLAN.md` §3. Đây là bảng điều phối; mỗi task có một brief riêng trong thư mục này trước khi giao implementation cho Luna/Codex.

| ID | Priority | Task | Dependency | Status |
| --- | --- | --- | --- | --- |
| R00 | P0 | Baseline và recovery evidence | — | qa |
| R01 | P0 | ADR luật và rules version | R00 | qa |
| R02 | P0 | Release guardrail | R00 | qa |
| R03 | P0 | Test harness isolation | R00 | qa |
| R04 | P0 | Socket contract | R01 | in progress |
| R05 | P0 | Quyền, input và role secrecy | R04 | in progress |
| R06 | P0 | Unified state machine | R01, R04 | in progress |
| R07 | P0 | Per-room concurrency | R03, R04, R06 | in progress |
| R08 | P0 | Durable persistence | R07 | in progress |
| R09 | P0 | Resume và session | R05, R08 | in progress |
| R10 | P0 | Timer và lifecycle | R06, R08 | in progress |
| R11 | P0 | Migration và backup | R08 | in progress |
| R12 | P0 | Role deck theo số người | R01, R06 | qa |
| R13 | P0 | Night action integrity | R01, R07, R12 | in progress |
| R14 | P0 | Coin ledger và rollback | R01, R07, R13 | in progress |
| R15 | P0 | Card catalog integrity | R01, R04, R07 | in progress |
| R16 | P0 | End state và hydration | R04, R08, R09, R15 | in progress |
| R17 | P0 | Frontend transport | R04, R07, R09, R16 | in progress |
| R18 | P1 | Frontend state boundary | R15, R17 | in progress |
| R19 | P1 | GameBoard decomposition | R18 | in progress |
| R20 | P1 | Phase UI registry | R06, R12, R19 | in progress |
| R21 | P1 | Mobile shell | R19 | in progress |
| R22 | P1 | Design system | R21 | in progress |
| R23 | P1 | Overlay và accessibility | R17, R21 | in progress |
| R24 | P1 | Asset manifest | R15 | in progress |
| R25 | P1 | Animation 2D lifecycle | R17, R19, R24 | in progress |
| R26 | P2 | Showcase 3D | R24, R25 | in progress |
| R27 | P0 | Gameplay regression suite | R01, R03 | qa |
| R28 | P0 | Real Redis persistence suite | R03, R08, R09, R10, R11 | in progress |
| R29 | P1 | Browser QA suite | R17, R20, R21, R23 | in progress |
| R30 | P1 | Load/SLO | R27, R28, R35 | in progress |
| R31 | P1 | PWA | R17, R21, R24, R29 | in progress |
| R32 | P2 | Capacitor native shell | R31, R30, R33 | planned |
| R33 | P1 | Privacy và deletion | R05, R09, R11 | in progress |
| R34 | P2 | Store release | R32, R33, R35, R37 | planned |
| R35 | P1 | Monitoring | R08, R17 | in progress |
| R36 | P1 | Admin tối thiểu | R05, R08, R33, R35 | in progress |
| R37 | P1 | Release và rollback | R02, R11, R28, R29, R35 | in progress |
| R38 | P1 | Website và documentation | R01, R22, R24, R33 | in progress |
| R39 | P1 | Toolchain hygiene | R00, R03 | in progress |
| R40 | P1 | Reskin hình ngoài thẻ và UI (cuối) | R14, R22, R24, R25, R26, R29, R38 | in progress |

## Status values

Latest own-role/reflection2026-10-03:894regular tests PASS (BE494/FE400), FE lint0errors/0warnings/TypeScript/actual Vite build26.47s PASS; corrected source-copy fresh offline-cache matrix all9commands PASS, locks unchanged/887 source-test-public-PWA files match. Initial own-role presentation extracted with exact original card450ms/pairs/layout, final reflection direct-nextTurn CTA guarded, no art/rule changes. Earlier889-runtime real5/10browser PASS64.199s/108.876s, latest initial-role Escape/mobile Back extension tracked separately.41statuses unchanged5qa/30inprogress/6planned; no reskin/deploy/independent acceptance, remaining owner/admin/native/privacy/rights/release/device/local-composition gates retained.

Corrected toolchain follow-up2026-10-03:889regular tests PASS (BE494/FE395); current corrected offline-cache clean copy passes all9 commands with unchanged locks and885 source/test/public/PWA file hashes matching before browser artifact refinement. Old broad-data copier omitted legitimate src/data; prior clean reports are command-pass/incomplete-source proof, not full coverage. Linux/network npm failures stay unwaived. Authenticated current-runtime browser5case passes89.608s,10case final-artifact timeout retained; same assertions with DOM/network trace/explicit screenshots rerun separately after owned build/test jobs complete.41statuses unchanged, no reskin or independent/release approval.

Latest phase-overlay continuation2026-10-03:888regular tests pass (BE493/FE395), full FE lint0errors/0warnings/TypeScript/Vite build pass, original573-image/200protected-face audit unchanged/zero reskins. Summary direct-call bypass corrected, pending/exit votes and local revelation focus/late-completion add11regressions beyond877. Current network clean install fails ECONNRESET; earlier877 clean/browser and Docker failures kept separately, explicit owned-cache offline rerun/current browser tracked in briefs.41statuses stay5qa/30inprogress/6planned, none done/merged; owner notification before final non-card reskin retained.

Verification follow-up2026-10-03: current877-test-source5/10guest browser cases PASS88.413s/149.044s, zero page errors/skips; fresh isolated real-Redis crash/CAS/session/delete/tombstone fixture PASS after externally available daemon, disposable fixture cleaned only. Exact scope/reports in R28/R29/consolidated progress. R39 current clean-copy/Docker build proof tracked separately. Status counts unchanged, no reskin/deploy/independent acceptance.

Current approved continuation2026-10-03:877regular tests pass (BE493/FE384), FE lint0errors/0warnings/TypeScript/actual Vite build pass, original573images/hash/200protected faces retained, zero missing/decode/reskins. Existing mobileCoin5/10browser cases pass at preceding873-test source; latest-source rerun separately scoped.11regressions over866 add Coin/legacy/fan/lifecycle safety; no card/rules/retention change.41briefs remain5qa/30inprogress/6planned, none done/merged. Owner requests notification before reskin; R40 has not started. Missing admin/native/staging configuration questions and local/device/independent/rights/privacy/release gates remain in briefs/consolidated progress.

Final2026-10-03 current-source verification:866regular tests pass, both packages lint/build/test and3 clean installs pass on pinned Node22.23.3/npm10.9.9 in owned copied workspace. Latest authenticated preview browser cases pass5guests67.988s/10guests134.395s; earlier five-case History/PWA/showcase matrix separately scoped. Original573images/hash unchanged/zero missing/decode/reskins,200protected faces.5qa/30inprogress/6planned, none done/merged; remaining implementation/device/independent/owner/admin/native/privacy/rights/release gates explicitly retained in briefs and consolidated progress.

Current preview-shell continuation2026-10-03:5qa/30inprogress/6planned across41briefs, none done/merged. FE35files/373 + unchanged BE42files/493 =866 regular passing; FE lint0errors/0warnings/typecheck/actual Vite build pass. Five-case actual-browser matrix passes for preceding863-test History source; subsequent preview shell/lineage adds3 regressions and needs separately scoped authenticated-browser results. All573image bytes/hash and200protected faces unchanged, zero reskins. Current evidence and remaining authority/device/independent gates in task briefs/consolidated QA progress.

Current2026-10-03 history/protected-inventory/toolchain continuation: **5qa/30inprogress/6planned**,41briefs,none done/merged. BE42files/493+FE34files/370=863 regular tests pass, lint0errors/0warnings/typecheck pass. All3 clean installs + both BE/FE lint/build/test pass on pinned22.23.3 before latest history extraction; latest browser/full build evidence remains separately scoped. Original573images/hash preserved, zero missing/decode errors/reskins;200exact card-face protection records, conservative139protected/51UI-candidate/383review-required local classification. R19 history extraction/R23 lifecycle/R14 truthful color display add7 regressions. Post-spacing R26 browser passes138.963s with all assertions, explicit final screenshots and DOM/network graphics trace. Admin/native/store/SLO/rights/release decisions and full decomposition/independent/device gates remain.

Latest R39/R23 continuation2026-10-03: **5qa/30inprogress/6planned**,41 briefs, none done/merged. BE491+FE361=852 regular tests pass; FE TypeScript/Vite build/lint0errors/0warnings pass. Exact100-card/24button-variant fingerprints preserved by module relocation. R23 adds named/pending/exit-safe custom game dialogs without implicit gameplay from Back/Esc. R26 earlier full actual-browser pass is recorded; post-spacing repeats time out under owned watchdog, not counted as passed. Supported-runtime clean-install matrix is running separately. Original573image hash unchanged, zero reskins; native/admin/SLO/release decisions and independent/device gates remain.

Current R31/R26 implementation continuation2026-10-03: **5qa/30inprogress/6planned**,41 briefs,none done/merged. BE491+FE356=847 regular tests pass, both builds pass, lint0errors/3warnings (five showcase warnings resolved). Owned public-guide PWA root/subpath browser cases pass with explicit network-drop/mocked-storage/device limits in R31. R26 safe ownership/error/fallback implementation is in progress; actual3D browser rerun recorded separately. Original573image hash unchanged, zero reskins; independent/device/release/full acceptance gates remain.

Current approved R23/R31 continuation 2026-10-03: **5 qa /29 in progress /7 planned**, 41 briefs, no done/merge. Owner approved topmost Back/Esc/focus and public-guide-only offline PWA; ADR records scope. R17 settings/admission and R23 popup/pending-navigation regressions bring regular verification to BE491 + FE328 =819 passing tests; builds pass and lint8 unchanged warnings. R31 is now implementation in progress, not complete/install/release proof. R23 browser rerun and PWA-specific evidence are recorded in their briefs; image/card bytes unchanged.

Final leave browser follow-up 2026-10-03: owned 5/10 authenticated guest scenarios pass (62.454s/121.520s), zero skips/page errors, including intentional menu exit and explicit retained-session resume. 781 regular tests plus these 2 browser scenarios pass. Reports/boundaries in R29/consolidated progress; status remains 5 qa /28 in progress /8 planned, no done/merge/independent sign-off. Assets/cards unchanged.

Current leave continuation 2026-10-03: **5 qa /28 in progress /8 planned**, 41 briefs, no done/merge. BE 41 files/489 tests + FE 24 files/292 tests =781 regular tests pass, zero skipped; both builds pass, lint 0 errors/8 baseline warnings. Committed leave ACK, pending confirmations and intentional-exit/manual-resume guard add 17 regressions. Final authenticated browser extension is tracked separately in R29/progress; no image/card change or independent sign-off.

Current profile continuation 2026-10-03: **5 qa /28 in progress /8 planned**, 41 briefs, no done/merge. R17/R18 exact profile ACK/editor draft+pending/display projection boundary adds 17 regressions; BE 484 + FE 280 =764 regular tests/builds pass, lint 8 baseline warnings. Cards/assets unchanged; browser/device/durability/independent approval are separate evidence gates.

Current lifecycle continuation 2026-10-03: **5 qa /28 in progress /8 planned**, 41 briefs, no done/merge. R17/R04 bounded start/end commit ACK and waiting start pending/offline controls add 29 regressions; BE 482 + FE 265 = 747 tests pass, both builds pass, lint 8 baseline warnings. All image/card bytes unchanged. Detailed verification and remaining gates belong in task/consolidated reports.

Latest response/reward continuation 2026-10-02: **5 qa / 28 in progress / 8 planned**, 41 task briefs, none done/merged. R17/R19 add bounded confirmation for four response/reward commands, intent-owned multi-step guards and picker pending/exit locks; finite 60-Coin rounds exclude legacy automatic rewards. BE 479 + FE 239 regular tests pass, zero skipped. No image/card changes or independent approval. Current verification limits are recorded in consolidated progress.

Current 2026-10-02 reconciliation: **5 qa / 28 in progress / 8 planned**, 41 briefs, no done/merge sign-off. R12 is ready for independent QA; latest evidence and implementation details belong in R12/R19/R29 and consolidated progress. This count supersedes historical notes below.

Latest continuation 2026-10-02: **4 qa / 29 in progress / 8 planned**, 41 briefs total, none done/merged. R17 navigation ACK/shared pending and replacement-error precedence add 11 regressions. R29 starts isolated actual-browser 5/10-guest create/start/navigation/reload/offline/tab-replacement coverage, no bots. Full BE 478 + FE 166 tests and 2 opt-in browser scenarios pass; builds pass, frontend lint 8 baseline warnings. All public image bytes unchanged. Full gameplay/browser/device, transport, character, privacy/rights/backup/release gates and final non-card reskin remain. This paragraph supersedes historical status counts below; implementation-owned verification is not independent acceptance.

Latest Coin/CI continuation supersedes counts above: **4 qa / 29 in progress / 8 planned**, none done/merged. Authenticated exact-receipt Coin confirmation/old-connection guards add 21 FE tests; CI safe-runner guard adds 1 BE test. BE 479 + FE 187 regular tests and 2 expanded real-browser 5/10-guest scenarios pass. CI uses the owned fixture, not legacy fixed ports; Linux CI remains unverified. Public images/cards unchanged. PWA offline/update choice requested; remaining gates and final non-card reskin are not complete.

2026-10-02: 41 task plans + 1 master plan. Hiện 4 qa, 27 in progress, 0 blocked và 10 planned; chưa task nào đạt done/merge. R20 server phase/capability projection và diagnostic/offline UI; R21 centered fluid mobile-first shell theo owner; R22 button pending/focus/surface badge; R23 reactive scoped portal (Back/Esc choice pending); R38 approved audience/support/Coin guide. Isolated Chromium 9 viewport checks và R27 actual ten-seat ten-round socket scenario pass, không thay device/real Redis/release gates. R15 frozen web catalog không quyết định catalog vật lý; R18 projection/UI boundary; R19 committed night feedback. Owner chốt phòng inactive 1h/backup 7d; R33 technical retention subset không legal policy/release; R11 audit offline, không restore/migrate. R40 giữ nguyên mọi hình liên quan đến thẻ, chỉ reskin hình ngoài thẻ/UI và chưa thay ảnh. Chi tiết: `docs/qa/2026-10-02-p0-progress.md`; report trước là lịch sử, không thay trạng thái mới. Không coi in progress là acceptance approval.

- `planned`: brief chưa được review.
- `ready`: dependency và decision cần thiết đã chốt; có thể giao Luna/Codex.
- `blocked`: thiếu dependency hoặc quyết định sản phẩm.
- `in progress`: một branch/agent đang sửa.
- `qa`: implementation xong, chờ test/audit.
- `done`: merge, test và rollback note đã hoàn tất.

Không giao một task `planned` cho Luna. Mỗi task phải có brief, acceptance criteria, test command và rollback note trước khi chuyển sang `ready`.
