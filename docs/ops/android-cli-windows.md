# Android without the Studio IDE (Windows)

Project helper: `native/scripts/android-cli.ps1`. Default action is read-only
`Inspect`. It reuses the local JDK21 and prepares a separate SDK at
`D:\Android\EmCoinSdk` (owned AVDs under its `avd` folder, also on D); no machine PATH/JAVA_HOME change. It does not install a
VS Code extension: a launcher extension still needs the real SDK/emulator.

## One manual download / agreement boundary

Open [Google's command-line tools download](https://developer.android.com/studio#command-line-tools-only).
Choose Windows under **Command line tools only**, read the agreement and download
it yourself. Do not ask an agent to click agreement boxes or fabricate license
records. The reviewed2026-10-15 Windows archive is
`commandlinetools-win-15859902_latest.zip`, SHA256
`90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`.
If Google changes the archive, stop and review the new hash rather than bypassing
verification. No ZIP has been downloaded/installed by preparing these scripts.

## Prepare and install

Run these individually in your own PowerShell terminal, from this managed checkout.
Replace the ZIP path with the file you actually downloaded. No admin rights needed
for this dedicated SDK directory if the current user can write there.

```powershell
.\native\scripts\android-cli.ps1 -Action Inspect
.\native\scripts\android-cli.ps1 -Action Prepare -ArchivePath 'C:\Users\Admin\Downloads\commandlinetools-win-15859902_latest.zip'
.\native\scripts\android-cli.ps1 -Action Install
```

Install runs Google's sdkmanager with interactive input inherited. Read and answer
package license prompts yourself; choose no or cancel if you do not accept. There
is no yes pipe or automatic license acceptance. Packages match this project:
platform36, Build Tools36.0.0, Platform Tools/ADB, Emulator and API36 Google APIs
x86_64 image. Installation needs network and several GB; check disk space first.

If execution policy blocks the local script, review it and your machine's policy;
the helper does not weaken execution policy or security settings automatically.

## Create and start the separate emulator

```powershell
.\native\scripts\android-cli.ps1 -Action Create
.\native\scripts\android-cli.ps1 -Action Start
```

Both actions require the emulator's actual `-accel-check` to succeed. Windows
reporting a hypervisor or firmware virtualization alone is not proof. If WHPX is
unavailable, follow [Google's acceleration guide](https://developer.android.com/studio/run/emulator-acceleration)
and enable/restart manually when convenient. The helper never toggles Windows
features, installs kernel drivers or reboots. Existing AVDs are not overwritten;
no force/wipe flag is used. Start keeps its terminal occupied while the visible
device runs; close the device to stop it.

After package installation, tell the agent to rerun preflight with SDK root and
JDK21 selected **for that process only**, then rebuild/sync native assets and try
Gradle debug APK. This guide is not evidence that SDK/emulator/APK is already ready.
No signing for release, store upload, microphone, third-party cloud emulator or
production server change is included. An emulator does not replace physical-device
QA for the release gates.

References: [sdkmanager](https://developer.android.com/tools/sdkmanager),
[command-line emulator](https://developer.android.com/studio/run/emulator-commandline).
