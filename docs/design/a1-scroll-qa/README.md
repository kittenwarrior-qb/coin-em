# A1 scroll regression — 2026-10-10

Scope: layout/scroll repairs only, preserving the approved A1 artwork, card faces, Coin rules and role semantics. Frontend-design was used for layout review; the owner-approved palette and button shape were not redesigned.

## Repairs

- Ending: non-shrinking sections, safe vertical centering with auto margins, padding and native scroll. Initial focus stays on the summary panel so it does not jump to the leave button.
- Role roster reveal: viewport-bounded panel with vertical scroll.
- Waiting room: scrollable shell, reserved logo space, non-shrinking content and reachable start/leave controls on short screens.
- History: fixed-height header and a shrinking scroll body; long history no longer clips behind the outer panel.
- Shared popups: scroll content respects available container height; role/NTG reward lists shrink while header/footer remain intact.
- Card inventory: scroll grid can shrink on short screens; no changes to face URLs, crop or FlipCard rendering.
- Lobby: corner controls sit above the logo rather than losing pointer interaction on short screens.

## Reproducible evidence

Run from repository root with the pinned Node runtime and a local dev server:

```text
node e2e/scripts/check-scroll-layout.mjs http://127.0.0.1:5173
node e2e/scripts/check-scroll-gestures.mjs http://127.0.0.1:5173
node e2e/scripts/check-board-shell.mjs
node e2e/scripts/check-a1-screens.mjs http://127.0.0.1:5173
```

- `report.json`: 75 cases at 320×568, 320×400, 390×400, 844×390 and 1280×720. Tests reachability within viewport AND clipping ancestors, scrolling only genuine auto/scroll containers. Includes 10 players, 40 history events, 30 joinable rooms, private role panel, ending, Coin picker, inventory and both reward pickers.
- `gestures.json`: actual mouse-wheel movement to both ends for ending, waiting, history and inventory at 320×400; also checks ending initial scroll position.
- `gesture-*.png` and `after-*.png`: post-fix screenshots. Unprefixed ending/reveal/waiting images are pre-fix diagnostic captures, not the final appearance.
- Existing board-shell check passed all 9 viewport cases, including avatar reachability, Coin confirm, menu exit and full guide content.
- Existing A1 state matrix passed 135 cases. This is a separate style/state regression check, not a replacement for scroll checks.
- Frontend suite: 672 tests across 63 files passed; three new structure/focus guards cover ending, reveal and history.
- TypeScript, ESLint and production build passed after the final focus fix.

All fixtures are dev-only and synthetic, without backend commands or real identities. Browser checks use desktop Chromium, not physical iOS/Android devices or their real software keyboards. Reduced-height viewports model constrained space, not an actual keyboard integration test. No deployment performed.
