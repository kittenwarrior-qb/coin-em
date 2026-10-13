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

Local development only: append `?theme=legacy` to the app URL for Cartoon gốc, `?theme=mint-blush` for A1, `?theme=emotion-orbit` for Vòng Cảm Xúc, or `?theme=kindness-workshop` for Xưởng Tử Tế. For example http://127.0.0.1:5173/?theme=legacy (use the actual local port). Reload without the query to return to default. This is not a saved preference and is deliberately DEV-only in main.tsx. Production ignores it; no public old-theme switch is claimed. Old vendor assets must not be republished without valid rights.

## Local verification

- Full backend suite: 64 files /676 tests pass, including durable password rotation, logout-during-KDF cancellation and authenticated same-origin HTTP rotation.
- Full frontend suite before the final added expiry test:77 files /742 tests pass. Final focused Admin +catalog editor suite:22 tests pass, including pending-navigation lock and credential clearing/session expiry. Frontend ESLint and both TypeScript/production builds pass.
- Chromium production-preview admin browser pass at320/390/1280px: login, all sidebar sections, catalog and paired-face editor, horizontal-overflow assertions, cancel/focus restore, pending Back/Escape and same-request-ID close retry. Images are public PDF source assets; requests/auth are intercepted synthetic fixtures, not proof of live cookies/deployment.
- Screenshot/report directory: `C:/Users/Admin/AppData/Local/Temp/emcoin-admin-browser-qa-eYjIqa`. Six views per viewport:overview,analytics,database,account,catalog,card-editor. Physically inspected desktop overview, mobile overview and desktop paired-face editor.

## Release boundary

Local implementation/testing, not yet deployed. Password rotation changes the backend and must not be sent through the existing frontend-only update script. A reviewed backend-maintenance release is required, preserving catalog/Redis volumes and excluding active rooms. Native-foundation edits in this checkout are separate unfinished work and must not be silently included in this release.
