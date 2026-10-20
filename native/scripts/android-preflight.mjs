import { access, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

export function androidReadiness(facts) {
  const buildMissing = ['sdk', 'java21', 'platform36', 'buildTools', 'adb', 'licenseRecord'].filter(key => facts[key] !== true)
  const emulatorMissing = ['emulator', 'systemImage'].filter(key => facts[key] !== true)
  return { version: 'android-preflight/v1', buildReady: buildMissing.length === 0,
    emulatorReady: buildMissing.length === 0 && emulatorMissing.length === 0,
    buildMissing, emulatorMissing, apkBuilt: false, deviceTested: false, licensesAcceptedByThisScript: false }
}

const exists = async file => { try { await access(file); return true } catch { return false } }
export async function inspectAndroid(sdk, java) {
  let java21 = false
  try {
    const result = spawnSync(java, ['-version'], { encoding: 'utf8', windowsHide: true })
    java21 = result.status === 0 && /version "21\./.test(`${result.stdout}${result.stderr}`)
  } catch { /* missing Java is an explicit preflight failure */ }
  const executable = name => process.platform === 'win32' ? `${name}.exe` : name
  let tools = []
  try { tools = await readdir(path.join(sdk, 'build-tools')) } catch { /* SDK may not be installed */ }
  const buildTools = (await Promise.all(tools.filter(name => /^\d+\.\d+\.\d+$/.test(name) && Number(name.split('.')[0]) >= 35)
    .map(name => exists(path.join(sdk, 'build-tools', name, executable('aapt2')))))).some(Boolean)
  const facts = { sdk: await exists(sdk), java21, platform36: await exists(path.join(sdk, 'platforms/android-36/android.jar')),
    buildTools, adb: await exists(path.join(sdk, 'platform-tools', executable('adb'))),
    licenseRecord: await exists(path.join(sdk, 'licenses/android-sdk-license')),
    emulator: await exists(path.join(sdk, 'emulator', executable('emulator'))),
    systemImage: await exists(path.join(sdk, 'system-images/android-36/google_apis/x86_64/system.img')) }
  return { ...androidReadiness(facts), facts,
    notes: ['Read-only check; no downloads, license acceptance, global environment writes, signing or device access.',
      'A license file is only an installation record; review/accept terms yourself in SDK Manager or an interactive sdkmanager terminal.',
      'Emulator target is an owned API 36 Google APIs x86_64 AVD; do not wipe an existing AVD.'] }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(os.homedir(), 'AppData/Local/Android/Sdk')
  const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
    : process.platform === 'win32' ? 'C:/Program Files/Android/Android Studio/jbr/bin/java.exe' : 'java'
  const result = await inspectAndroid(sdk, java)
  console.log(JSON.stringify(result, null, 2))
  if (!result.buildReady) process.exitCode = 2
}
