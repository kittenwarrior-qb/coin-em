# Catalog preparation and source-text import

Scope: local implementation only. No production deployment, active-deck replacement or store submission.

## Changes

- Transcribed PDF pages 19–50 (32 situation prompts), 116–129 (14 reflection prompts), and 131–145 (15 selfcare instructions). Source wording retained, including awkward grammar; generic situation/reflection names remain editor labels, not purported printed titles.
- Existing SQLite drafts receive only missing text on unreviewed, non-archived cards with matching source pages/category/both image URLs. Existing admin edits, reviewed cards, identity and saved snapshots remain unchanged. The import is transactional/idempotent and advances draft revision once only when something changes.
- Protected admin readiness endpoint reports missing review/content and missing categories. Protected snapshot endpoint creates an immutable content-hash version only after those checks pass. It does not activate a version or modify rooms.
- Editor reports remaining work and enables preparation only for a complete reviewed draft. Unknown outcomes lock editing/navigation and retry the same request ID/revision. A confirmed preparation followed by failed refresh is not resent.
- Snapshot reads revalidate stored card payloads. Stored versions survive database reopen; returned copies cannot mutate SQLite.

## Verification

- Backend full suite: 651 tests / 59 files passed (including source backfill, preparation/restart/idempotency and actual authenticated loopback HTTP tests).
- Frontend full suite: 725 tests / 74 files passed, including three added preparation UI cases.
- Targeted frontend ESLint and backend/frontend TypeScript checks passed.
- Frontend production build passed. SQLite currently uses the Node22 experimental built-in API; this warning remains a toolchain consideration, not an externally deployed database certification.
- Browser catalog editor: 24 cases passed, two themes × three viewports × four states. These intercept synthetic admin API responses; they validate frontend layout/interaction, not production authentication or database durability.

## Not yet release-ready

The 39 role/emotion cards still need full textual metadata, including both definitions on combined emotion faces; all 100 cards remain unreviewed. Preparing a version is not publishing one. Active-version/rollback, room-version pinning, public snapshot hydration and new-catalog full gameplay tests are still required before replacing the legacy deck. No new PDF rule differences beyond prior owner approvals have been implemented.
