# User-facing refinement — 2026-10-11

## Outcome and boundary

Local UI/gameplay verification is ready for owner review and an authorized staging check, not a claim that public production is already serving users. No SSH, deploy, image publishing, service replacement, user-data mutation or commit was performed. The 41 task statuses are not automatically accepted by this design pass.

The frontend-design skill guided density, authored labels, readable hierarchy and consistent surfaces. The owner's approved Orbit satin and Workshop cut-paper prototypes take precedence over inventing a different skill anchor. No card artwork, URL, pair, role eligibility, Coin calculation or private-state projection was replaced.

## Improvements

- Waiting-room roster now uses available viewport height with compact portraits, multiline names and a secondary “Bạn · Chủ phòng” label. The own-profile row supports Enter/Space and visible keyboard focus. Start/leave pending behavior remains unchanged.
- Coin picker uses one full-width denomination when only red is legal; displays remaining stock and an explicit quantity label. Recipient names use a readable single-column scroll list; selected-recipient summary and pending transaction locks remain intact. Accessible denomination names remain stable independently of decorative icons/copy.
- Nine/ten-player boards on tall mobile reduce side-portrait density without scaling text or hiding players. Short screens retain safe scrolling. This does not replace the 6-player prototype with a falsely identical 10-player geometry.
- Role reward chips use readable theme ink/type; Workshop rows use paper grain. Role identity data/icons remain intact.
- Ending separates scrollable content from a persistent leave action, removes browser-default black dialog focus frame, uses real denomination icons and named counts, and folds rules into an optional details section. Totals remain received-Coin records, not a ranking.
- Inventory uses three columns and content-sized height; original card images/pairs remain untouched. Support prioritizes EmCoin contact; licensed ricimi attribution remains in secondary credits.
- Inventory and flip previews show image-error chrome and retry the identical original face URL. No substitute artwork, URL alias, private/offline PWA cache or CDN credential was added. Failed images preserve their accessible identity, and retry does not flip the parent card. A retry is recovery UI, not a guarantee that an unavailable external CDN will become available.
- `.env.example` no longer advertises Umami secrets; it documents owner-controlled EmCoin admin hash/origin configuration without any actual password.

## Verification

- Frontend: 699 tests / 66 files passed on the final source; six added regressions cover density/keyboard profile, single-denomination layout and exact-URL image retry.
- Backend: 602 tests / 55 files passed; TypeScript build passed. Backend production behavior was not edited in this pass.
- Frontend TypeScript, scoped ESLint and final production Vite build passed.
- Brand/room matrix: 90 cases passed across two themes and 320×400, 430×932, 1280×900.
- Gameplay matrix: 272 cases passed across two themes, 17 phases, four viewers and two mobile viewports.
- Supplemental matrix: final 126 cases passed. Earlier interrupted navigation/CDN failures remain historical failed attempts, not counted as passes. A directly checked affected original CDN URL returned HTTP 200; this does not establish universal CDN availability.
- Controlled local browser checks: 6 cases passed (two themes × roster keyboard/density, ending footer/counts, original local face network failure/retry).
- Actual loopback socket/browser room suite: both 5-player Orbit and 10-player Workshop scenarios passed (265.45 seconds combined). Includes start, profile, role reveal, navigation, reconnect/tab replacement and explicit leave/resume. Storage is isolated temporary disk/mocked Redis, CDN deliberately unavailable, not production durability or physical-device proof.
- Full 5-player, three-color terminal scenario: passed in 287.99 seconds; all five rounds, three denomination gifts, received totals, closed ACK/projection-loss recovery, unchanged-intent retry, terminal cold reload, Back/Escape and explicit leave. Only this selected terminal scenario ran successfully in this pass; the zero-gift and full ten-player terminal cases were filtered out, not passed. Earlier runs exposed changed accessible labels and image-error identity regressions; these were corrected before the successful final run.

## Before public service

Follow `docs/ops/r37-release-and-rollback.md`: select and authorize staging identity/cutover; provision the admin hash outside chat/source; verify exact artifact/CI, primary Redis compatibility, HTTPS/socket/public smoke, operator observation and compatible rollback. Physical mobile/WebKit, operator/privacy and any native/store acceptance remain separate gates. Do not bypass them, declare all 41 tasks done, flush storage or restore deleted-room content to force a release.

Room expiry stays one hour of inactivity. Owner-disabled room archives/external VPS backups and first-party-only analytics remain in force. Other projects and services in the shared Caddyfile are outside this pass.
