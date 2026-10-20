import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, cp, rename, lstat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { hash, inventory, validateConfig, validateReceipt } from '../../native/scripts/policy.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const fe = path.join(root,'fe'), native = path.join(root,'native'), web = path.join(native,'web')
if (Number(process.versions.node.split('.')[0]) < 22) throw Error('Native build requires Node 22 or newer')
validateConfig(JSON.parse(await readFile(path.join(native,'capacitor.config.json'),'utf8')))
// Environment files and inherited public build flags must not change the native artifact.
const env = Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('VITE_')))
Object.assign(env,{VITE_NATIVE_APP:'true',VITE_USE_HASH_ROUTE:'true',VITE_BASE_URL:'/',VITE_API_URL:'https://app.emcoin.cloud'})
for (const args of [['node_modules/typescript/bin/tsc','-b'],['node_modules/vite/bin/vite.js','build','--mode','native']]) {
  execFileSync(process.execPath,args,{cwd:fe,env,stdio:'inherit',windowsHide:true})
}
// Preserve any preceding generated bundle; never remove source or a symlink target.
try {
  if ((await lstat(web)).isSymbolicLink()) throw Error('NATIVE_SYMLINK_REJECTED')
  await mkdir(path.join(native,'.builds'),{recursive:true})
  await rename(web,path.join(native,'.builds',`web-${Date.now()}`))
} catch(error) { if(error.code !== 'ENOENT') throw error }
await cp(path.join(fe,'dist'),web,{recursive:true,errorOnExist:true,force:false})
const index=path.join(web,'index.html')
await writeFile(index,(await readFile(index,'utf8')).replace(/\s*<link\s+rel="manifest"[^>]*>/g,'').replace('width=device-width, initial-scale=1.0','width=device-width, initial-scale=1.0, viewport-fit=cover'))
const source=[]
for(const dir of ['src','public','pwa']) source.push([dir,await inventory(path.join(fe,dir))])
for(const file of ['package.json','package-lock.json','vite.config.ts']) source.push([file,hash(await readFile(path.join(fe,file)))])
const files=await inventory(web)
const receipt={format:'emcoin-native-bundle/v1',sourceState:'working-tree',sourceDigest:hash(JSON.stringify(source)),
  api:env.VITE_API_URL,hashRouter:true,native:true,serviceWorker:false,files}
validateReceipt(receipt,files)
await writeFile(path.join(web,'native-build.json'),JSON.stringify(receipt,null,2)+'\n')
console.log(`Native web bundle verified: ${files.length} files; ${files.reduce((n,f)=>n+f.bytes,0)} bytes. Not an APK/IPA or device-test result.`)
