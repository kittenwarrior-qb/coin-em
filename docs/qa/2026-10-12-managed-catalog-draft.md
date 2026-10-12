# Managed catalog draft QA — 2026-10-12

Self-review; local implementation, not VPS deployment/store approval/activation of replacement gameplay.

## Delivered

- `be/src/catalog/CatalogStore.ts`: actual SQLite metadata DB, WAL/FULL transaction policy, unique stable ID/code, bounded500cards, optimistic catalog revision, persisted UUID4 retry receipts, immutable prepared snapshots (not active publication). Node22.23.3 built-in `node:sqlite` avoids adding a driver/ORM/container, but emits experimental warning; pinned runtime/build validation required.
- `be/src/catalog/pdfDraft.ts`:100logical draft records:7role/32situation/32emotion/14reflection/15selfcare; names/group/order/front-back source mapping. Owner approved combined-emotion faces pairing. Role duplicated print instances11/13/15 retained as source media, not guessed into new role mechanics.
- `fe/public/emcoin/decks/pdf-v1/`:145WebP pages, total8,338,412bytes. Mechanical Poppler1200px long edge/WebP94, no creative editing. File manifest SHA256/provenance in `fe/src/assets/pdfDeckAssets.json`; exporter refuses overwriting version with another source PDF hash. Original PDF untouched; original runtime deck unchanged.
- Existing restricted admin gains authenticated GET `/admin/api/catalog` and POST `/admin/api/catalog/save`; drafts are no-store and not publicly readable. Auth/session/origin protections retained. Login4KB limit preserved; catalog save32KB handles Unicode definitions/URLs. Exact DTO and Cloudinary/local image path validation; no network fetching from backend or upload secret embedded.
- Admin editor: search, stable ID, add/save, rename/order/category/group/definition/prompt/two face URLs, reviewed/archived flags and paired preview. Pending commit locks editor and parent admin controls; unknown outcome retries same intent/request ID; stale revision retains local edit; save-confirmed/refetch-failed never resends the committed write. Browser previews reject unsafe URL schemes/hosts.
- Metadata-only SQLite default `data/catalog.sqlite` uses existing backend data mount; database is not created in repo by this QA (disk tests use owned temp paths). No new Docker DB service or Cloudinary upload.

## Tests

- FE full719tests/73files passed; fullsrclint, TypeScript and production Vite build passed.
- BE full630tests/57files passed after parser fix; TypeScript/build passed. Focused actual SQLite close/reopen and authenticated loopback HTTP catalog write/replay/conflict/bad-origin/bad-URL tests passed.
- Browser24cases:2themes×3viewports320×400/430×932/1280×900×list/edit/uncertain/stale, all passed. Intercepted synthetic API, actual frontend/PDF images; does not certify auth or database durability. Auth/SQLite covered separately by actual HTTP/unit tests.
- Screenshots visually inspected Orbit430edit and Workshop320list; no horizontal overflow/errors. SourcePDF viewed through PDF skill; editor uses frontend-design discipline and owner themes, not a new brand palette.
- `docs/qa/catalog-admin/report.json` and24PNG capture artifacts; no real user data/password/session in reports.

## Failure history

Initial registrar parser limit widened globally from4KBto16KB for card metadata; oversized-login regression detected401instead400. Corrected per-route limit (login4KB/catalogsave32KB), focused10adminHTTPtests pass and full630rerun pass. Preserve the failure as regression evidence, not a passed old attempt. Follow-up save-confirmed/catalog-refetch failure was found during review and gets a dedicated FE regression; no duplicate revision mutation after confirmed ACK.

## Not complete / must not claim

Historical checkpoint below: see `2026-10-12-catalog-preparation.md` for the follow-up (61 source prompts imported, authenticated readiness/snapshot preparation now exposed). Round count is implemented and tested separately in `2026-10-12-round-limit.md`, superseding the plan-only note below.

100drafts have definition/prompt intentionally empty until transcription/review; some names are editor index labels, not printed titles. Draft is not a release catalog. Prepared snapshot requires reviewed cards and category-appropriate text; no prepare/publish/activate endpoint exposed yet.

Gameplay still resolves frozen legacy catalog, not new SQLite drafts. Required next work: reviewed text/pairs/print variants +semantic role binding, immutable publication/activation contract, room-version pinning and FE hydration/server resolution; full new-catalog game/browser/Redis regression before changing default deck. Existing full tests are **not** proof that replacement deck/new rules have been exercised.

Owner preserves timing of selfcare selection, shared reflection selection and ordered sender rotation; exceptions in `../adr/2026-10-12-pdf-catalog-and-rules.md`. New round-count requirement is plan-only in `../adr/2026-10-12-configurable-round-count.md`, not implemented/tested runtime. No Android/iOS/store work begun in this pass.
