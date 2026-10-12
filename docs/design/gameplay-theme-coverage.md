# Gameplay theme coverage — follow-up audit

Owner reported Menu action artwork extending below the paper frame. The previous 90-case smoke test checked viewport reachability, not containment of artwork inside a fixed decorative frame, and did not enumerate every gameplay phase.

## Fixes

- Menu artwork is on the fixed dialog wrapper; only its inner action region scrolls. Header/close remain outside the scroll region. Inner margins reserve space for the paper edge.
- Long action labels wrap; the 320px Coin-to-sender action has enough height for its full label.
- Narrator phase arrows use branded circle controls for the two new themes; legacy assets, projected destinations, pending/offline/checkpoint locks are preserved.
- Card preview/reveal close controls and Coin rules use theme chrome.
- Own-role dialog has inner padding and a separately padded header.
- Situation fan has a bounded vertical scroll region on short screens. Card artwork, paths, permissions and Coin rules are unchanged.

frontend-design guided containment, hierarchy and readable action labels. The two owner-approved prototypes remain the visual directions; no new palette or regenerated artwork was introduced in this follow-up.

## Verification scope

Final frozen-source run: 272/272 gameplay renders and 90/90 Home/popup cases pass. 71 targeted component tests pass; TypeScript, targeted ESLint and production build pass. Manual screenshot review includes Menu at 430×660 with the action region scrolled to its bottom.

`e2e/scripts/check-gameplay-themes.mjs` enumerates 272 synthetic renders: 2 themes × 17 phases × 4 viewers (narrator/sender/healer/silencer) × 2 viewports (320×400, 430×932), with 10 players. It checks clipped pill text, dialog control reachability, missing images, legacy control fallback, JavaScript errors and horizontal document overflow. It waits for images to finish loading and role-card animation before capturing screenshots.

Phases: role-reveal, night, healer-turn, silencer-turn, situation-card, emotion-card, story-telling, group-response, reflection-card, reflection-sharing, selfcare-card, hug-action, guess-silencer, reveal-silencer, give-coins, reward, ended.

The 90-case Home/Menu/popup audit is also retained. Component tests cover themed phase-arrow callbacks and locks in addition to legacy behavior.

## Limits — do not equate render coverage with complete gameplay QA

- No live multiplayer backend is used and fixtures cannot send gameplay commands.
- Matrix fixtures mostly use empty selected-card state. They do not cover every selected-card combination, pending/error/reconnection branch or nested popup reached by a real action.
- Common theme chrome is present across the phases, but this does not certify all screen-specific details match the raster prototypes 100%.
- Existing role identity colors, avatars and card art intentionally remain unchanged.

Reports/screenshots: `docs/design/gameplay-theme-qa/` and `docs/design/brand-theme-qa/`. Review gallery: `docs/design/brand-prototypes-v1/gameplay-audit.html` (local gallery server port 5174).

## Short-dialog and selected-card follow-up

- Bounded game confirmation/notice dialogs to the dynamic viewport, with real internal scrolling and wrapping for long names. This also covers a 320×260 visible viewport (keyboard-height stress simulation, not an actual mobile keyboard test).
- Separated paired action artwork so adjacent button textures do not touch.
- Replaced the legacy green success-toast surface with each theme's primary material color; secondary text uses the readable theme foreground.
- Added `aria-busy` to pending night/phase confirmations. Existing pending, Escape/Back, callback and confidentiality guards remain unchanged.
- Moved selected-card pagination away from the flip instruction. QA uses three real reflection catalog entries without altering their artwork or pairings.
- DEV-only fixtures now expose night/phase confirmations, muted notice, reflection confirmation, success toast and selected-card navigation, including pending branches. No fixture can submit a server command.

Follow-up verification: 90 Home/popup cases, 54 dialog cases, 6 offline narrator board cases, and 29 component tests passed. TypeScript, targeted ESLint and production build passed. The additional dialog matrix covers both themes and 320×260, 320×400, 430×660; its report is `docs/design/theme-dialog-qa/report.json`. Screenshot capture waits for card images before accepting the result. The gallery is `docs/design/brand-prototypes-v1/dialog-audit.html` (port 5174).

Flat token contrast (not certification of every textured raster control): body/secondary text on ivory is B 10.91:1 / 5.21:1 and C 9.74:1 / 5.14:1; white text on the C success toast is 7.80:1.

frontend-design informed bounded scrolling, action spacing and text contrast while retaining the approved B/C materials. This extends, rather than replaces, the earlier phase matrix. Live server errors, actual reconnection and every authorized card combination still need end-to-end multiplayer testing; this is not a pixel-perfect certification.
