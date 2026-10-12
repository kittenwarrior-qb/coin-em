# R37 release evidence and compatible rollback

## Current owner-authorized target — 2026-10-12

**Latest correction:** actual target is103.74.102.24, not180.93.54.160. Read-only
SSH inventory succeeded; source `/opt/mendez`,3Mendezcontainers/5labelled volumes,
Ubuntu18.04/kernel4.15,3GB RAM/20GB disk. DNS app.emcoin.cloud now resolves correctly.
Owner chooses fresh Ubuntu24.04 through provider console; no reinstall/cleanup
or deploy performed. Git credential kittenwarrior-qb has repo ADMIN; the gh CLI
global READ identity was unrelated. New workflow/runtime script are local source,
not an executed GitHub release. First install only: existing backend blocks auto
update pending a tested admission-freeze/drain path (zero-room check alone races
new room creation). Wrong-host rejection evidence below is historical.

Owner now authorizes deploying EmCoin to 180.93.54.160 and removing the old
Mendez Brothers source/data/Docker workloads after exact read-only inventory.
This supersedes historical lack-of-authority statements below for this target,
not the technical acceptance gates. Docker engine is retained. New isolated
configuration/runbook: `deploy/emcoin/README.md`; shared root Caddyfile untouched.
SSH authentication rejected with both Paramiko and OpenSSH, so no inventory,
cleanup/upload/deployment was performed. Domain is tentatively app.emcoin.cloud
(spelling to confirm); local DNS returned NXDOMAIN. Do not publish credentials.

Public PDF gallery/menu/teasers now use the active immutable catalog, while room
catalogs stay pinned. Latest full suites: BE662/FE738; 30 public browser matrix
cases pass. New standalone configuration/parity tests pass4/4 separately, not a
claimed fresh full-suite total. Final Linux packaging evidence follows separately.
Actual remote TLS/admin/activation/gameplay/capacity/rollback smoke remains required.

Local preparation only, last reconciled 2026-10-10. Current decision: **NO-GO for release**.
This document does not authorize a workflow, SSH, tag, deploy, store submission,
shared-service reload or data operation. Do not paste credentials into evidence.

## Established local evidence

### Latest source boundary — 2026-10-10

- Backend source has602passing regular tests. Latest frontend post-texture
  closed-renderer guard has625passing tests, lint/TypeScript/Vite build36.75s
  PASS. This guard prevents dead-generation sticker construction; it does not
  abort the Three texture transport or change artwork.
- Actual current model/sticker browser pair SbnekD/DWZrfG passes100switches each,
  cached revisits and real WebGL context restore,60.47s combined; restored PNGs
  inspected. Desktop Chromium147/AMD D3D11 at simulated390px, not physical-device
  or mobile performance acceptance. Current all11short cases additionally PASS
  437.09s, exact report r29-late-sticker-eleven-short-matrix.json; no inherited pass.
- Immediately preceding623-test frontend source passes clean dHBP1C9commands,
 990byte-identical admitted files and Linux2O3jGA production builds/static outputs.
  Both owned QA tags removed, contexts/reports retained. These are pre-guard
  source proofs, not final625-source clean/Linux/CI/release artifacts.
- Fresh BE/FE/e2e copied-manifest npm audit Oct10 reports0vulnerabilities; three
  locks unchanged. Registry metadata is not a security certification.
- Final real Redis/AOF/Caddy fixed60minute vgiaBk soak (Oct9) passes3679225ms,
  31batches/3110rounds including gate/3110receipt replays/0unexpectedACKs. All311
  terminal synthetic rooms and6owned resources removed. Backend remains the
  same tested source; no production capacity/SLO/host-loss proof inferred.
- Strict573image/original aggregate hash/200protected faces/80manifest checks
  still PASS/runtimeReskins0. R40 now has ONE preview-only green pill produced
  after owner notification, no runtime integration or sample approval yet.
  No image publishing, native signing or deployment.

### Historical Oct4 boundary (not current-source acceptance)

- Pinned Node22.23.3/npm10.9.9; current backend lock SHA256
  `13a42b0094237c9f975483493dc44928dd46e8b6fde3dbec6837bf6fd09e9686`,
  frontend `502efccb0017e1322dd9e7ed4f39d91f0e18b9a3d7971a9688f3e4876c57b144`,
  e2e `c4f82dd111b44c471e337351034b5f308be801a6ba15adb6aa606dc80ab8ada6`.
- Local copied clean RuBoCK passed nine install/lint/build/test commands including
  R30 helpers, final public copy/wire redaction and disabled backup guard.
  976non-generated copied files match current source; this is not remote CI.
- Copied current BE557/FE570 regular tests pass. Browser evidence must be recorded
  separately for the exact served source, not inherited from preceding counts.
- Dedicated R28 real Redis fixtures establish the documented CAS/outage/AOF
  restart/session/deletion-marker/admin-receipt boundaries, not host-loss recovery.
- R30 dfb321: one full10seat game then ten concurrent full10seat games pass
  actual Redis/Caddy/real-clock/enabled-limiter checks.110rounds total, exact
  receipt replay and authenticated terminal convergence. The concurrent stage
  lasted96.400seconds, NOT a60minute soak or production capacity/SLO certificate.
- QA backend image IDs are identified in their reports but their owned tags
  have been removed. They are **not** published immutable release artifacts.
- Current RuBoCK snapshot Linux packaging dWOOCx passes both production Docker
  builds, actual pinned backend Node/compiled entry and frontend static PWA outputs.
  Owned image tags were removed; no application server or deployment was run.
- Original573image aggregate hash remains
  `7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8`;
  200protected card faces unchanged. R40 production/approval has not started.

## Source pipeline limitations

Current deploy.yml selects a successful same-repository main push CI SHA,
serializes the job and names the production environment. Required environment
reviewers/branch protection are not verified or configured by local code.
It still builds on the host, recreates backend/frontend, checks backend health
and a frontend file. It does not implement immutable registry promotion,
approved admission/drain, public browser smoke or compatible rollback rehearsal.
Do not treat those existing checks as complete R37 acceptance.

Frontend source composition copies into a shared static volume; failure during
replacement can affect serving. Do not run it as an assumed atomic deployment.
Redis/Caddy and other shared applications must not be recreated or reloaded
without explicit operator scope. No production host has been inspected here.

## Required release record

The authorized owner/operator must approve and record all of the following
before any promotion; unset, unverified, failed or mismatched means NO-GO:

1. A clean reviewed release commit, exact lock/runtime hashes, successful CI for
   that commit, and backend/frontend artifact digests verified in the chosen
   registry. Local dirty source and QA image IDs cannot substitute.
2. Authorized staging/production identity and service boundaries, access through
   owner-controlled secrets, required environment protection, and a maintenance
   window. Owner accepts downtime but has not approved an actual release.
3. Rules `web-16-coin60/v1`, catalog `web-card-baseline/v1`, persisted room/receipt/
   deletion-marker/session schema compatibility for both candidate and fallback;
   no stale schema that can erase a committed Coin transfer or revive a room.
4. Exact-source browser/game/Redis evidence, measured capacity and the required
   soak, staging public smoke and explicit failure/abort rehearsal. Readiness
   checks required primary storage; a nonempty index is not gameplay smoke.
5. Audience6–18/Vietnam privacy/operator review, support emcoincloud@gmail.com,
   permission and native/store/device gates where applicable, verified brand/
   non-card asset rights, and owner-approved final non-card art sample/version.
6. A named operator for cutover, observation, incident response and an explicitly
   approved compatible fallback/forward-fix decision. No default secret or
   password provisioning belongs in source or this report.

## Data and rollback constraints

Owner explicitly disables new deleted-room content archives and external VPS
backups. Expire rooms after one hour of inactivity; heartbeat is not activity.
Seven-day minimal content-free anti-resurrection markers are not room backups.
Do not revive the obsolete backup/Umami procedures found in historical docs.
Do not delete existing archives, volumes or analytics databases during cutover.

Before recreation, a failed build/verification aborts without changing running
services. After a failed cutover, the operator first establishes the actual
current primary state, health, artifact identity and schema compatibility.
Prefer a reviewed forward fix when reverting binaries cannot preserve newer
room/session/receipt semantics. A compatible binary/static-art rollback never
restores old room snapshots, flushes Redis, removes deletion markers, rolls back
Coin history or deletes volumes. Never auto-restore legacy JSON into an empty
required primary. Record the failed attempt and subsequent decision separately.

No staging cutover, operator authorization, immutable promotion or production
rollback has been rehearsed by this document. Implementation-owned checks are
self-review, not independent audit or legal/store acceptance.
