# R31 PWA

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R17, R21, R24, R29

## Goal

Installable PWA, public guide only offline, no card/game/private cache, and deferred in-game update (owner approval supersedes original card-cache scope).

## Current evidence

2026-10-03 bounded implementation now emits manifest/versioned public-only worker and a standalone offline Coin guide; multi-tab update and cache eviction verification is in progress. Private room state must never be cached.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R31)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R17, R21, R24, R29.
- fe/vite.config.ts; fe/index.html; fe/src/App.tsx; fe/src/Router.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`public shell/assets → service worker cache → offline read-only → reconnect/controlled update`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R31.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Owner approved public-guide-only offline and updates outside rooms. Physical install/device/Safari verification, asset provenance and release gates remain; no cache of private socket/API response.

## Implementation plan

Plan revision 2026-10-03 — owner-approved public-guide PWA: scope adds `fe/pwa/*` build-time worker generation, `fe/public/offline.html`, manifest metadata, `fe/src/features/pwa/*`, the existing GameContainer's read-only update gate and nearby unit/owned-browser tests. No dependencies, package changes, production deployment, card images or gameplay mutation. Precache only exact build-hashed offline guide/manifest/existing logo bytes; reject redirected, nonmatching or private/no-store responses. Never cache app shell, API/socket, credentials, rooms, card content or arbitrary runtime responses. Failed navigation may display the static guide; it cannot play/queue/retry commands. Worker install waits by default; explicit update needs all scoped window clients to confirm idle, fails closed on missing/busy clients, and never reloads a room. Unknown admission/connection/session state defers updates. Registration is production-only; unsupported/storage-evicted browser degrades truthfully. Preserve base-path deployments and router state. Local browser evidence is not physical installation, Safari or release approval.

Technical references: Chrome's [service worker update lifecycle](https://developer.chrome.com/docs/workbox/handling-service-worker-updates) supports waiting before activation; MDN [manifest icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons) documents scalable SVG `sizes: any`. Reuse existing EmCoin logo, not the unrelated starter favicon; no logo ownership assertion beyond the existing inventory.

1. Inventory public shell/assets versus private room/socket/API data and define cache allowlist/denylist with R24 hashes.
2. Obtain owner approval for offline/update UX; state explicitly that gameplay mutations are unavailable offline and private projections are never cached.
3. Add manifest/install metadata and a service worker that precaches only versioned public assets and uses safe bounded runtime cache policy.
4. Implement update detection that defers activation during an active room and offers an explicit refresh at a safe boundary.
5. Use R17 reconnect state to present offline read-only experience and recover only from server snapshot when online.
6. Test install/update, cold/offline public routes, private-cache inspection, mid-game update, asset rollback and browser storage eviction.

## Implementation report

2026-10-03 initial public-guide implementation: Vite build emits manifest and content-versioned worker, reusing unchanged existing logo.svg. Standalone offline guide contains approved Coin60 rules/support/audience and no scripts, game root, private data or offline commands. Only three exact hashed public resources are eligible for precache; all bodies verify before writes, redirects/private/no-store/nonmatching/error responses fail installation. Navigation is network-only with read-only guide fallback on network failure, no runtime/app/card/API/socket/POST/query/cross-origin cache or retry queue. Scoped cache cleanup preserves unrelated apps. Install does not skipWaiting; explicit activation asks every scoped window client to vote idle, defers on busy/missing/new clients, and only the requesting idle page reloads. Confirmed room/unknown/offline/admission/private session gap defers game-route votes. No production/native/store actions. Frontend-design influences truthful update/error copy and warm readable centered public guide, while protected imagery stays unchanged.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-08 — fresh current-source short matrix9PASS includes root paEJWQ50.537s and subpath XQNUch32.209s PWA scenarios. Actual Chromium147 service worker caches only public logo/manifest/offline guide, excludes private socket/API/room content, retains update deferral while another admitted tab exists and applies after safe exit. Controlled compiled-worker version change with identical app/assets, actual network drop, mockRedis room fixture and simulated browser; errors[]. Not device install prompt/native/store/WebKit/legal approval. Application source unchanged during owned run; terminal proof separate. See R29 aggregate457.35s report.

Final initial PWA browser verification2026-10-03: both production-compiled owned fixtures pass, root24.900s/subpath24.707s, Chromium147.0.7727.15, zero skips/page errors. Reports `C:/Users/Admin/AppData/Local/Temp/emcoin-pwa-browser-qa-zyNvZ1/report.json`, `C:/Users/Admin/AppData/Local/Temp/emcoin-pwa-browser-qa-ruE2tW/report.json`. Actual cache inspection is exactly logo.svg/manifest.webmanifest/offline.html; no app/card/room data. A real admitted waiting-room guest blocks another public tab's explicit update, then closing that tab permits requested reload/versioned cache replacement. Offline static guide has no script/game root, no horizontal overflow at390×844; cache eviction with actual owned HTTP disconnect gives worker503, reconnect opens app. Root BrowserRouter and /emcoin/ HashRouter manifest/scope/path work. Fixture builds uniquely scoped artifacts and uses mocked Redis/temp root/random loopback, synthetic guest, CDN block/reduced motion; update is a controlled worker-version change with identical app/assets. Offline is context emulation plus explicit owned connection drops, not physical airplane-mode. Install prompt/device/WebKit/mid-playing/full-release/independent audit remain unverified. Source unchanged during each run; old negative traces retained.

Browser harness corrections (retained negative evidence): initial owned Vite child inherited Vitest NODE_ENV=test, which compiled out production-only registration; interrupted the unbounded readiness wait, then pinned the build child only to NODE_ENV=production and added20s controller readiness. First production runs verified three-item cache and room-tab update deferral but found a reload-context race in the test and eviction returned online HTML200 despite context.setOffline(true). Trace confirms a real successful loopback network response after the first offline-guide response, not private worker-cache evidence. Safe-update test now waits for the actual requested reload; offline fixture additionally destroys only its owned HTTP connections, preventing worker-target offline-emulation escape. Worker navigation fetch is no-store and public fallback navigation response is no-store, preventing a second HTTP navigation cache. Reports retained under host temp: `emcoin-pwa-browser-qa-sZlPK5`, `emcoin-pwa-browser-qa-d3NwZH`, `emcoin-pwa-browser-qa-B3WmYx`, `emcoin-pwa-browser-qa-LFGyZx`; no failures erased or physical airplane-mode claim.

2026-10-03 initial verification:20 new worker/gate regressions pass; full FE28 files/348tests pass, zero skipped; production TypeScript/Vite build passes with generated manifest/sw, lint0errors/8 unchanged warnings. Cases cover hashed public bytes/no credentials, private/no-store/redirect/error body rejection, untouched socket/API/cards/application requests, offline read-only fallback, HTTP failure, cache eviction503, isolated cache cleanup, all-tab idle/missing-vote/out-of-scope deferral and private-session gate. Real Chromium production-artifact offline/update/cache inspection and base-path fixtures run separately; no installability/physical-device/Safari or full R31 acceptance claimed from unit tests.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

2026-10-03 owner explicitly approved: offline public guide only, no offline gameplay/Coin, no private room/socket/API cache, update only outside active game room. ADR `docs/adr/R23-R31-popup-and-offline-approved.md`. Previous offline/update open question is resolved; implementation/verification remains, no production/store authorization.

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
