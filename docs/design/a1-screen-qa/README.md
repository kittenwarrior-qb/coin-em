# A1 coverage by active screen — 2026-10-10

## Current palette correction: Sky–Pink

The later owner-approved blue–pink direction supersedes the historical mint description below. Four new assets replace active mint button/circle/frame/backdrop references; pink and neutral support assets remain. Home logo backing is now a clean sky/pink gradient, not a sage halo. See `../a1-sky-pink.md` for exact prompts, original/runtime paths and scope. Latest reports: 135 screen cases, 75 scroll-layout cases, 15 public/admin cases and 4 real-wheel cases pass. 674 frontend tests pass; original573 hash unchanged; current591-image audit has missing0/decode0. Physical-device and release gates are not certified by these local synthetic checks.

## Home-to-game finishing pass

The owner's follow-up asks for a consistent reskin from Home into gameplay. The approved puffy A1 assets are reused for room selectors, dropdown triggers, compact badges, inventory tabs and round/countdown chrome. Home gets a sage/mint halo to support the original white logo; waiting panel gets matching mint depth. Explicit `data-ui-ink` hooks replace remaining decorative blue/hot-pink text on player names, profile labels and popup titles without touching role ribbon colors, avatar palette choices or Coin semantics. No protected raster asset was modified, and the rejected bean-shaped buttons remain inactive.

Visual review caught a selected-tab shorthand overriding bitmap scale; the final rule now sets the entire background, and the scroll QA explicitly requires `100% 100%` bitmap scale for all inventory tabs. Final75-case scroll rerun passed with zero failures after that correction.

Added browser assertions check computed ink plus puffy image coverage for badges and room selectors, rather than merely checking the theme name. Frontend tests now total 674/63 files; TypeScript, ESLint and production build pass. Original573-image hash guard and strict587-image audit pass with missing0/decode0. See the latest `report.json` for the fresh 135-case browser run and `../a1-scroll-qa/report.json` for the separate 75-case scroll regression. Public/admin routes retain their separate15-case check. These are synthetic desktop Chromium checks, not physical-device or release certification.

Owner requests A1 be applied to every screen, beyond the shared-control rollout. Direction: retain the restored puffy A1 mint/blush/cream family; never reintroduce the rejected bean-shaped artwork. frontend-design guides consistent chrome and readable live labels. Existing selected assets are reused; no image generation, protected-art editing, room command or deployment.

## Active screen coverage

| Screen/state | A1 treatment | Evidence |
| --- | --- | --- |
| App splash and route loading | Mint cover/backdrop/progress, dark ink, unchanged logo and load counts | loading.png, screenTheme tests |
| Lobby, create/join/menu | Existing puffy buttons/modal shell; room selection and headings matched; resume-dismiss circle | lobby and lobby-* screenshots |
| Waiting room/profile/quit | Mint/cream shell, blush own row, retained avatar and role identities | waiting and waiting-* screenshots |
| Board's17phases, narrator/sender | Table/backdrop/controls plus native phase-navigation circles | phase/viewer screenshots |
| Offline state | Same theme, original action gating retained | offline-* screenshots and interaction regressions |
| Give Coin and success | Cream shell, blush header with ink labels, mint +/- controls, original Coin imagery/colors/ACK logic | give-coins-* screenshots |
| Own-role reveal | Rounded cream frame, readable title/subtitle/role label; original3D card faces and flip behavior | role-reveal-* screenshots |
| Guess/reveal roles, response/reflection sheets | Explicit A1 panel hooks; untouched role-colored badges/avatar backgrounds | guess/reveal/group/reflection screenshots |
| Round reward/end journey/legacy pickers | A1 panel and ink labels; Coin totals and meanings unchanged | reward/ended screenshots, FE tests |
| History | Cream panel, blush header, mint close; protected card thumbnails untouched | history.png |
| Card inventory and previews | Mint/blush filter state with aria-pressed; mint prev/next/close chrome; dimmer deliberately retained | browser board QA and FE tests |
| Public introduction, cards2D, guide, cards3D, admin | Previous A1 rollout remains active | ../a1-chrome-qa/report.json:15checks |
| PWA/status/error/recovery notices | A1 cream/blush notice and pill actions, unchanged persistence/update gating | screen hooks and FE regressions |
| Standalone offline guide | Mint/cream/blush CSS-only chrome, puffy reconnect link, original Coin border colors/text; no extra cache/network dependency | offline-report.json and offline-guide-* screenshots |

## Verification

669FE tests/63files pass; ESLint/TypeScript/production build pass. Chromium147 synthetic screen matrix:135cases across320×568,430×932,1280×900 (17phases×2viewers, loading/lobby/waiting/history, create/join/menu/profile/quit, disconnected views). No horizontal overflow, uncaught page errors or legacy control fallback observed. Header and role-label computed ink checked; native circles checked against selected sprite. Role screenshots wait for decoded original role face and completed flip to avoid misleading edge-on captures. Main114-case run and extended135-case run both passed before the stricter final capture.

Sources are actual app components with no socket/storage or real identity; QA values are clearly labeled synthetic. qa-screens.html is dev-only and absent from production output. Screenshots are width430; matrix also checks320 and desktop. Original573-image aggregate guard passes unchanged7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8. Inventory587/missing0/decode0 and manifest80checks/200protected faces pass. Images/cards/logos/characters/Coin/roles/tutorial content remain unchanged.

This completes the active-screen application pass, not certification of physical-device rendering, remote rights, accessibility/contrast or all41release tasks. Dormant legacy theme and unregistered historical pages are intentionally retained; R40 acceptance remains separate from deployment. Latest authoritative machine results are report.json; retained older screenshot runs are not approval records.

Final135-case run includes native-circle bitmap assertions and decoded/finished own-role flip capture. Waiting fixture uses the component's stable-user host contract so the host's Start action is rendered; no production host logic changed. Standalone offline-guide3sizes pass with original red/green/yellow borders and no additional image/cache dependency. Thus the broader screen evidence is135synthetic states+15prior public/admin route checks+3offline guide checks, not a real-device certificate.
