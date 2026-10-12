# Published PDF catalog: local verification checkpoint

## Implemented

- All100 logical cards have category-appropriate source text. Combined emotions retain separate face definitions; role keys are explicit semantic bindings independent of editable display names. Situation/reflection names remain index-based editor labels, not invented printed titles.
- Bootstrap fills only missing source fields and reviews only exact canonical matches. Custom text/names/order/media/bindings or retired cards are not silently approved; existing reviewed records are not overwritten.
- Authenticated admin supports immutable SHA256 preparation and activation/rollback for **new rooms only**. Origin/header/session guards, optimistic revisions and durable same-request receipts remain. Draft save accepts96KB; login remains4KB. Total draft/snapshot payload is bounded to3MiB.
- New rooms persist a catalog version. Existing waiting/playing and pre-version legacy rooms keep their deck. Selection, phase capabilities, previews/fan relay, logs and role artwork resolve against that version. Unknown versions fail closed, never to legacy aliases.
- Public read serves published immutable snapshots only. Frontend validates version/content hash before gameplay; loading failure offers retry/leave. Old published snapshots stay available after default rollback. Backend cache is bounded.
- PDF faces retain778×1200 layout/containment rather than legacy2:3 crop. Inventory thumbnails load lazily. Image originals are not rewritten.
- Stale start ACK refreshes the confirmed waiting snapshot but requires a new explicit host click; revision checks are not bypassed.

## Passed verification

- Full backend: **662 tests /61 files**. Full frontend: **732 tests /76 files**.
- TypeScript, frontend ESLint and production build passed. Node22 SQLite continues to emit its experimental API warning.
- Admin browser: **24 cases**, two themes × three viewports × four states; no horizontal overflow/page errors. These intercept synthetic API responses. Authentication/SQLite have separate actual HTTP/disk tests.
- Actual Socket.IO PDF preview/selection/hydration passes; rejects legacy aliases/disabled groups/forged URLs and keeps pinned images after rollback.
- Production-build Chromium: **5 guests /5 rounds /75 phase visits /15 gifts** and **10 guests /10 rounds /160 phase visits /30 gifts** finish with exact receipts/summary, reload/Back/Escape/leave. Five-seat case also passes held-ACK/projection recovery and identical-intent wire retry.
- Domain tests select situation/emotion/three shared reflection/selfcare cards through phases for1/full rounds with5/10 seats. Owner exceptions remain: current selfcare timing, shared reflection selection and ordered sender rotation; no unapproved rule changes.
- Isolated real Redis7 AOF kill/restart plus disk SQLite reopen passes pinned version/face, round limit, session hash, receipt/revision race, corruption, deletion-marker and admin-close replay checks. Owned container/temp fixture removed; no shared Redis touched.

Reports: `catalog-runtime/pdf-5-players.json`, `catalog-runtime/pdf-10-players.json`; editor captures/report in `catalog-admin/`.

## Failures repaired and retained as evidence

PhaseView initially used baseline IDs, disabling PDF emotion UI; switched it to the pinned catalog and added capability assertions. Frontend mock reused consumed Response; now returns a fresh stream. Hashing145 files hit5s under concurrent QA; retained all hash checks with an explicit20s bound. Dev-server10-seat run suffered unrequested reloads during source edits; release QA now uses fixed production preview. Admission exposed a stale start revision; ACK refreshes state without auto-starting. Populated textarea implicit labels broke exact browser lookup; explicit label/field IDs fixed all24 cases.

## Next release gate / limitations

No production DB/VPS/CDN cutover, external upload or native/store submission occurred. Browser fixtures use mocked Redis/temp disk and disabled action rate limits; they are not physical-device/WebKit/load/SLO/production-latency evidence. Real Redis fixture is not a production RPO guarantee.

SQLite contains metadata/version/receipt records, not image binaries or room/player data. WebP source assets total8,338,412bytes across145 pages. Deploy matching `fe/public/emcoin/decks/pdf-v1` assets and persist `/app/data/catalog.sqlite` with the existing backend data volume.

Configure actual HTTPS admin credentials/origin, review custom records, prepare/apply a version, then create a **new** room for staging. Older waiting rooms intentionally retain their catalog. Public marketing/3D galleries remain legacy in this change; old art has not been hard-deleted. Staging/device/CDN checks and public-gallery cutover remain before broad release. Android/iOS accounts/signing/store approvals are not provisioned.
