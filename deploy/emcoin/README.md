# Standalone EmCoin deployment

This is the new, isolated three-service layout. It does not modify the root
shared Caddyfile or remove any other project's containers. The web image embeds
the built frontend; there is no mutable shared static-copy volume. Images remain
static WebP files, and SQLite stores card metadata, not image blobs. Redis stores
room state. No Umami service, deleted-room archive or external backup is enabled.

## Operator prerequisites

1. Working SSH access to the authorized host; inventory source paths, Compose
   projects, containers, mounts/volumes, ports and native services read-only first.
   Never print `.env` or Docker environment values. Owner authorized removing
   old Mendez Brothers source/data/workloads, not wiping a host root directory.
   Resolve exact paths and ownership before cleanup. Retain Docker engine.
2. Confirm `app.emcoin.cloud` spelling/ownership; add DNS A record pointing to
   `103.74.102.24`. Do not keep an AAAA record pointing elsewhere. Open 80/TCP,
   443/TCP and optionally 443/UDP. Do not expose Redis/backend ports publicly.
3. Place the reviewed source in a new release directory, outside old source
   cleanup targets. Record source/lock hashes and built image IDs. Do not infer
   remote CI success from local tests or silently reset a dirty checkout.
4. Copy `.env.example` to `.env` on the host, permissions 600. Provision a
   **separate EmCoin admin password**, at least 15 characters, with the existing
   `hashAdminPassword` utility (`be/src/admin/AdminAuth.ts`). Store its scrypt hash
   as a single-quoted value so Compose does not interpolate the `$` characters.
   Never reuse the SSH/Gmail password. Admin email: emcoincloud@gmail.com.

## Build and start after prerequisites pass

### Current operator path — manual deployment, 2026-10-13

Owner requests manual deployment; GitHub Deploy workflow is disabled, while CI
checks remain enabled. Source remains managed through GitHub PRs. For a **fresh
initial install only**, after local tests/builds/browser checks and prerequisite
verification, invoke these from the repository root (use the configured Node22):

```powershell
$emcoinReleaseSha = git rev-parse HEAD
node deploy/emcoin/manual-release.mjs prepare $emcoinReleaseSha
node deploy/emcoin/manual-release.mjs deploy $emcoinReleaseSha
```

The packager archives exact committed source rather than the dirty working tree,
builds images locally, labels them with the SHA, compresses and hashes artifacts,
then transfers through pinned SSH to103.74.102.24. It never includes local ignored
credentials or rebuilds on the VPS. Shell LF attributes prevent Windows Git
archive conversion; execute a verified extracted script file, not piped `bash -s`
whose stdin could be consumed by a child. Initializer stdin is closed explicitly.
Process exit0 alone is insufficient: inspect all three services, HTTPS, active
catalog and run the owned-room browser smoke before claiming success.

The initial backend release is `0f9ecfe6cdd176fb6ee7e822b80e142fcc343c98`.
The guarded web update to `f58348233d589e6d941a5b818b1d01dba549fdc6` is now
serving HTTPS, with `/opt/emcoin/current` pointing to that web release and its
`images.env` retaining the original backend image. Initial installation
publishes the canonical100-card PDF catalog before backend admission. Later
operator-script fixes do not silently change the running application's image SHA.
This script still **refuses existing backends**: subsequent manual updates need
an explicit compatible admission-freeze/drain/maintenance procedure. Never rerun
fresh publication on an already initialized database, or delete volumes to retry.

### Guarded frontend-only update

For an explicitly UI-only release while newer backend source is pending, use
`prepare-ui <commit>` followed by `update-ui <commit>` instead. This builds and
transfers **only** the exact committed web image. The driver retains the actual
running backend image in Compose, does not rebuild or restart backend/Redis,
and keeps the same configuration, empty-room, admission barrier, HTTPS and
rollback guards below. Unrelated dirty files outside `fe` and `deploy/emcoin`
are not included in this UI artifact. No backend features are activated by it.

After local tests/QA and GitHub merge, prepare the exact commit as above, then:

```powershell
node deploy/emcoin/manual-release.mjs update-web $emcoinReleaseSha
```

This is a bounded maintenance update, not zero downtime. It refuses any changed
backend filesystem/execution configuration, runtime Compose/Caddy configuration,
unready Redis/backend, or rooms present. It stops only web ingress, rechecks rooms
behind that barrier (a racing room causes restoration), and starts only the new
web image. Backend/Redis/catalog/room volumes are never recreated or reseeded.
HTTPS failure restores the previous web; pointer promotion happens only after
health/catalog HTTPS checks. Exact backend/web image identities are recorded in
the release's `images.env`. Backend changes still require a separate tested
compatible migration/drain path; they are not silently admitted by update-web.

The direct Compose build instructions below are an earlier alternative, **not**
the current immutable transfer path.

From this directory, using the host-only `.env`:

```sh
docker compose config --quiet
docker compose build backend web
docker compose up -d
docker compose ps
```

The Compose project name is `emcoin`. The configuration refuses to render if
domain or admin hash is missing. Changing domains requires rebuilding web because
the API origin is a frontend build argument. Certificate issuance requires correct
public DNS and reachable ports; do not claim HTTPS readiness before checking it.

## Required smoke before admitting users

- HTTPS certificate valid for the approved hostname; `/health` returns 200 with
  required Redis ready. Stop admission if Redis is unavailable, not JSON fallback.
- Admin login works using its own password; unauthorized overview/catalog writes
  are denied. Only operational aggregate analytics are present, not visitor history.
- Review the 100-card PDF draft in admin. Prepare a snapshot, then explicitly
  activate it. Fresh startup seeds/reviews canonical matching source but does **not**
  automatically activate it. Check `/api/catalog/active`, immutable snapshot hash,
  public two-sided gallery and a newly created room's pinned `catalogVersion`.
- Two real browser clients create/join/start a room and reconnect through Caddy;
  verify Coin receipt replay, chosen round limit, terminal summary and mobile layout.
  Repeat the owned 5/10-player full-game fixture in an approved isolated staging
  namespace; do not stress-test other users' rooms or flush shared Redis.
- Record image IDs, server limits, smoke evidence and a compatible fallback release.
  Existing local tests do not certify physical devices, store release or host capacity.

## Update / rollback

Build before replacing running services. Record previous backend/web image IDs and
keep compatible artifacts. Recreate only backend/web after an approved maintenance
window. Do not use `down -v`, Docker prune or database restore as an app rollback.
Keep Redis, SQLite and current room/session/receipt state. Existing rooms retain
their catalog version; changing active catalog affects only new rooms/public gallery.
Owner opted out of room/VPS backups, so no host-loss recovery guarantee is made.

## Historical boundary — 2026-10-12 (superseded by manual deployment above)

Owner corrected host to **103.74.102.24**. Read-only access/inventory succeeds;
DNS now points to this IP. Wrong host180.93.54.160 had no mutation. Correct host
contains only old Mendez stack3containers/5volumes, source `/opt/mendez`, on
Ubuntu18.04. Owner chooses **fresh Ubuntu24.04 LTS via provider console** before
deploying. No host reinstall, cleanup or EmCoin deploy performed yet.

Git's kittenwarrior-qb credential has ADMIN on the existing repo. This is different
from global gh CLI's READ account; do not change global identity or print tokens.
Deploy workflow now builds labelled images on the runner from exact successful
main-push CI, checksums/transfers them with pinned SSH and runs `runtime.yml`
without a host build. On the new host prepare `/opt/emcoin/shared/.env` (600),
pre-pull redis:7-alpine, set up verified SSH and create `.deploy-ready` **only after**
operator prerequisites are satisfied. Configure production environment approval
and GitHub Secrets VPS_HOST/VPS_USER/SSH_KEY/VPS_KNOWN_HOSTS. Do not install old
host keys after reinstall. Script refuses non24.04, missing approval/secrets,
bad checksums/image labels or any existing backend deployment. Checking zero rooms
alone races new admission, so automated upgrades are refused until a tested
admission-freeze/drain path exists. This script currently supports first install.
Process/HTTPS checks are not full
gameplay acceptance. No auto data rollback or old-service cleanup in Actions.

### Historical wrong-host attempt (superseded)

Remote password authentication rejected with both Paramiko and OpenSSH. No remote
inventory, old-source cleanup, workload removal, upload, DNS change or deploy has
occurred. `app.emcoin.cloud` returned NXDOMAIN locally; apex `emcoin.cloud` points
to another IP. Access and domain/DNS are still required. Do not store SSH secrets
in this directory or reports. See `.ai/tasks/R37-release-and-rollback.md`.
