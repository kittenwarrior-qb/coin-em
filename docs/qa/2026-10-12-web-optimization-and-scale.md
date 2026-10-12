# Web optimization / communication foundation — 2026-10-12

Self-review only. No deployment, provider signup/payment, player-data upload, signed Android/iOS build or store submission.

## Implementation

- 17 non-card brand PNGs encoded to WebP (Orbit94/Workshop92, alpha100), no resize/crop; original dimensions/alpha exact, visible RGB mean absolute error <=3/255. Lossy RGB is explicitly not pixel-identical.
- Total17assets:30,198,227 →3,606,964 bytes. Startup Orbit:4,561,375 →406,310; Workshop:8,986,780 →1,373,588. These are asset-file byte counts, not total page transfer.
- All TS/CSS consumers and suffix selectors updated. Manifest112local records/content checks pass,200protected faces unchanged. Card CDN URLs/IDs/pairs not rewritten.
- Preloader warms4images from selected theme, not106unusedFriends assets. Those106 remain in asset inventory and load only where actually rendered.
- Build prunes17superseded PNG generated copies after checking every optimized replacement;17sourcePNGmasters preserved in public. No retired-icon archive or private player data deleted.
- Initial connection has8s delayed-status/retry/public-guide affordance; no offline gameplay/implicit command/session clearing. Logo uses current theme. Frontend-design skill kept recovery controls within owner-approved themes and readable action labels, rather than introducing a new palette.
- Communication foundation tests membership/end-state/gameplay silence versus safety mute,500character plain-text bound,100recent-message policy and7dayreport limit. Not connected to runtime chat/voice, report storage or admin content access. Game response commands remain unchanged pending versioned integration.

## Verification

Pinned Node22.23.3 on Windows, shared dirty workspace; no source commit or release tag.

| Check | Result / boundary |
| --- | --- |
| FE `vitest run --maxWorkers=4` |712tests/71files passed |
| BE `vitest run --maxWorkers=4` |617tests/56files passed |
| FE TypeScript / Vite build / ESLint |Passed |
| BE TypeScript noEmit |Passed |
| Asset integrity verifier |112local checks,200protected faces, protectedFaceReskins0; remote content/rights not certified |
| Build master pruning |17generated copies absent,17WebP present,17source masters retained |
| Brand browser matrix |Final90/90passed, two themes/three viewports/15views, synthetic UI/no gameplay server |
| Production public-home startup |390×844/1280×900 passed bounded image/overflow/unused-fetch checks; empty-room Socket.IO protocol stub, not production gameplay/backend evidence |
| Production initial backend outage |390×844, blocked connection:8s recovery screen, guide link and retry passed; no offline gameplay |

`e2e/scripts/check-web-startup-budget.mjs` uses fresh context/cache clear, service worker blocked, Chromium150ms latency/200,000bytes-per-second down. Total measured transfer893,620bytes, unique4startupimages407,386bytes including HTTP overhead, all theme image transfer508,252bytes (quiet asset also demanded by guide). No avatar requests, legacy brand PNG requests, broken local images, page errors or horizontal overflow. LCP5256ms mobile/4848ms desktop: byte/UX checks passed, **not** a good-Core-Web-Vitals certification or real-handset result. Further route/critical-path work and staging/device measurement required.

Screenshots inspected: `web-startup-optimization/production-home-390.png` and `production-connection-unavailable.png`. Source and visual asset identity unchanged except deliberate format encoding; no claim of100%pixel-perfect prototype.

## Failed attempts retained

- First full FE run:710pass/1timeout in originalFriends filesystem/hash walk under parallel CPU/disk load. Bounded-worker rerun passed; reduced build-fixture I/O instead of raising test timeout.
- First startup-byte unit budget failed:Workshop1,640,598bytes exceeded1.6MB. Reduced encoding quality94→92 for Workshop with same error/alpha guards; final1,373,588passed. Budget not raised.
- First/second brand matrix:89/90each; external card CDN load failure/timeout in inventory. Reports preserved in `web-startup-optimization/brand-first-attempt.json` and `brand-second-attempt.json`; third90/90passed. This remains CDN/network-dependency evidence, not proof that external requests can never fail.
- Initial production-home measurement timed out because actual bundle's Socket.IO backend was unavailable (local dev API endpoint, not release config); HTTP-only stub did not cover websocket-first transport. Final dedicated protocol bootstrap stub and separate outage case declare their boundaries. No production backend availability claim.
- First complete startup measurement counted all demanded theme resources and duplicate/no-cache transfer as the four unique preload assets; raw result retained in `production-first-measurement.json`. Final check separately reports unique startup bytes and all requested theme bytes, cold cache rather than disabling cache throughout. It does not discard quiet resource/HTTP overhead from actual page totals.

## Remaining gates

Scale qualification and third-party placement: `../ops/scale-and-media-boundary.md`. One backend writer currently; in-memory room queue/cache/timers and admin state mean Redis adapter alone is insufficient proof for safe multi-instance scaling. Historical100seat real-Redis soak is separate evidence, not new VPS/voice SLO.

Next: communication contract/invite admission/dedup/rate/report storage+TTL/admin moderation → evaluated audio-only SFU provider and native mic lifecycle → device/staging tests → Android signed/internal/closed tests → iOS toolchain/TestFlight → separate store review. Native/store tasks remain planned. Owner accounts/signing/region/provider cost/privacy and operator deployment approval are not supplied by this local QA pass.
