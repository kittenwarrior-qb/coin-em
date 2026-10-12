# Public PDF catalog cutover — 2026-10-12

Private-room catalog/runtime proof is documented separately in
`2026-10-12-published-pdf-catalog.md`. This follow-up replaces the public gallery
source as well; it does not inherit GPU/device/remote release acceptance.

## Implementation

- `/api/catalog/active` is a no-store pointer to the active published version,
  or explicitly `web-card-baseline/v1` when rolled back. Unavailable/integrity
  failures return 503, never silently show old cards.
- The shared frontend client fetches the pointer and verifies the immutable
  snapshot hash. Public about teasers, 2D gallery, lobby menu inventory and 3D
  deck-source binding use it; private-room menu still uses its pinned version.
- The 100 logical PDF cards retain approved names, codes and paired front/back
  faces. Three legacy physical Coin display entries are not playing cards.
- Gallery previews support face flip, topmost Escape/Back and focus return.
  Images use contain, inventory loads lazily and names accompany card IDs.

## Verification

- Backend full suite: 662 tests / 61 files passed. Frontend full suite:
  738 tests / 77 files passed, including active-pointer outage/retry, explicit
  rollback, pinned-room isolation, paired emotion faces and 3D source/fallback.
- FE TypeScript, ESLint and Vite build passed (43.94 seconds). After the final
  close-button layer correction, TypeScript and targeted ESLint passed again.
- `e2e/scripts/check-public-catalog.mjs http://127.0.0.1:5173`: final **30/30**
  browser cases passed: two themes at 320x400, 430x932 and 1280x900; gallery,
  two-face preview, about teaser, lobby inventory, unavailable API/retry.
  No horizontal overflow/page errors; preview fits viewport; close hit-test,
  real image decode, Escape/Back/focus assertions passed.
- Snapshot API in this browser matrix is actual Express plus isolated in-memory
  SQLite with explicitly reviewed synthetic fixture. It is not a production DB.
- Settled 320px preview and 430px workshop inventory PNGs visually inspected.
  Reports/screenshots: `docs/qa/public-catalog/`.

## Failure history and correction

Initial close-hit-test matrix failed: the animated preview image overlaid the
absolute close button. Earlier header z-index fix alone did not resolve it.
Diagnostic hit-test identified the image; explicit close-button z-index 3 fixed
all six theme/viewport combinations. Also corrected the QA settings selector
(container click opened join instead) and waited for actual image decode/transition
before capture. Final green is from a new run, not a waived assertion. No real
3D GPU, WebKit, physical device, external CI or public deployment certified here.

## Independent Docker context correction

Linux frontend image initially failed typecheck because three tests imported
backend PDF source outside its build context. Replaced imports with a detached
frontend-only canonical JSON fixture, with an exact backend-source parity test;
did not exclude tests from compilation or weaken assertions. Affected FE11 tests
and deployment/parity4 tests pass; BE typecheck and targeted FE lint pass.
Subsequent Linux backend and embedded-Caddy web builds both pass. These are
local images and do not establish remote deployment, TLS or registry release.
