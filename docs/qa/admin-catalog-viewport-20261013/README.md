# Admin catalog viewport refinement — 2026-10-13

Frontend release: `8b58e4bf094d63e46f2fb0248fb5705096741319`.

- Admin-only Arial/system sans typography, regular-weight body text, neutral inputs and clearer edges in both approved themes.
- Login contains only authentication UI; theme controls/navigation are authenticated-only.
- Desktop catalog panel uses the available viewport; records scroll independently with sticky table headings and stationary filters/pagination.
- Front-face thumbnails are validated, lazy-loaded references to unchanged card artwork. No new image transformation or database mutation.
- Page sizes: 10, 25, 50, 80; default remains 10. Search and filters reset pagination.
- Card editor separates metadata, content and image URLs into three panels. Paired previews remain visible; the save/back footer stays outside the scrolling content. Switching panels preserves unsaved values.

Validation: FE 751 tests across 78 files passed; lint and production build passed. Production browser QA passed at 320, 390, 1280, 1920 and 3840px, including scrolling 80 records, fixed footer, login-only presentation, detail panels, pending navigation and idempotent retry behavior. Screenshots inspected before release.

Manual frontend-only deployment passed HTTPS health/catalog gates. Backend and Redis container IDs were unchanged. Live read-only admin QA passed in both themes; draft remained 100 cards, revision 4, with PT-014's existing content preserved. No save/snapshot/activation/password commands were issued by that QA. The isolated live browser blocked service workers, so its offline-guidance notification is not a production service-worker failure assertion.

Screenshots and report are in this folder. Local uncommitted native/communication work was excluded from the release. GitHub CI for the newly pushed head is separate from the completed local checks above.
