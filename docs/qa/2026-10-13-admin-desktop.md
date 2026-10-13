# Admin desktop redesign

Scope: only the app at app.emcoin.cloud. The separately deployed emcoin.cloud website and Mendes project are unchanged. Mendes navigation was inspected as a read-only information-architecture reference; no Payload dependencies/data were imported.

## Implemented

- Desktop sidebar, wide content area and responsive stacked navigation on smaller screens.
- Shared gameplay BrandIcon vector family, with original rooms/chart/database/lock variants.
- Overview: actual room/seat counts, searchable room IDs, existing revision-checked destructive close confirmation.
- Catalog: draft editing, paired faces, existing reviewed snapshot/activation safeguards; wider desktop fields and bounded images. Navigation/refresh/logout are disabled while a card editor or uncertain/pending release owns the operation.
- Analytics: genuine process-lifetime HTTP/error counters and latency buckets. No visitor counts, invented trend history, Umami, or player content.
- Data: transparent explanation of SQLite catalog/Redis room storage. No raw SQL, wipe-all, private-room inspection or backup feature.
- Account: current-password verification, 15-character minimum, confirmation, bounded requests, no browser credential storage. Successful rotation revokes the current session; failures/uncertain outcomes are not blindly retried.
- Durable password hash: dedicated admin-credential.sqlite next to catalog.sqlite in the existing persistent backend volume. First startup seeds from the deployment hash; later restarts retain the changed hash and ignore the old bootstrap value. SQLite FULL synchronous; file mode600 on Linux. Never persist plaintext or session tokens. Current scope remains a single backend process, not distributed admin authentication.

After a UI password change, the previously generated Windows DPAPI bootstrap password is stale: keep the new password in your own password manager. Editing the environment variable does not reset an existing credential database. Do not delete the catalog or room volumes to reset credentials.

## Theme preview instructions

Updated implementation: Home →Menu →Giao diện and Admin →Tài khoản offer Vòng Cảm Xúc and Xưởng Tử Tế. Selection saves only the approved theme ID under `emcoin.ui-theme.v1` in localStorage. Switching keeps existing application/router/popup state; no room/socket mutation or reload. If storage is denied, the choice still applies in memory with a visible warning. In-room menus deliberately do not offer switching; choose before playing.

After deployment, approved links `/?theme=emotion-orbit` and `/?theme=kindness-workshop` also select the corresponding initial theme. An explicit selection removes that override while preserving all other query/hash/history state. Old/unknown IDs are ignored in production, including invalid saved preferences. Local development retains `?theme=legacy` for Cartoon gốc and `?theme=mint-blush` for A1. These old themes are preview-only, not public selector options: expired vendor art must not be republished without valid rights.

## Local verification

- Full backend suite: 64 files /676 tests pass, including durable password rotation, logout-during-KDF cancellation and authenticated same-origin HTTP rotation.
- Full frontend suite before the final added expiry test:77 files /742 tests pass. Final focused Admin +catalog editor +popup lifecycle suite:29 tests pass, including pending-navigation lock and credential clearing/session expiry. Frontend ESLint and both TypeScript/production builds pass.
- Chromium production-preview admin browser pass at320/390/1280px: login, all sidebar sections, catalog and paired-face editor, horizontal-overflow assertions, cancel/focus restore, pending Back/Escape and same-request-ID close retry. Images are public PDF source assets; requests/auth are intercepted synthetic fixtures, not proof of live cookies/deployment.
- Final screenshot/report directory: `C:/Users/Admin/AppData/Local/Temp/emcoin-admin-browser-qa-ALZGwd`. Six views per viewport:overview,analytics,database,account,catalog,card-editor. Visually inspected desktop overview, mobile overview and desktop paired-face editor. The final editor hides its list until returning and keeps action buttons bounded instead of stretching across the desktop.

## Release boundary

## Theme-switch follow-up verification

- Frontend full suite:78 files /747 tests passed; final focused preference/admin suite17 tests passed after extracting the preference model. Frontend lint has0 errors/0 warnings; frontend production build and backend TypeScript build pass.
- Production-preview browser passed with approved theme selection/persistence at admin320/390/1280px, switching Workshop→reload→Orbit. LocalStorage contains only the approved theme preference after logout, no credentials or room metadata.
- Real Home menu checked with a separately owned Socket.IO loopback transport (no admissions, rooms or production writes) at320×568 and390×844: selector, theme materials, Esc closes only the topmost dialog, preference survives reload, no horizontal overflow. Screenshot capture waits for exit animations to finish; the underlying menu close button is hidden while the child selector is open.
- Final report/screenshots: `C:/Users/Admin/AppData/Local/Temp/emcoin-admin-browser-qa-StjmnY`. Home screenshots visually inspected. Earlier harness failures are retained in their separate temporary reports: a disconnected/initial polling-only transport could not reach Home because the client starts on WebSocket. No product connection guard was weakened to make the test pass.

## Release boundary

Local implementation/testing, not yet deployed. Password rotation changes the backend and must not be sent through the existing frontend-only update script. A reviewed backend-maintenance release is required, preserving catalog/Redis volumes and excluding active rooms. Native-foundation edits in this checkout are separate unfinished work and must not be silently included in this release.
