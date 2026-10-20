# Native foundation and next gates

Updated 2026-10-13. This is a local source/bundle foundation, not an APK/IPA, Android device result, TestFlight approval or store release.

## Implemented

- Official pinned Capacitor 8.5.3 Android/iOS source projects; `cloud.emcoin.app`, no development team, keystore or signing credential configured. Generated app icons/splash are still scaffold placeholders, not final store artwork.
- Bundled frontend uses hash routing and HTTPS API `https://app.emcoin.cloud`, disables dotenv loading/inherited Vite flags in the native build, and does not generate/register a service worker.
- Build receipt records the working-tree source fingerprint and exact hashes/byte sizes of all packaged files. No `.env`, source maps, credentials or signing files are accepted. Old generated bundles are retained under ignored `native/.builds/`; original card artwork is unchanged.
- Foreground requests the existing confirmed room projection when connected, or reconnects through the existing admission/token flow. Replaced and intentionally left sessions are not resumed by the native foreground signal. Listeners are removed even when registration resolves after unmount.
- Native Back shares the topmost popup/pending guard; no implicit gameplay exit or blind mutation retry. Existing safe-area CSS gets `viewport-fit=cover` in the packaged HTML.
- Native navigation is distinct from service-worker activation: an empty home may exit while offline; retained or unreadable session storage fails closed for gameplay navigation. Pending guards are checked first.
- Android denies cleartext and excludes local app data from cloud backup/device transfer. No microphone/camera/location/contact or background audio capability has been enabled. These source checks do not replace verification of merged manifests or physical device backup behavior. [Android backup rules](https://developer.android.com/identity/data/autobackup).

## Commands from the workspace

Use Node 22+; the verified runtime is `tmp/r39-node-22.23.3/node-v22.23.3-win-x64/node.exe`.

1. Install reviewed locked dependencies in `fe/` and `native/` using `npm ci`.
2. From `native/`: `npm run build:web`, then `npm run check`, then `npm test`.
3. `npm run sync:android` or `npm run sync:ios` copies the verified bundled frontend and updates the two installed App/Network plugins. Do not point `server.url` at a remote website or enable cleartext/debugging.
4. `node native/scripts/browser-smoke.mjs` from repository root runs a local packaged guide/hash-route smoke with all production network requests blocked. It is Chromium, not Android/iOS WebView or realtime native game evidence.
5. Open `native/android` in Android Studio to configure an SDK and build a test artifact after the gates below. Open `native/ios/App/App.xcodeproj` on a Mac for Xcode/SPM setup. Do not configure release signing/upload yet.

## Native-origin staging progress — 2026-10-13

- `EMCOIN_NATIVE_ORIGINS_ENABLED=true` explicitly adds only `https://localhost`
  and `capacitor://localhost` to the gameplay allowlist. Default/`false` remains
  web-only. Invalid values, wildcard/null origins, URL paths and credentials fail
  configuration validation. Do not add these origins to `EMCOIN_ADMIN_ORIGIN`.
- The Socket.IO initial handshake checks the exact Origin for polling and
  WebSocket; CORS alone does not protect WebSocket upgrades. Originless tooling
  remains compatible, but membership/session authorization is still mandatory.
- An isolated loopback fixture uses real production room handlers to check
  native admission/hydration, cross-room denial and token/hash redaction. Real
  admin login/cookie endpoints reject native origins even when the cookie is
  valid. These checks are transport evidence, not Android/iOS WebView evidence.
- No production environment, compose configuration or origin was changed.
  Enable the flag only in an owned staging process after reviewing its web
  allowlist. Keep production/native release rollout a separately verified step.

## Actual Android debug continuation — 2026-10-15

The owner manually downloaded/agreed to Google's command-line package and answered
the package license prompt. Dedicated SDK/AVD/Gradle cache now exist on D with
process-local JDK21. No Studio IDE, extension, driver update or Windows reboot was
required. Current preflight and WHPX accel-check pass. See
`docs/qa/android-debug-20261015/summary.json` for exact bundle/APK fingerprints.

First `assembleDebug` succeeds and debug signature verifies. The debug APK is at
`D:/Android/EmCoinBuilds/EmCoin-debug-20261015-b91abfb2.apk`; this is not an AAB,
owner release key, store submission or device release approval. Emulator-5580 is
the separate EmCoin_API36 test target. Do not wipe/modify the owner's other AVDs.

Home/60Coin guide/Android Back/Menu and Home background/resume have bounded visible
emulator evidence after reducing the owned display to540x1200/density210. First
cold boot at1080x2400 hit SystemUI/phone/GMS ANRs under software graphics; retain
that failure and transient resume/null-hierarchy frames. No physical-device,
full-game/chat/pending/keyboard/accessibility or sustained performance pass is
implied. Production native origins remain unchanged; native-origin staging and
actual gameplay/network testing still precede beta. No IPA/Xcode/store work done.

The environment notes below describe the earlier2026-10-13 preflight and remain
historical evidence; the SDK absence there is superseded by this continuation.

## Owned Android native-origin QA (2026-10-15)

The opt-in fixture is `be/tests/android/native-room.android.ts`, launched from `be`
with the pinned Node22 runtime:
`node node_modules/vitest/vitest.mjs run --config vitest.android.config.ts --maxWorkers=1`.
It requires the existing owned EmCoin_API36 at emulator-5580, JDK21 and SDK on D;
it never creates an account, accepts licenses or modifies production. It binds a
random loopback HTTPS port and prints `ANDROID_QA_READY <owned-temp-root>` after
building/installing a separate `cloud.emcoin.app.staging` (EmCoin QA).

The QA bundle is built from a temporary copy of frontend sources, without dotenv,
inherited VITE configuration or a service worker. The optimizer's output guard is
unchanged. Only staging resources trust the short-lived public test certificate,
only for10.0.2.2. No global/device CA or trust-all TLS is installed; debug/release
with QA inputs is rejected. The private TLS key never enters app resources.

Use ADB only on emulator-5580. Create a synthetic room in EmCoin QA, then write
`control.json` inside the printed root with a new requestId and command
`companions` to join four isolated HTTPS Socket.IO peers. Select/save one round
through the actual Android UI, start, then background/resume. After verifying
`status.json`, send a new requestId with command`stop`. The fixture asserts five
seats, native-origin admission, a native start command and one planned round.
It has a bounded nine-minute UI checkpoint window, not an unattended full-game bot.

Each run records status/report/receipt fingerprints. On completion/failure the
fixture removes only its newly installed QA app and private TLS key, closes its
backend and retains public evidence; the normal app and other AVDs are untouched.
Reports disclose mocked room primary: this does NOT certify Redis durability,
physical devices, every phase, pending mutations, chat or store readiness.

Initial runtime QA found a real revision bug: presence leases advanced room CAS
revision without notifying active seats, causing round-limit saves after an idle
minute to fail. The targeted fix emits the existing recipient-specific room view
after a successful lease commit. Revision checks, privacy and inactivity are not
relaxed. Failed attempts are retained and must not be counted as a pass.

## Local environment and missing gates (historical 2026-10-13)

- Windows has Android Studio and its bundled JDK 21.0.8. `ANDROID_HOME`/`ANDROID_SDK_ROOT` were not configured and the standard user SDK folder was not present during preflight; no alternative disks were scanned. No Gradle APK build was attempted or counted as passed.
- `node native/scripts/android-preflight.mjs` is read-only and returns failure
  until SDK Platform36, Build Tools35+, Platform Tools/ADB and the SDK license
  installation record exist. Emulator additionally needs Android Emulator and
  the API36 Google APIs x86_64 system image. Current machine JAVA_HOME selects
  JDK25: select Studio's JDK21 for this task process, not a global overwrite.
  Install packages and review/accept their terms yourself through Android
  Studio → SDK Manager; the script never accepts licenses or wipes an AVD.
- Generated Android configuration is min SDK 24, compile/target SDK 36 and Gradle 8.14.3. Install/select the matching SDK Platform and Build Tools through Android Studio's SDK Manager, reviewing its licenses yourself. Use the IDE's bundled JDK 21. [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).
- Generated iOS target is 15.0; Windows project generation/sync is not Xcode compilation. Mac/Xcode, Apple ownership/signing and real iPhone/iPad QA remain pending. [Capacitor iOS](https://capacitorjs.com/docs/ios).
- **Backend origin gate:** source currently configures gameplay HTTP/Socket.IO CORS from `CLIENT_ORIGIN`; deployed configuration approves the web origin only. Native WebView origins `https://localhost` (Android) and `capacitor://localhost` (iOS) need a narrowly scoped, tested staging configuration before a real native game can pass. Do not use wildcard CORS or broaden the separate admin origin. No production origin/environment was changed in this task.
- External showcase links, universal/app links, secure storage/backup behavior on iOS, keyboard/audio interruption/process kill and device/network QA are still required; this foundation does not certify those flows. Android/iOS app icon/splash and privacy manifest/disclosures also need release review.
- Guest session behavior/device footprint must be checked on physical devices. Browser mocks and a packaged guide smoke cannot certify native storage, resume, safe-area or Back behavior.
- Chat transport/report storage/invites and voice provider/microphone handling are not implemented by the native scaffold. Keep the approved room-moderator policy independent of gameplay silence/healing. Provider, privacy, moderation and real device tests precede enabling voice.
- Store accounts remain owner-controlled and not yet available; account/payment/license/signing/reviewer/submission actions are separate. No store approval is promised.

## Rollback and scope

Native projects/bundles are isolated from the production website. Do not deploy this branch to production as a shortcut to native testing. A regular web build retains its web router/service worker; the frontend changes have unit/build checks, but production rollout needs its own reviewed exact-source artifact. Do not overwrite newer catalog/room data or commit native build assets/keys.
