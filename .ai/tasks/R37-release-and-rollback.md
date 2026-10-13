# R37 Release và rollback

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R02, R11, R28, R29, R35

## Goal

SHA/digest images, staging, compatible drain, smoke and rollback runbook.

## Current evidence

Build-at-VPS and no immutable/smoke/restore gate risk interrupting rooms or corrupting compatibility.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R37)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R02, R11, R28, R29, R35.
- .github/workflows/ci.yml; .github/workflows/deploy.yml; be/Dockerfile.prod; fe/Dockerfile.prod; docker-compose.prod.yml; Makefile; Caddyfile

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`tested digest → staging/smoke → drain/compatible deploy → monitor → safe rollback without old snapshot restore`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R37.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by OQ-06/OQ-10 for release authority, RPO/RTO and host ownership.

## Implementation plan

### CI environment revision 2026-10-13 — role-card deadline evidence

Main CI38260199796 attempt2 passes test/lint/full-game terminal and10/11 browser cases. Retain both failed attempts. Downloaded role-card report identifies actual SwiftShader, stage100-role-card-switches,98completed switches before the170s watchdog; there is no assertion/network/context-restore failure observed before termination. Admit the same bounded Linux290s watchdog/300s outer budget used for models/stickers, keeping Windows170/180 unchanged. Preserve full-motion1280x900, all100switches, real catalog API, offline CDN restrictions, loading/fallback assertions, actual context loss/restoration and screenshots. No force clicks, skipped cases, renderer/theme/rule changes or physical-device/FPS acceptance claims. Validate exact changed source locally and through new PR/main CI before deployment; no further unchanged-source retry fishing.

### Follow-up 2026-10-12 — observed CI/runtime boundaries

Downloaded failed Linux artifacts show SwiftShader: models17/100 switches, stickers100 then timeout during cached revisits. Longer deadline alone is not a product fix. Admit renderer reduced-motion path plus unit tests: no decorative wobble/slide/intro and no repeated idle GPU draws under OS reduced-motion preference; redraw real selection/textures/flip/resize/context restore, preserve geometry/materials/palette/default full-motion path and explicit auto-rotate. Asset QA records reducedMotion:true and retains all120 switches/request/restore assertions. frontend-design skill used to preserve owner-approved theme direction, no new anchor/palette/reskin.

PWA source-copy build passes optimizer, but adding Express catalog routing earlier made the old second HTTP request listener race Express's404. Attach static middleware to the owned Express app after API routes instead; two PWA cases now pass locally. PDF5 terminal test failed an immediate journal check because retry button vanishes on entering pending, before ACK: poll the same persisted-journal-clear invariant, preserving exact same request/receipt/ledger conditions. Existing synchronous client journal clear stays unchanged. Retain original failed CI evidence; no failed cases removed or runtime Coin logic weakened.

### CI environment revision 2026-10-12

Exact c382861 CI passes BE669/FE738/lint/build/assets but short matrix fails4/11: PWA optimizer rejects arbitrary external output and two model/sticker cases hit170s watchdog on hosted Linux. Keep those failed runs. PWA now builds an owned frontend source copy with linked dependencies and its own root/dist, then copies only built artifacts; optimizer/source guards unchanged, no .env copied/shared checkout build overwritten. Source-copy recursive cleanup verifies allocated temp prefix/parent. Model/sticker functional tests retain100switches+20cached+actual requests/context restore; Linux-only bounded290s watchdog/300s outer budget reflects runner graphics, Windows170/180 unchanged. This is not an improved product latency/FPS or device acceptance claim; do not remove cases, force clicks, omit failed modes or change runtime art/renderer to fabricate green. Admit these adjacent fixtures/guard tests only.

### Plan revision 2026-10-12 — fresh host bootstrap / before-admission publication

Owner completed Ubuntu24.04 reinstall, confirmed another legitimate host-key change and installed the local EmCoin public key. Matching explicitly accepted RSA fingerprint pinned; root key login succeeds. Fresh host contains no Mendez/source/Docker; no agent deletion required. Admit bootstrap-ubuntu.sh for official Docker apt repo/security package installation/firewall/new EmCoin directories, no old-resource wipe. Owner approves strong generated separate admin credential, encrypted with Windows DPAPI; host gets hash only. GitHub secrets use existing authorized key without printing it. Initial release must publish canonical PDF catalog **before** backend/web admission via explicit empty-store-only initializer; never auto-approve existing edited data. Add tests for fresh100-card publication/no-overwrite and release order. CI failures from omitted ignored deploy/artwork files are corrected by root-only `/EMCOIN/` exclusion and complete runtime asset staging, not weakened checks.

### Plan revision 2026-10-12 — corrected host / GitHub / fresh OS

Owner corrects target to103.74.102.24; wrong host180.93.54.160 had no mutation. Correct-host read-only inventory: Ubuntu18.04/kernel4.15, Docker24.0.2/Compose2.18.1,3GB RAM/20GB disk, only Mendez3containers/5labelled volumes and `/opt/mendez` source. DNS app.emcoin.cloud now resolves to103.74.102.24. Owner approves fresh Ubuntu24.04 via provider console, not a risky in-place multi-hop upgrade. Provider-console execution still requires user action/access; no remote wipe performed.

Owner requires GitHub management. Git Credential Manager's kittenwarrior-qb has repo ADMIN; global gh CLI's different account has READ. Use correct existing credential only in process, never print tokens/change global login. Admit release workflow/runtime deploy scripts/adjacent tests: exact successful main-push CI, runner-built labelled images, checksums/strict SSH, separate host admin settings, supported OS/operator readiness/drain gate. Prepare PR/CI rather than push directly to main or waive failures. Deployment/SSH secrets wait for trusted new host key and fresh-host bootstrap; no cleanup or deploy yet.

### Plan revision 2026-10-12 — owner-authorized new VPS deployment

Owner explicitly authorizes deployment on 180.93.54.160 and removal of old Mendez Brothers source/data/Docker workloads after moving those elsewhere. This supersedes the historical no-deployment scope for this target only. Keep the Docker engine for EmCoin. Resolve container IDs, volumes, bind mounts, source paths and ownership read-only before any deletion; never delete a broad host directory or unverified unrelated services. No remote inventory or mutation has succeeded: password authentication was rejected. Do not reuse the SSH credential for app login or persist it in evidence/source.

Admit `deploy/emcoin/*`, backend Docker context exclusion and adjacent configuration tests/runbook. Prepare a three-service standalone stack (Redis, backend+SQLite metadata, Caddy with built-in immutable frontend files), no shared frontend-copy volume, no Umami, no room backups. Domain proposed by owner is app.emcoin.cloud (owner typed `.clou`; spelling needs confirmation), and DNS/TLS/public smoke remain unverified. Existing shared Caddyfile/other project routes and workflows are not changed. Retain exact local/browser/Linux build evidence separately from external CI, independent review and production acceptance. Activation of the PDF catalog must be explicit before opening admission; verify new room version and admin access on staging.

### Plan revision 2026-10-04 — source-only release evidence/no-go runbook

Admit `docs/ops/r37-release-and-rollback.md` only for consolidating actual current source/evidence, owner superseding no-backup/Umami/admin decisions, explicit release no-go and compatible forward-fix boundaries. No workflow trigger/host/service/registry/image publishing/drain authority change; do not turn QA image IDs into distributable digests or copied-clean local checks into executed CI/staging. Trace outstanding implementation and operator gates rather than fabricate a completed rehearsal. Existing production workflow/environment protection is source evidence only, not verified remotely. Update this brief/index, leaving actual release unperformed.

1. Combine R02 guardrails, R11 migration, R28 real persistence, R29 browser and R35 monitoring evidence into one release evidence checklist.
2. Wait for OQ-06/OQ-10 release authority, RPO/RTO and host ownership; document no-go conditions rather than inventing a drain policy.
3. Build immutable tagged/digested artifacts, run migration dry-run and staging smoke against a compatible data fixture before any deployment.
4. Define drain/compatibility window, health gates, monitoring watch and forward-fix/targeted-revert rollback that never restores old room snapshots over new data.
5. Rehearse the procedure only in approved staging, including failed smoke, abort, compatible rollback and evidence capture.
6. No production deploy/tag/rollback is authorized by this task plan; promote only with owner approval and all dependency reports.

## Implementation report

2026-10-12 — Prepared standalone `deploy/emcoin` stack/runbook with embedded web assets, required domain/admin hash, private Redis/backend, SQLite metadata volume, bounded Docker logs and no Umami. Docker contexts now exclude all `.env.*` and backend runtime data. Initial Linux web build failed because three frontend tests imported backend TypeScript outside the FE context; replaced those imports with a detached JSON fixture plus exact backend canonical parity test (no test exclusion). Four deployment/parity tests and eleven affected FE tests pass; Linux backend/web builds subsequently pass. These are local image artifacts, not remote CI, registry promotion, VPS smoke or completed deployment. SSH rejected twice with Paramiko and once with OpenSSH; no further retries, remote mutation or cleanup. Domain/DNS/access and separate app admin provisioning remain needed.

2026-10-10 source-only runbook reconciliation: latest regular625FE/602BE, actual100model/sticker browser pair and fixed60minute real-storage soak are explicitly distinguished from older623-source clean/Linux and Oct4 snapshots. Old evidence retained with historical heading, not inherited across the late sticker guard. No-go remains on actual operator/legal/rights/device/signing/CI/staging/immutable promotion/cutover/rollback gates. No workflow/image publish/service/deploy/host/data action performed.

2026-10-04 — Added source-only release evidence/rollback checklist at docs/ops/r37-release-and-rollback.md. Records current tested local locks, real Redis/Caddy short-load scope and existing workflow limitations; distinguishes removed QA image IDs from immutable deploy artifacts. Explicitly NO-GO on dirty/unreleased source, unverified remote CI/environment protection/staging/deployment authority, schema/session compatibility, privacy/native/store/device and final-art gates. Owner superseding no-new-backup/Umami decisions retained; no old-room restore, Redis/JSON resurrection, volume deletion, automatic rollback or shared Caddy/host mutation. No image publishing, tag, workflow run, SSH/deploy, user service or data mutation performed. Immutable build promotion/compatible staging rehearsal remain unimplemented, not marked complete.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
