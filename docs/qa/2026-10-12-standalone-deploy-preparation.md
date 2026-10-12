# Standalone deployment preparation — 2026-10-12

Authorized new host: 180.93.54.160. Owner authorizes removing old Mendez Brothers
source/data/Docker workloads after exact read-only inventory; keep Docker engine.
No remote inventory, cleanup, upload or deploy succeeded. No secrets recorded.

## Local executed evidence

- Compose renders with provided non-secret validation placeholders and refuses
  absent domain/hash. Placeholder hash is not a valid app credential or runtime
  admin provisioning. Caddy adapt/validate passes; no certificate requested.
- Backend662 and frontend738 full regular tests passed before the new configuration
  fixture tests. New deployment/parity4 tests and affected FE11 tests pass separately.
- Actual isolated published-catalog HTTP/SQLite + Chromium matrix30/30 passes;
  see `2026-10-12-public-pdf-catalog.md` for failures/corrections/limitations.
- First Linux web build failed cross-package test imports; detached frontend fixture
  plus exact backend parity fixed it. Subsequent backend/web Linux builds pass.
- Local backend image ID:
  `sha256:03528d10a752c1e8b3bad337138f7b4de712bd56b51ec8a990dd1270d04126a5`.
- Local web image ID:
  `sha256:1e3bad929955f886c03b297ff62701a96702e6e978de2b7cdd872723b7e158e2`.
  These are local Docker artifact IDs, not published registry/reviewed release IDs.
- Network-disabled ephemeral image checks pass: backend Node v22.23.3 supports
  SQLite and has no local `.env`/catalog DB; web contains index/PWA files and all
  145 PDF WebP faces. Ephemeral containers removed automatically; images retained.

## Remote / external boundary

Paramiko hidden password input verified complete length; password auth rejected
twice. Independent OpenSSH password attempt returns `Permission denied
(publickey,password)`. No further password retry. Known host key already exists
locally and strict OpenSSH checking is retained. No unknown host key replacement.
Local DNS: app.emcoin.cloud NXDOMAIN, apex emcoin.cloud A216.198.79.1.
Domain spelling/ownership, DNS/TLS, separate admin password provisioning, exact
old-resource inventory, approved cleanup and public gameplay smoke remain needed.
No root/shared-directory delete, Docker prune/engine uninstall, room backup,
Redis flush, DNS change, external CI bypass or store publication performed.

Runbook: `deploy/emcoin/README.md`. Native/store, physical-device, independent
review, remote capacity and compatible rollback are not certified by these checks.
