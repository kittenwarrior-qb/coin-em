# Initial manual EmCoin deployment — 2026-10-13

Owner explicitly replaces CI/CD deployment with manual SSH, retaining GitHub
source and CI checks. Deploy workflow state verified `disabled_manually`.

## Actual deployed identity and infrastructure

- Host103.74.102.24, owner-reinstalled Ubuntu24.04, kernel6.8.0-146-generic;
  strict pinned SSH key, UFW22/80/443 only. No mutation on wrong host180.93.54.160.
- GitHub merged source release0f9ecfe6cdd176fb6ee7e822b80e142fcc343c98.
  Backend/frontend runtime source unchanged relative to previously tested
  aec562a9c40e8f2a055d0b8ffba18ed3a23f7cc7 (Git diff empty for be/src and fe/src).
- Exact Git-archived local image builds; both image revision labels checked.
  HTTPS public health/catalog verified without ignoring certificate errors.
- `/opt/emcoin/current` points to this exact release. Redis and backend healthy;
  Caddy serves80/443 only; backend3001/Redis6379 remain private container ports.
- Host-only `.env` permission600, admin scrypt hash only. Password is stored
  locally with Windows DPAPI, never in GitHub, docs or output.
- Images archive SHA256
  faee46cefae1345c8adadc9180704537f0752cf23f737eba1b69166a06130860;
  config archive810a0a31488cf798d47393fc74a88fb443c3b5785837c85a6f26e51ef5d106a3.
- Canonical active catalog
  catalog-f40519d34526037f0f48983964c8ae27c2f0b3d2b2b35d0508f9c18e28012530,
 100cards; explicit first publication before admitting backend connections.
- One low-load observation: web51.68MiB, backend27.7MiB, Redis13.95MiB;
 14GiB free disk. This is not a capacity/load/SLO certification.

## Tests and operational corrections

- Local backend669/669 before new manual guards, frontend739/739; backend type
  check, frontend lint and asset manifest pass. Seven deployment guards pass
  after updates, including actual Git archive regression under core.autocrlf=true.
- Three real browser lifecycle tests pass: full-motion100role-card switches,
  actual WebGL context loss/restoration, unsupported WebGL and missing texture.
- Main CI38260199796 failed twice: SwiftShader reached98/100switches before170s
  watchdog. Retain failures. Bounded Linux290/300deadline preserves all checks;
  Windows170/180unchanged. Do not claim that failed CI passed.
- First archive8ae0948 checksum matched, but Windows Git converted shell toCRLF;
  Bash stopped before mutation. Explicit shellLF Git attributes and archive guard
  fix this; failed incoming artifact retained.
- Release0f9ecfe correctly published catalog, but child stdin consumed the rest
  of piped bash script. Verified zero containers/no current pointer, exact archive,
  config/image/catalog identity, then resumed service startup without reseeding.
  PR89 executes verified shell file and closes initializer stdin. No volumes or
  catalog/room data deleted as a deployment workaround.

## Live HTTPS owned-room smoke

Evidence under `docs/qa/deployed-web-20261013/` (local screenshots retained):

- Admin login succeeds; draft catalog100cards visible/editing interface accessible.
  Dashboard shows operational HTTP aggregates, not unique visitor analytics.
- Active pointer no-store; published catalog hash/count verified; original avatar,
  lock icon and PDF page145 image endpoints respond with actual image content.
- Public paired emotion card CX-017 has expected reverse face page084.
  Production home intentionally uses default emotion-orbit; query theme previews
  do not switch the production home, so duplicate home shots are not evidence of
  two live gameplay themes or a working user-facing switcher.
- Five owned independent real guest browser contexts; save chosen round limit1
  through actual UI, start, visit15phases, select published emotion card, send
  red/green/yellow gifts (one each), receive real acknowledgements/previews.
- Reload narrator at coin checkpoint, then reach ended state after chosen1round;
  mobile cold reload still ended. Terminal receipt total exactly1for each color,
  five summary rows; no page errors; only owned QA room closed through admin.
- First smoke forgot UI “Lưu số lượt”; start stayed disabled as designed. Failed
  report retained, then corrected the operator sequence; runtime gate not weakened.

## Remaining boundaries

This verifies an initial web release/owned-room smoke, not all41tasks, broad user
load, physical Android/iOS devices, voice chat or store publication. No App Store,
TestFlight or Google Play approval claimed. No room archives, VPS backup or Umami
enabled. A low-contrast admin logout control observed in screenshot needs a UI
follow-up; login/catalog/operational dashboard work. Future app updates must use
compatible admission freeze/drain and preserve volumes, never down-v/prune/restore.
