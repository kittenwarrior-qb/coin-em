# Kawaii default web release — 2026-10-20

Live: https://app.emcoin.cloud/ . Exact runtime source:
`a954292d8d21a45b15902dd62a66d5a0845f0cb2`, pushed to GitHub
`kittenwarrior-qb/coin-em`, branch `codex/native-staging`.

## Deployment

Manual `prepare-ui` / `update-ui`, strict pinned SSH to the approved
103.74.102.24 host, checksummed Docker image built from the committed Git
archive. Only web was recreated; no backend rollout, catalog publication,
database migration, volume removal or editorial-site deployment.

- Current release: `/opt/emcoin/releases/a954292d8d21a45b15902dd62a66d5a0845f0cb2`.
- Previous web: `994936d45b9374ca25dc103c78127a383055a18e`, retained for rollback.
- Backend remains `emcoin/backend:994936d45b9374ca25dc103c78127a383055a18e`;
  container `255b7b7bca805c070069533c74e3b94f431b97b0886d0e24659d41516dfd63f1`,
  started `2026-10-13T13:49:19.930428644Z`, unchanged before/after.
- Redis container `31eb9381a1202d5413dcba5ced8f022af615be2d1764b9e3fe7b153f61f56a0f`,
  started `2026-10-13T03:28:02.300165198Z`, unchanged before/after.
- Empty healthy Redis-backed room gate passed before and after closing web
  ingress. Rollback trap retained; no rooms forcibly closed.
- HTTPS health 200 and active catalog unchanged:
  `catalog-f40519d34526037f0f48983964c8ae27c2f0b3d2b2b35d0508f9c18e28012530`.
- Served HTML references `index-BCGEjw1p.js` / `index-DX5uq7nQ.css`, matching
  the exact image build. Original coin WebP returns `image/webp`.
- Image archive SHA256:
  `cb93c729b939d403b28bf28092ccc6693273e2c37a67ea941e159923d52c60e8`.
- Config archive SHA256:
  `be25dc0169e9abaa027567625caf81f52a2e20af91ed7f638d33921925b87875`.

## Default and retained preferences

New visitors and invalid/blocked preference storage use `candy-clouds` (Mây Kẹo).
Explicit saved Orbit/Workshop preferences remain respected. All three remain
available in the real interface chooser. Legacy startup fallbacks now preload
the real four Kawaii images, not nonexistent Candy variants of Orbit assets.

## Checks

- Frontend suite: 820 tests / 84 files passed after changing the default.
  Follow-up fallback regression plus preference/asset tests: 9 passed / 2 files.
- Exact image production TypeScript/Vite build passed; focused ESLint passed.
- Deployment policy tests: 8 passed. Both paired and UI-only shell update modes:
  16 synthetic cases passed, including occupancy/race, storage/config/checksum
  refusal and HTTPS rollback. These use mocked Docker/curl in network-disabled
  owned containers; they are not live concurrency or timing certification.
- Real deployed browser smoke: 23 checks passed, no HTTP/socket/catalog mocks,
  real service worker enabled. New clean contexts visit the root without a theme
  query at 320x568, 390x844, 844x390 and 1440x900. Home/create steps/join/menu:
  no document overflow, broken images or JavaScript page errors.
- Real published card images decode; interface chooser works; explicitly saved
  Orbit survives reload. Admin login screen visible; no admin writes performed.
- Initial smoke attempts timed out waiting for global `networkidle` on admin;
  the harness now waits for DOM readiness and the actual login control instead.
  Initial local logs retained under `tmp/kawaii-live-smoke*.log`. Blocked-worker
  diagnostic runs were superseded by the final real-worker run in `report.json`.

Prior component/phase/layout verification is in `../kawaii-live-20261020/`.
This release smoke does not certify a new live full multiplayer game, chat backend
activation, physical mobile devices, APK/IPA or store approval. Backend features
pending in newer source are deliberately not activated by this UI-only release.
