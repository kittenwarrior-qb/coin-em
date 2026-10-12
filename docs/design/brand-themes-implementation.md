# Two brand themes — first implementation

Owner selected both prototype directions B (Vòng Cảm Xúc) and C (Xưởng Tử Tế). The application default is now emotion-orbit. kindness-workshop is available through the development preview query. There is no user-facing switch or persisted preference yet.

## Scope

- Independent registry entries, shared semantic tokens and dedicated native SVG chrome.
- Root provider and portal inheritance; selection does not remount game state.
- Home background/logo support, menu rows/icons, common buttons, compact labels, modals, fields, dropdowns, scrollbars, progress controls, board table and named site/game chrome.
- Protected card faces, Coin artwork/colors, roles, avatars and gameplay rules are unchanged. The owner explicitly requested replacing the logo; both themes now use independent prototype-derived wordmarks.
- Legacy and previous A1 remain registered.

## Preview

- B Home: http://127.0.0.1:5173/qa-screens.html?screen=lobby&theme=emotion-orbit
- C Home: http://127.0.0.1:5173/qa-screens.html?screen=lobby&theme=kindness-workshop
- B board: http://127.0.0.1:5173/qa-board.html?count=10&phase=give-coins&theme=emotion-orbit
- C board: http://127.0.0.1:5173/qa-board.html?count=10&phase=give-coins&theme=kindness-workshop

Fixture data is synthetic; no socket or gameplay commands are sent. Preview query is development-only. Production uses the registered default.

## Direction and differences from concept images

frontend-design guided explicit hierarchy, separate visual systems, restrained texture, live text and reuse of real content. Owner-approved palettes take precedence over the skill's fixed anchor presets.

B uses indigo, berry accents, porcelain surfaces and interrupted orbit geometry. C uses denim/coral, paper-colored surfaces, subtle grain, skewed decorative layers and gently irregular control edges. Controls remain aligned; card/board geometry is retained instead of reproducing the AI images' invented layout/data.

These are live implementations, not pixel-perfect copies of the raster concepts. Version 3 replaces flat approximate chrome with separated raster backgrounds, satin/paper action surfaces, menu frames and undistorted table art. Home has live icons, dividers, labels and arrows at prototype-relative positions; the original white logo/support plate is no longer used by these themes. No invented AI progress markers, coin counts or card artwork were carried into the app. Typography/icon details and generated texture/wordmark contours still differ from the approved raster images. Do not claim every hardcoded surface is audited: the browser checks cover named fixtures, not all real multiplayer interactions or all public-site routes.

Review `brand-prototypes-v1/comparison-v3.html` for a side-by-side reference/live screenshot comparison. The built-in imagegen prompt set and asset provenance are in `brand-assets-v3.md`. `prototypeFidelity.css` is the shared implementation layer, not a full-screen screenshot with invisible click regions. Low-height Home scrolls naturally; Home dialogs are viewport anchored so their close buttons remain reachable.

## Validation

Follow-up after the owner reported broken Menu containment: see `gameplay-theme-coverage.md`. The fixed frame now sits outside the scrollable action region. The gameplay audit covers all 17 phases with four viewers, including narrow-screen pill-text clipping; 272 cases and 71 focused tests pass, in addition to the 90 Home/popup cases. This is synthetic render coverage, not complete live multiplayer or pixel-fidelity acceptance.

- Current v3/v4 refinement: 29 targeted tests across 7 files pass (brand controls/Home callbacks, theme state preservation, modal/menu lifecycle, Coin modal lifecycle, countdown render isolation and protected assets). The earlier broad pass covered 68 tests before these refinements.
- TypeScript and targeted ESLint checks pass.
- Browser script: e2e/scripts/check-brand-themes.mjs.
- 90 cases: 2 themes × 3 viewports (320×400, 430×932, 1280×900) × 15 scenarios (Home, Menu, Create, Join, Guide, Inventory, Loading, Waiting, History, Role reward, NTG reward, Guess picker, six-player Board, ten-player Give-Coins, Ended).
- Checks theme ID, JavaScript errors, loaded images, legacy control fallback, horizontal document overflow and scroll reachability of dialog/Home controls. Waits for the provider to mount before evaluating a page, rather than treating Vite module compilation latency as a theme failure.
- Browser screenshots/report: docs/design/brand-theme-qa/.
- No live backend, deployment or store packaging done as part of this change.

## Future switch

Use ControlThemeProvider with a registered ControlThemeId. A preferences control can change its theme value without remounting App, rooms, timers or pending requests. Add persisted preference and settings UI separately; do not reload an active room to change theme.
