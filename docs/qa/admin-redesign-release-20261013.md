# Owner-edited admin release — 2026-10-13

Deployed manually to https://app.emcoin.cloud/admin from exact GitHub source
`994936d45b9374ca25dc103c78127a383055a18e` (PR #96). Both backend and web containers
use this revision; production symlink resolves to the same release. Native and
communication changes remain outside this release.

## Checks

- Isolated release: 687 backend tests (66 files), TypeScript build; 751 frontend
  tests (78 files), lint and production build passed. Docker artifacts built from
  the exact committed archive, not the dirty primary workspace.
- The admin browser fixture passed on the primary workspace before isolation.
  The isolated unit/build counts above do not claim native tests.
- Maintenance driver mock cases passed: success, occupied room, admission race,
  checksum/config mismatch, backend failure, catalog/Redis changes, HTTPS failure
  and refusing rollback across an admitted room.
- SSH pinned host verification and SHA256 checksums passed. Large-file transfers
  initially reset; bounded chunks were reassembled and the complete archive was
  verified before any service was stopped.
- Empty healthy Redis-backed room gate checked before and after closing web
  ingress. Redis container identity and backend data volume retained.
- Authenticated draft digest before/after matched:
  `8df945c5349efb1976ee6eeeb1bcabc1215fc523e521bfd8ddbafa562d9361c4`.
  Draft revision 4, 100 cards; active catalog version also unchanged.
- Live Chromium 1920x1080: login-only view, both theme tables, internal table
  scrolling with stationary pagination, search PT-014, all three editor tabs,
  successful decoding of both card images, grid, analytics, data, account and
  overview checked. No page errors. No card save/publish/password mutation ran.
- Authenticated traffic and system APIs returned successfully; traffic is a new
  database with no imported historical traffic. No fake traffic was inserted.
- QA authenticated and logged out; owner may need to log in again. Secrets were
  neither committed nor included in release artifacts.

Screenshots and the read-only browser report are in the primary workspace at
`docs/qa/admin-redesign-20261013/`; they are not a physical-device or native/store
certification. Chat/voice/APK/IPA were not shipped by this release.
