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

## Local environment and missing gates

- Windows has Android Studio and its bundled JDK 21.0.8. `ANDROID_HOME`/`ANDROID_SDK_ROOT` were not configured and the standard user SDK folder was not present during preflight; no alternative disks were scanned. No Gradle APK build was attempted or counted as passed.
- Generated Android configuration is min SDK 24, compile/target SDK 36 and Gradle 8.14.3. Install/select the matching SDK Platform and Build Tools through Android Studio's SDK Manager, reviewing its licenses yourself. Use the IDE's bundled JDK 21. [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).
- Generated iOS target is 15.0; Windows project generation/sync is not Xcode compilation. Mac/Xcode, Apple ownership/signing and real iPhone/iPad QA remain pending. [Capacitor iOS](https://capacitorjs.com/docs/ios).
- **Backend origin gate:** source currently configures gameplay HTTP/Socket.IO CORS from `CLIENT_ORIGIN`; deployed configuration approves the web origin only. Native WebView origins `https://localhost` (Android) and `capacitor://localhost` (iOS) need a narrowly scoped, tested staging configuration before a real native game can pass. Do not use wildcard CORS or broaden the separate admin origin. No production origin/environment was changed in this task.
- External showcase links, universal/app links, secure storage/backup behavior on iOS, keyboard/audio interruption/process kill and device/network QA are still required; this foundation does not certify those flows. Android/iOS app icon/splash and privacy manifest/disclosures also need release review.
- Guest session behavior/device footprint must be checked on physical devices. Browser mocks and a packaged guide smoke cannot certify native storage, resume, safe-area or Back behavior.
- Chat transport/report storage/invites and voice provider/microphone handling are not implemented by the native scaffold. Keep the approved room-moderator policy independent of gameplay silence/healing. Provider, privacy, moderation and real device tests precede enabling voice.
- Store accounts remain owner-controlled and not yet available; account/payment/license/signing/reviewer/submission actions are separate. No store approval is promised.

## Rollback and scope

Native projects/bundles are isolated from the production website. Do not deploy this branch to production as a shortcut to native testing. A regular web build retains its web router/service worker; the frontend changes have unit/build checks, but production rollout needs its own reviewed exact-source artifact. Do not overwrite newer catalog/room data or commit native build assets/keys.
