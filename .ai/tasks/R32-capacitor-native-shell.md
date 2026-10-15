# R32 Capacitor native shell

**Priority:** P2  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R31, R30, R33

## Goal

Bundled FE and lifecycle/token/link adapters with safe area/native back.

## Current evidence

Bundled Android/iOS source foundation exists. A first local Android debug APK now
builds, verifies and installs/launches in the owned API36 emulator (2026-10-15).
This is bounded Home/guide/Back/background smoke, not multiplayer, physical-device,
release-signing, IPA/Xcode or store approval. Initial emulator SystemUI ANRs and
remaining native-origin staging gates are recorded below, not waived.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R32)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R31, R30, R33.
- fe/package.json; fe/src/App.tsx; fe/src/hooks/useSocket.ts; fe/src/components/game/GameMenuModal.tsx; capacitor/android modules; capacitor/ios modules

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`native lifecycle/link/network → platform adapter → session/socket resume → safe-area/back/external navigation`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R32.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Audience6–18 is owner-approved; do not reopen that choice. Native permission scope, signing owner, iOS capability and target device decisions still need OQ-08/OQ-10 approval. No distributable/store action is authorized by implementation requests.

## Implementation plan

### Owner revision2026-10-15 — standalone Windows SDK/emulator preparation

Owner requests setup without Studio or a phone currently available. Admit a
project-local PowerShell helper, tests and runbook for a dedicated
D:/Android/EmCoinSdk, reusing verified local JDK21. Download only after owner
personally reviews/accepts Google's download terms; do not bypass the download
agreement or synthesize license records. Verify the official ZIP SHA256, reject
archive traversal/reparse targets and preserve any installed SDK/AVD. Package
installation/license prompts are explicitly human-interactive. Never pipe yes,
accept terms, toggle Windows features/reboot, wipe AVDs, contact/sign/store/deploy
or install unrelated editor extensions. ADB/emulator acceleration/boot/APK evidence
remain unavailable until real tools exist; scripts/tests are not installation.

Continuation after owner manually answered license prompts: allow installation
retry using the existing accepted records (no prompt answered by agent), scoped
AVD creation/start/ADB on emulator-5580, current native bundle rebuild/sync and
Gradle assembleDebug with process-local JDK21/SDK/Gradle cache on D. No release
signing/store/submission/production-origin changes. Keep fresh browser evidence
in allocated temp directories, not historical screenshot paths. Debug certificate
is not an owner release signing key. Record actual APK hash/source digest and
bounded emulator launch evidence separately from untested gameplay/device gates.

### Plan revision 2026-10-13 — native-origin staging and Android preflight

Owner requests continued implementation after deploying their revised admin.
Admit `be/src/transport/origins.ts`, adjacent index wiring and owned origin tests,
plus read-only native Android preflight/script tests and runbook updates. Merge
the deployed admin source into the isolated native branch rather than overwrite
the dirty primary checkout. Native gameplay origins must be an explicit flag,
not a wildcard or an admin-origin expansion; check WebSocket handshakes too.
Do not change production environment, install/accept SDK licenses, sign or
submit a build. Prefer Studio JDK21 explicitly over machine JAVA_HOME25.

### Owner revision2026-10-13 — native foundation admitted

Owner confirms cloud.emcoin.app and independent chat/micro moderation. Admit
native/package+lock/config, Android/iOS generated source (not release signing),
fe platform adapters/bootstrap/pending-back bridge, adjacent tests/build tooling
and documentation. Pin official Capacitor8 packages on Node22; bundle an owned
copied frontend build with production HTTPS API/hash routing, no copied .env,
no remote server.url/cleartext/debug/private worker registration. Real platform
SDK/device/macOS/signing/store acceptance remains pending. Native foreground
requests existing recipient-safe get_room_state when connected, otherwise normal
token reconnect; no invented wire event, implicit room exit or blind mutation retry.
Do not resurrect a replaced/explicitly left session. Expose background signal for
future voice cleanup without adding media permissions or a provider now.

1. Wait for OQ-08/OQ-10 signing, audience, permissions and iOS capability decisions; do not create distributable signing artifacts.
2. Define platform adapters for lifecycle, network, safe area, back behavior, external links and R09 session storage without changing domain rules.
3. Package the already-tested web bundle only after R31/R30/R33 gates; keep native navigation separate from web router assumptions.
4. On foreground/relaunch, validate token/session and fetch confirmed projection rather than assuming a persistent socket.
5. Test Android and iOS target flows for cold/warm launch, deep link, back, keyboard/safe area, offline/reconnect and external navigation on named devices.
6. Record platform/tool versions and known gaps; no store upload, credential handling or permission expansion in this task.

## Implementation report

### Plan revision / implementation 2026-10-13 — verifiable local foundation

Admit adjacent `fe/vite.config.ts` native-only dotenv/PWA boundary, `fe/scripts/build-native.mjs`, native source/check/browser scripts, bridge/socket/popup tests and `docs/ops/native-foundation.md`; these are necessary for the previously approved bundled shell. Android/iOS scaffolds generated with installed official pinned CLI (iOS SPM); no signing or SDK/device compilation. Android cleartext/backup/transfer exclusions added; no microphone or background capability. Config/asset hashes verify before sync, native manifest/worker omitted, hash routing/API fixed. Source fingerprint truthfully says working-tree; existing unrelated BE communication edits are preserved/excluded from this task.

Native lifecycle/late-listener cleanup, pending Back, confirmed hydration, replaced-session suppression and unmount removal have focused regressions. Build/check and packaged guide hash-reload smoke pass. Native-origin CORS, external/app links, Android SDK configuration, iOS/Xcode, real device keyboard/safe-area/storage/audio/resume, final app icons/splash and signing/store gates remain explicit in the runbook. No native app distributable or production deployment is claimed. R32 remains in progress, not done; existing app.emcoin.cloud release is untouched.

### Plan revision 2026-10-12 — communication và mobile roadmap

Owner yêu cầu roadmap Android/iOS và chốt voice trong phòng mời có quản trò, micro opt-in, mute/block/report, không recording hoặc ghép người lạ. Quyết định cũ no-micro được thay cho scope này, không mở camera/location/contacts. Owner chưa có Play Console/Apple Developer/Mac hoặc dịch vụ build iOS. Xem `docs/ops/mobile-release-roadmap.md` cho milestones, module boundaries, device evidence và setup hướng dẫn. Chat hiện có chỉ là phản hồi phase; chưa có room chat/voice/native implementation. Game-role silence/heal policy và moderation retention cần chốt trước code communication. Status vẫn planned; không ký/upload/deploy trong bước kế hoạch.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-15 actual debug build and emulator continuation: owner reports accepting
the SDK prompt. Existing license record used to finish package installation;
agent did not answer new license prompts. Preflight buildReady/emulatorReady=true,
WHPX actual accel-check PASS. Dedicated EmCoin_API36/port5580 created on D;
existing Pixel_7/Pixel_7_2 untouched. Native600files/34194701bytes rebuilt/synced,
exact config/receipt and fresh packaged Chromium guide smoke PASS;28native tests
PASS. Gradle8.14.3/AGP8.13/JDK21 assembleDebug PASS109tasks in3m10s. APK34625774bytes,
SHA256b91abfb20c6c205d3662cc0e9e4983c9e4df56d3051bcccbdc5dbf75d69034b9,
debug v2signature verifies, id cloud.emcoin.app/min24/target36/no mic/camera.

Retained failure: cold1080x2400 software-rendered first boot produced Android
SystemUI/phone/GMS ANRs; native Home was behind a SystemUI dialog. Host driver was
not upgraded. Selected Wait and reduced only this AVD to540x1200/density210. Home,
60Coin guide, Android Back, Menu and Home background/resume visibly work after
settling; no EmCoin ANR appears in the observed event buffer. First immediate
resume capture was blank; later settled capture is retained separately. UIAutomator
also returned a null root during a transient frame; no native accessibility/full
performance certification. No further native room/game/chat/network/pending-mutation
or physical-device tests performed. Emulator remains open for owner; SDK/Gradle/AVD
files stay on D. No production native-origin change or store submission.
Evidence:docs/qa/android-debug-20261015/summary.json. Frontend source includes local
uncommitted R36 work, identified by bundle digest, not a clean release commit.

2026-10-15 actual CLI preparation follow-up: owner reports manually downloading
Google Windows ZIP to D. Found D:/commandlinetools-win-15859902_latest.zip,
155655386bytes; pinned SHA256 matches. Actual Prepare action PASS and tools are
extracted at D:/Android/EmCoinSdk/cmdline-tools/emcoin-15859902 without overwriting
another SDK. Started a separate visible user-interactive PowerShell Install window
for package/license prompts; no input/terms answered by agent. Do not infer SDK,
emulator image, acceleration, AVD boot or APK readiness until installation completes
and real preflight/boot/build checks run. No production/store change.

2026-10-15 standalone preparation: helper syntax/default Inspect PASS in pwsh and
Windows PowerShell5;28native tests PASS (8new helper safety cases). Real JDK21
exists even though owner does not use the Studio IDE. Windows reports firmware
virtualization/hypervisor; emulator acceleration is NOT verified without actual
emulator tools. Dedicated SDK/AVD path is on D, no global env/security/driver change.
No approved ZIP exists in Downloads; owner must personally accept/download Google
CLI terms, then run Prepare/interactive Install. Helper validates pinned official
SHA256, extraction paths and no-overwrite target; no SDK or emulator installed,
no license accepted, no AVD started and no APK built. Guide:docs/ops/android-cli-windows.md.

2026-10-15 read-only continuation:20native policy/preflight tests PASS. Preflight
with process-local Android Studio JDK21 confirms Java present but SDK/platform36,
Build Tools/ADB/license record/emulator/API36Google APIs x86_64 image absent.
Default process JAVA_HOME still selects the wrong Java; global settings were not
changed. Owner answered that they will install via SDK Manager and report when
done. No downloads, accepted licenses, APK/IPA build, signing, device connection
or production change occurred. This is an environment gate, not completion of R32.

2026-10-13 staging follow-up: exact web/native origin flag/config tests and real
production-handler loopback admission/hydration/cross-room/session redaction plus
admin-cookie/origin checks PASS30. Initial four read cases wrongly expected an
ACK for get_room_state, timed out, and were corrected to await the existing
room_state event without changing production read semantics. BE743tests/69files
PASS (includes26 newly added unregistered chat-domain cases), TypeScript build
PASS. FE759tests/79files PASS with maxWorkers4, lint and regular/native builds
PASS. Initial default-concurrency full FE run had one asset-fingerprint timeout
at5s; this is retained as failed, not suppressed by a larger test deadline.
Rebuilt native bundle599files/34,167,680bytes, exact checks/Android+iOS sync and
packaged guide browser smoke PASS. Twenty native policy/preflight tests PASS.
Read-only SDK preflight with Studio JDK21 fails as expected: SDK/platform36/build
tools/ADB/license record/emulator/system image absent. Machine JAVA_HOME points
to JDK25; no global env was changed. Real native gameplay/device/store tests and
SDK license acceptance remain pending. Production admin release994936d is not
changed by this staging work.

2026-10-13 isolated foundation QA: FE clean `npm ci --ignore-scripts` (network after offline-cache miss), 759 tests/79 files PASS, lint PASS, TypeScript/regular web build PASS (manifest/worker retained) and native build PASS (no manifest/worker, 597 files/34,118,075 bytes). Native policy11tests PASS; exact asset/config/manifest checks PASS; official Android/iOS(SPM) add/sync PASS. Packaged guide cold/reload/hash-route smoke at320/390px PASS with0worker registrations/page errors and production network blocked. Source digest `fd6a736ab20346199647a15349783a64a738e626699cc40784b190f83bbea228` identifies the dirty reviewed bundle, not signed platform artifacts.

Initial native clean install FAILED because the pre-existing uuid override did not match its lock; lock resolved with exact package policy and clean install rerun PASS. Primary shared checkout concurrently gained unrelated admin/backend edits: total run had6admin test failures and a lint error in admin export code. Those edits were preserved, not hidden/repaired or mixed into native. Scoped foundation was isolated on `codex/native-foundation` based on `a4c4167`; no global41task green claim. Android SDK was not configured in standard preflight; no Gradle APK/Xcode/device/backup-transfer test performed. Native staging CORS and external/deep links remain before a real native gameplay gate.

Regular-web production admin/Home browser matrix on the isolated source also PASS55.08s, including existing pending/idempotent/admin protections. No source backend or production setting changes were required for this local verification.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
