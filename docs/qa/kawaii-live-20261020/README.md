# Kawaii → live application integration

Local application: http://127.0.0.1:5183/?theme=candy-clouds

Backend-independent review of the **same production components**:
http://127.0.0.1:5183/qa-screens.html?screen=lobby&theme=candy-clouds
and http://127.0.0.1:5183/qa-board.html?count=10&phase=reflection-card&theme=candy-clouds
These review routes use synthetic data and cannot create rooms or submit commands.

The approved Kawaii study now renders through production components, not through
`CandyPrototypes.tsx`. Select **Mây Kẹo** in the real interface chooser. Existing
Mây Kẹo preferences automatically use the updated presentation; the other themes
and the separately deployed editorial website retain their own appearance.

## Implemented

- Home: original coin identity, subdued blue/pink controls, bounded entrance and
  press feedback, retained join/create/guide/resume callbacks.
- Waiting room: player grid with short-height pagination, profile editor,
  player/settings tabs, server-acknowledged round-limit saving, existing start
  restrictions and pending states.
- Board A: round-table seating. Board B: card area plus player grid. Short screens
  use table/player tabs. Layout is a local-only preference, with a session fallback
  when storage is unavailable. Phase actions stay outside the seat area.
- Catalog: three real catalog cards per page, existing category/group filtering,
  card identity, exact front/back images, selection acknowledgement and flip/close
  animation. The 3D gallery remains accessible from the catalog footer.
- Create/join forms, menu, interface/layout chooser, player profile, gift flow,
  history and approved Coin guide share the Kawaii material and type hierarchy.
- Gift presentation uses the existing eligibility, received-Coin exclusions,
  balances, pending guard and acknowledgement handler; it does not infer success.
- Chat presentation uses the existing RoomChatPanel transport and authorization
  projection. Long received messages and drafts are paginated. Draft pagination
  measures the available textarea and preserves all 500 characters, including
  newlines. Reporting keeps the original message ID. An uncertain result retains
  the exact original request for explicit retry; it never silently re-sends.
- Reduced motion and keyboard focus remain supported. Pointer-return focus does
  not leave a selected-looking button outline.

## Asset and delivery notes

The original layered coin is encoded as a 720px WebP for runtime use (28,700 bytes,
versus 284,143 bytes for the source SVG). The selected four startup images total
164,988 bytes; no prototype fixture is imported by production components.
`e2e/scripts/build-kawaii-brand.mjs` reproduces the logo encoding.

This change does not deploy the VPS, publish Android/iOS artifacts, add voice,
change rules, migrate the database, or modify card text. QA fixtures contain
explicitly synthetic data. Transport unit tests do not substitute for a live
multiplayer staging or physical-device release test.

## Reproducible verification

- `check-kawaii-live.mjs <base> --full`: 17 phases × A/B × narrator/sender across
  nine viewport sizes, plus home/waiting checks (630 cases).
- `check-kawaii-live-panels.mjs <base>`: production dialogs, a hash-verified local
  PDF catalog fixture, profile, guide and layout chooser (76 cases).
- `check-kawaii-live-chat.mjs <base>`: production chat presentation states,
  keyboard-height viewport, and exact draft reconstruction with wide characters
  and multiple newlines (247 checks).
- Frontend Vitest suite, TypeScript project build, targeted ESLint and Vite
  production build.

The layout checks inspect overflow and control bounds; they do not certify visual
approval, App Store acceptance or every physical keyboard/device combination.

## Final results — 2026-10-20

- Frontend: **819 tests passed**, 84 files.
- Board/home/waiting: **630 checks passed**; dialogs: **76 passed**;
  chat/draft reconstruction: **247 passed**. Reports are stored alongside this file.
- TypeScript, targeted ESLint and production Vite build passed.
- Built application smoke checks passed at 390×844 and 1440×900 with no broken
  images, runtime errors or document overflow. Only the Socket.IO bootstrap was
  simulated; see `production-smoke.json`. No live room commands were exercised.
- No commit/push, VPS deployment or mobile-package publication was performed.
