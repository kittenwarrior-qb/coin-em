# R36 Minimal admin

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Codex self-review (owner-approved; not independent)
**Dependencies:** R05, R08, R33, R35

## Goal

RBAC admin metadata/presence, audited close-room command and no direct coin mutation.

## Current evidence

### Integrated verification — 2026-10-16

The intentionally disabled editor theme switch is now tested as disabled; the
fixture changes theme after leaving the editor. The unchanged navigation/draft
lock is preserved. Entire non-3D short browser matrix PASS7/7 (5files,338.79s),
including both-theme chat/report pagination and admin320/390/1280/1366/1920/3840.
Admin E8LUan report complete/errors[];1366x768 table screenshot visually inspected.
Integrated regular checks: BE898/74files, FE804/82files, TypeScript/lint/build PASS.
This supersedes the unresolved fixture statement below, not the retained failure
or the separate production auth-cookie/device/deployment gates. Source now also
contains bounded viewport fixes from2d48a82/87c1206. Production remains unchanged.
Focused current admin/chat follow-up also PASS2/2 in78.31s; chat host/guest draft
and Send remain reachable at300px viewport height in both themes. This is viewport
simulation, not a physical soft-keyboard claim.

### Plan revision — 2026-10-15, searchable report pagination

Continue the approved selected-report admin workflow: add bounded server-side
search and 50-row pages across retained reports, not just the newest50. Admit
ChatReportStore, authenticated admin registrar, reportsClient/ReportsPanel,
adjacent tests/browser fixture and existing admin CSS pagination tokens.
Use a strict POST read body for search terms so selected evidence is not copied
into URLs/access logs. Keep auth/Origin/header/no-store, seven-day expiry, no
new data source/storage/export, and exact resolution retry safeguards. Search
only existing selected evidence/room/sender; no full-room reader. No deployment,
production activation, game/card/theme palette/package or native licensing change.

Current slice checks: BE897/74files and FE804/82files PASS; TypeScript, FE lint and
production build PASS. Focused two-theme report browser with real in-memory SQLite
and intercepted admin HTTP PASS, including>50resolved rows, Unicode search/reset
and desktop/320px screenshots. Real Redis two-backend/100seat chat check PASS in
emcoin-chat-check-1QxWGM (same-host SQLite/single schema initializer, not sustained
capacity). Broader admin browser FAILS on an old expectation that selects a theme
while catalog editor intentionally blocks navigation; see R29. Do not mark all
admin QA green or deploy this unfinished slice. New source remains local pending
that fixture/contract reconciliation; native SDK preparation is a separate commit.

### Plan revision / implementation / QA — 2026-10-14, chat frontend

Owner authorized continuing the guarded chat foundation with room UI and selected
report moderation. Added the CRM “Báo cáo an toàn” section (status filters,
loaded-record search, accurate 50-row limit, selected evidence detail and
resolve/dismiss). Reused approved admin tokens/icons; theme/logout/navigation
are blocked while a resolution is pending or uncertain. Same UUID is retained
for explicit retry; 401 clears privileged data. Login remains login-only. No
whole-room chat reader, evidence export, auto-close or direct Coin change added.

Room UI reuses the current socket and two-theme modal; invite/join/send/block,
host moderation and selected report submission have escaped text, bounded
history, incremental revision checks, gap hydration and manual same-ID retries.
No chat/invitation content is persisted by the frontend or sent to analytics.
Disconnect invalidates ACK authority; replaced seats clear visible evidence.

Final regular checks: FE790 /82files PASS, BE787 /72files PASS; FE lint and
TypeScript/Vite build PASS. New31 FE tests cover clients/report workflow/chat
including StrictMode, uncertain retry, disconnect and stale-seat boundaries.
Owned Chromium case PASS with real guarded Socket.IO and actual in-memory
SQLite, both themes at320/390 and admin1366x768; production throttles enabled.
Admin HTTP is intercepted; room persistence is the test fixture, not Redis proof.
Screenshots inspected; font density and nested search field were refined.

Retained failures: old GameContainer fixture lacked socket listeners (expanded
fixture without removing assertions); two test query/assertion APIs were fixed;
rate-enabled browser exposed duplicate StrictMode chat hydration, fixed by
coalescing reads and a new regression. No rate-limit bypass in final browser QA.
Evidence/remaining gates: docs/ops/chat-foundation.md. Production flag remains
off and no release/deploy/SDK/license/store action occurred. R36 is not globally done.

Umami is not a game admin and current API does not define least-privilege operations.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R36)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R05, R08, R33, R35.
- be/src/index.ts; be/src/modules/room; be/src/modules/game; Caddyfile; admin API/UI modules

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`admin auth/RBAC → read metadata/projected view → command pipeline close-room → audit/telemetry`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R36.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

2026-10-03 owner confirms emcoincloud@gmail.com + separate EmCoin password/no Google OAuth, restricted metadata/close-room-only permissions and lightweight anonymous admin analytics. Exact secret hash/origin provisioning remains operator-owned; no default password. Privacy/release review and signing/hosting details remain separate; credential received in chat is intentionally not recorded/used.

Admin identity, hosting owner and data access retention require OQ-08/OQ-10 approval.

## Implementation plan

### Plan revision 2026-10-14 — selected chat report exception

Owner previously approved selected violation reports, admin-only and at most7days,
then requested continuation of chat/native plans. Admit optional `/reports` and
`/reports/resolve` in the existing authenticated registrar and adjacent real HTTP
tests. This is selected evidence only, not a browse-room/story/chat capability.
Keep fixed admin identity, exact web Origin/custom header/secure cookie and
no-store guards; native origins remain denied even with a valid admin cookie.
No Coin/role/game edits, production change or new frontend screen in this slice.
Admin triage UI/operator workflow and disclosures remain before chat activation.

### Post-deploy screenshot correction 2026-10-13

The previously reported low-contrast logout control is not a CSS defect: real admin login plus awaited button-image decode/font readiness renders the approved pink material with white text, then logout succeeds. Keep original early capture as evidence, correct QA capture timing instead of changing owner-approved theme or claim a fake UI fix. Screenshot QA must wait for decoded assets and exit-overlay DOM detachment before visual acceptance. Admin currently exposes process HTTP aggregates, not unique visitor analytics.

Subsequent raw decoded center-pixel sampling finds actual white-on-pink contrast4.25 (image sample) /4.41 (live sample), below4.5for small text, despite the material loading correctly. Admit a scoped admin logout change to the existing quiet secondary button (brand ink/light material), not a new palette/asset/global reskin. Keep destructive close-room pink and all auth/rules/data unchanged. Verify both approved themes plus real browser/small viewports; use https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html for contrast criterion, no full accessibility certification.

Plan correction2026-10-03 — self-review finds primary-commit/ACK-loss can skip the socket notification; never promise exactly-once Redis+socket delivery. Identical verified receipt replay may re-emit the existing idempotent terminal room_closed notification (no second delete/audit/write), and production notification leaves the deleted socket room and refreshes the existing public rooms_list. R17 scopes client terminal handling to the matching admitted room and matching saved session; unrelated/malformed/repeated old room_closed must not clear a newer room. Extend adjacent transport/service/real-Redis tests, not wire fields/game rules or automatic mutation retry. Supersedes earlier no-double-notification claims: business deletion remains once, notification is best-effort/replayable rather than exactly-once.

Plan revision2026-10-03 — allow targeted local Caddyfile addition for /admin/api/* on the existing emcoin.cloud same-origin site; preserve admin.emcoin.cloud/Umami/shared ocr2 blocks until host ownership/change approval, no reload/deploy/contact. Add isolated be/tests/browser/admin.browser.ts using production Vite preview, loopback-owned process and intercepted synthetic admin HTTP responses only; check320/390/1280 layouts, login/logout, pending Back/Escape, explicit same-ID retry, focus return and credential-storage absence. HTTP auth/CSRF/cookies and real Redis proof remain separate fixtures, not attributed to mocked browser responses.

Plan revision2026-10-03 — extend the existing owned be/scripts/test-real-redis.mjs and redis-fixture-worker.cjs fixture with separate synthetic admin room close/replay/restart checks; retain loopback-only new-container label/namespace/temp-root guards and teardown, never connect to shared Redis. Test compiled production repository/service with real deletion Lua and AOF always before claiming audit durability.

Plan revision2026-10-03 — admitted audited close pipeline: extend be/src/modules/room/repository/RoomRepository.ts, be/src/admin/closeRoom.ts, existing admin registrar/index and adjacent tests. Close requires authenticated session recheck inside existing inRoomQueue, exact room ID/current revision, UUID request ID and one of three content-free operator reason codes (operator-request, stuck-room, safety). Fresh primary read and existing deletion Lua CAS commit minimal actor/reason/time/revision/request receipt inside the seven-day deletion marker atomically with room/index deletion; no deleted room content/archive or external backup. Retry with the same ID and identical revision/reason reads that receipt; conflicting reuse/stale version rejects, uncertain storage fails closed. Admin close requires Redis even in development, never a new JSON-only audit authority; local anti-resurrection marker remains minimal. Existing room_closed notification only after successful commit, duplicate receipts do not emit twice. UI confirmation explicitly warns that close deletes the room without content backup, holds the request ID across uncertain retries, never retries automatically or exposes private data/Coin edits. This is one-process auth/queue compatibility, not a distributed session claim. No changes to game rules, socket event names, protected images or deployed configuration.

Plan revision2026-10-03 — admitted admin frontend: extend scope to fe/src/Router.tsx, pages/Admin.tsx, features/admin/client.ts and adjacent component/client tests. Add lazy /admin route using existing cartoon color/type primitives/mobile-first430px centered composition, no image/button-sprite replacement or reskin. Same-origin fixed /admin/api with credentials/cacheno-store/custom header, bounded response schema allowlist and no token/password storage/logging; UI admits server-cookie session only, async request owns pending/abort/unmount guard, no automatic mutation retry. Real operational totals labelled process-since-start, not fabricated pageviews/visitors. Initial unauthorized→login/unconfigured→truthful unavailable, status-safe refresh/logout, no guessed private role/story state. Close-room presentation is added only when queue/CAS/durable audit endpoint is implemented/tested; never show an operative bypass or edit Coin/roles. Existing cards/game routes/PWA guide caching unchanged. Frontend-design used to preserve owner's approved visual direction, not select a conflicting redesign anchor before R40.

Plan revision2026-10-03 — expose only guarded login/logout/overview API through new admin registrar shared by production and loopback fixtures. Require explicit application password hash plus exact HTTPS EMCOIN_ADMIN_ORIGIN; absent configuration keeps all admin endpoints503 without reading room sources. Cookie __Host-emcoin-admin is Secure/HttpOnly/SameSiteStrict/pathroot, never returned in JSON or accepted from URL/bearer/header. Require fixed custom request header, exact trusted Origin on POST, reject foreign supplied Origin on reads, disable caches and deny iframe embedding. Overview allowlists room ID/status/seatcount/revision and fixed operational aggregates; no story/nickname/role/seat-session/player IDs. No close-room endpoint until queue/CAS/audit is implemented, no signup or credential reset. Single-process sessions intentionally not distributed; backend TLS/proxy/access hardening and frontend/device/staging proof remain. Adjacent actual HTTP tests cover disabled/outsider/CSRF/auth-cookie/relogin/logout/allowlist before any release claim.

Plan revision2026-10-03 — owner confirms emcoincloud@gmail.com + distinct EmCoin password; no OAuth/OTP/Gmail password. Add be/src/admin/AdminAuth.ts and adjacent synthetic tests: fixed allowed admin, explicit salted scrypt record (N131072/r8/p1/key64/maxmem256MiB), no default password/public signup, generic invalid-credential response, same verification for wrong email, asynchronous bounded one-inflight KDF with five attempts/minute process-wide cap, random256-bit token held only as SHA256 digest, single active session/30min monotonic expiry/logout/restart revocation. Disabled unless a validated hash is configured. This is a single-process domain foundation, not exposed login/API/UI or a distributed session solution; authenticated routes, Secure/HttpOnly/SameSite cookies, Origin/CSRF controls, audited close-room/CAS and frontend still require implementation/tests. Keep all actual credentials out of fixtures/reports/source; no VPS use. Reviewed maintainer guidance from Node22 crypto and OWASP password/session/CSRF cheat sheets, not a third-party credential library or compliance certification.

Plan revision2026-10-03 — owner approves restricted status/seat-count/admin-close scope, email-based app login (not Google OAuth) and replacing Umami with lightweight first-party admin aggregates; Codex self-review replaces proposed independent reviewer only as owner-directed review mode, never a claim of independence. Record decisions in docs/adr/2026-10-03-owner-admin-and-release-direction.md. Exact email/password-versus-OTP allowlist confirmation is pending; implement only secret-free, bounded operational aggregate foundation through R35 first, do not expose admin data/routes or use VPS credentials. No private-content/role/Coin mutation, arbitrary visitor tracking, shared-host change or deployment. Extend scope to be/src/admin and its adjacent synthetic tests as actual admin auth/configuration is admitted.

1. Wait for approved admin identity, hosting/data-retention authority (OQ-08/OQ-10); inventory existing Umami and distinguish it from game administration.
2. Define least-privilege roles and recipient-safe metadata view; enumerate allowed commands, explicitly excluding direct coin/role/story mutation.
3. Route close-room or other approved action through R05 auth, R07 command pipeline, R08 commit and R35 audit telemetry.
4. Build read views from allowlisted projections and record actor/reason/time/revision for each action without secrets.
5. Add RBAC, outsider, stale session, audit completeness and no-direct-mutation tests using isolated data.
6. Do not expose operational/admin UI or data until privacy/deletion and alert ownership controls are approved.

## Implementation report

2026-10-14: selected report list/resolve endpoints use existing auth/CSRF guards,
strict command/filter shapes, bounded50-row response, exact resolution retry and
sanitized errors. SQLite contains only selected server-authored evidence and
bounded incident metadata; no role/session hashes or full room history API.
Real loopback HTTP tests verify anonymous/foreign/native/header rejection,
no-store, read/resolve replay/conflict and unavailable storage without leaks.
No admin UI/deployment or independent/store acceptance is claimed.

2026-10-03 — added lazy /admin page and allowlisted same-origin client with server-cookie auth, no credential/token storage, ten-second bounded requests, streamed256KiB response cap, schema validation, truthful process-local HTTP totals, clearing privileged views on revalidation/logout and unmount cancellation. Existing cartoon palette/fonts/button/modal sprites and430px-centered layout retained;320px screenshot review found cramped small close label and changed only use of the existing primitive to its medium size. No reskin. Added authenticated close-room registrar/service/repository method: session recheck inside existing room queue, fresh state, explicit revision/UUID/reason, existing Redis delete Lua atomically includes seven-day content-free audit/receipt, post-commit-only existing room_closed event, identical replay/no double emit, conflict/missing/storage-safe errors and no JSON-only admin-close fallback. Confirmation warns no content backup, consumes pending Back/Esc, keeps exact ID/revision/reason for explicit uncertain retries. Local anti-resurrection marker remains minimal; no player/card/Coin/role content is archived. Local Caddy adds only same-origin /admin/api route; shared/old Umami host blocks are not touched or deployed. Frontend-design guided real-content mobile-first composition without new asset creation.

2026-10-03 — AdminAuth domain and production-shared login/logout/overview API implemented with default-disabled configuration, asynchronous salted scrypt, fixed single admin allowlist, bounded verification and single-process hashed-token session, Secure/HttpOnly/Strict host cookie, Origin/custom-header checks, no-store and scrubbed parser errors. Overview allowlists room id/status/seats/revision and volatile operational HTTP totals; no private content/names/roles/player/session data. HTTP parser scoped4KB and installed before global parser to avoid credential-bearing parse diagnostics. No signup/default secret/OAuth/VPS request/deploy. Actual frontend/admin-close audit pipeline and distributed auth are not yet implemented; stay in progress. R35 removes Umami and adds fixed-space anonymous counters, not pageview/visitor profiling.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-14: real loopback selected-report HTTP4cases PASS with actual admin KDF,
cookie/origin/header auth and actual SQLite. Anonymous, foreign/native Origin and
missing custom header are rejected; selected-only/no-store responses and exact
resolution retry/conflict are checked. Malformed filters/extra actor/unknown IDs
and unavailable/private SQLite errors stay bounded/sanitized. Full backend
72files787tests and TypeScript build PASS. No admin report UI/live-data handling,
production rollout, independent security/legal/device/store acceptance claimed.

2026-10-08 — current production-preview admin case m4Kyph PASS9.703s within fresh9case short matrix, errors[]/six synthetic close HTTP requests, viewports320/390/1280. Existing confirmation, pending Back/Escape and same-ID retry assertions preserved. HTTP intercepted synthetic data only, no real admin/VPS action; backendConnected/authCookieProof false. Does not replace real auth/CSRF/cookie/Redis restart fixtures or release approval. No source/package/assets mutation; R29 aggregate9PASS457.35s.

2026-10-03 post-integration/current1064-source: main admin production-preview browser PASS40.21s total, report emcoin-admin-browser-qa-fhjNJF, errors[]/all320-390-1280 cases/real DOM/focus/Back-Esc/explicit identical retry/no storage and final320medium-pill screenshot inspected. Still synthetic intercepted HTTP/no auth-cookie/TLS proof; actual HTTP cookie/CSRF/outsider/close errors and real Redis audit/restart remain separate. Revised terminal notification is replayable best-effort after a verified receipt, NOT exactly-once; a lost primary ACK followed by explicit retry now repairs notification without another deletion. R17 adds7tests for old/duplicate/malformed/current-room/saved-session boundaries. Main BE532+FE532=1064PASS, full build/lint and exact fresh clean matrix918source hashes match; no full admin deployment/device/legal acceptance. R35 later diagnostic-only changes are separate source slice.

2026-10-03 pre-security-integration source: BE46files532PASS24.05s + FE50files525PASS32.76s =1057 regular tests, zero skips; FE full lint0errors/0warnings/TypeScript/Vite build16.39s PASS, BE build PASS. Earlier focused admin-client/UI20PASS and close/HTTP/retention32PASS were superseded by added timeout/unmount/corrupt-receipt regressions in1057. One initial synthetic queue-revocation test failed because a single microtask did not guarantee prior queue admission; repaired fixture with explicit entered/release barrier and retained the no-write/revoked-auth assertion. No implementation bypass or skip.

Actual compiled real Redis fixture PASS twice: atomic audited admin deletion/stale revision/exact replay, third SIGKILL/start and fresh-process/fresh-local-directory receipt recovery, alongside prior two-process CAS/session/retention scenarios; only labelled fixture container/temp data removed, no shared Redis/user rooms. Not host-loss/prodRPO/shared-auth/socket-adapter proof. Production-preview Chromium admin browser PASS15.309s at initial UI source, synthetic intercepted HTTP only:320/390/1280 layouts/no overflow/desktop centering, login/logout/no browser credential storage, no private extra-field rendering, confirmation cancel/Escape focus, pending Escape/Back stays/admin, identical explicit retry and no automatic repeat; errors[]. Artifacts tmp/qa-642988e27c6c48068406edd3bd04cc49/emcoin-admin-browser-qa-sfXtxl/report.json. Original320 screenshot inspected and small-button spacing improved after that run; final timeout/size/security-integrated browser repeat is tracked separately, not inherited. All573 image bytes/hash/200protected faces unchanged; strict audit0missing/decode/reskins. R39 dependency integration began only after these source/runtime results; current post-integration proof follows separately.

Final current source2026-10-03: BE45files519PASS31.02s and FE48files503PASS44.06s, zero skips; both include new authentication/API/analytics/tracker-removal tests. BE build/typecheckPASS. Configuration/API limitations in docs/ops/r36-admin-configuration.md; no actual secret provisioned, server contacted or native/store/release action. Full frontend/admin-close/shared-session/browser/staging still pending; default endpoints unavailable until safe explicit configuration.

2026-10-03 — focused AdminAuth7testsPASS13.38s using real scrypt and synthetic credentials; HTTP admin registrar6testsPASS10.93s, all actual isolated loopback routes/cookie/CSRF/outsider/allowlist/relogin/logout/malformedJSON checks. BE TypeScript lint/build passes. Full suite result follows separately; no production/browser/admin UI/distributed proof. References: https://nodejs.org/docs/latest-v22.x/api/crypto.html ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html . Exact release-tag Node docs endpoint unavailable, canonical22.x page verifies22.23.3. No compliance/certification claim.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

2026-10-03 Codex self-review (owner-approved, NOT independent): traced auth/logout revalidation, custom Origin/cookie headers, actual API parser errors, allowlisted client projection, room queue/fresh read/revision/deletion-marker Lua, lost-ACK replay and notification-after-commit. Found indefinite frontend fetch pending and corrupt marker timestamp replay risk; added bounded ten-second cancellation/streamed response cap and exact audit/marker time+retention checks, retaining manual same-ID retry/no rollback claim. Browser review found small close label cramped at320px; reused medium existing pill, no asset edit. Real Redis restart and synthetic browser/actual HTTP evidence remain distinct. Still no provisioned secret/HTTPS reverse-proxy or physical device proof; single-process sessions/throttle are intentionally not multi-worker safe. Privacy/release/operator ownership gates remain, so R36 stays in progress and does not certify41 tasks or deployment.

2026-10-03 Codex self-review, explicitly NOT independent: inspected exact password/token storage, constant bounded KDF/attempt state, private-field serialization, Origin/header/body-parser order, cookie attributes, disabled configuration and metadata allowlist. Found parser-before-auth risk during implementation and fixed it by scoping4KB JSON parser inside guarded registrar, ahead of global parser, with scrubbed fixed errors. Tests exercise genuine crypto/HTTP rather than mocked successful auth. Current slice has no room-close/Coin/role/content mutation path. Remaining release blockers: no frontend/provisioning UX, close-room queue/CAS/audit, distributed sessions/throttle, TLS/private-backend/staging/browser/device proof and privacy review. Operator secret hash/origin unset, no deployment. These findings do not approve fullR36 or all41tasks.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
