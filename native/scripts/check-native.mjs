import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { inventory, validateConfig, validateReceipt } from './policy.mjs'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
validateConfig(JSON.parse(await readFile(path.join(root,'capacitor.config.json'),'utf8')))
const web=path.join(root,'web'), files=await inventory(web)
validateReceipt(JSON.parse(await readFile(path.join(web,'native-build.json'),'utf8')),files)
if(/rel="manifest"/.test(await readFile(path.join(web,'index.html'),'utf8')))throw Error('NATIVE_MANIFEST_LINK_REJECTED')
const android=await readFile(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8')
if(!android.includes('android:allowBackup="false"') || !android.includes('android:usesCleartextTraffic="false"') ||
   /RECORD_AUDIO|CAMERA|ACCESS_FINE_LOCATION|READ_CONTACTS/.test(android))throw Error('UNSAFE_ANDROID_MANIFEST')
for(const file of ['backup_rules.xml','data_extraction_rules.xml']) {
  const xml=await readFile(path.join(root,'android/app/src/main/res/xml',file),'utf8')
  for(const domain of ['root','file','database','sharedpref','external'])if(!xml.includes(`domain="${domain}" path="."`))throw Error('INCOMPLETE_ANDROID_BACKUP_EXCLUSION')
}
const ios=await readFile(path.join(root,'ios/App/App/Info.plist'),'utf8')
if(/NSAllowsArbitraryLoads|NSMicrophoneUsageDescription|NSCameraUsageDescription|UIBackgroundModes/.test(ios))throw Error('UNAPPROVED_IOS_CAPABILITY')
console.log('Native config and exact bundled file hashes passed; no signing/device/store claim.')
