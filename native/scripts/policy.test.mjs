import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateConfig, validateReceipt } from './policy.mjs'
const config=JSON.parse(await readFile(new URL('../capacitor.config.json',import.meta.url),'utf8'))
test('approved bundled config',()=>assert.doesNotThrow(()=>validateConfig(config)))
for(const [name,patch] of [['remote',{server:{...config.server,url:'https://example.invalid'}}],['cleartext',{server:{...config.server,cleartext:true}}],['navigation',{server:{...config.server,allowNavigation:['*']}}],['debug',{android:{...config.android,webContentsDebuggingEnabled:true}}],['logging',{loggingBehavior:'production'}],['identity',{appId:'other.app'}]]) {
  test(`rejects ${name}`,()=>assert.throws(()=>validateConfig({...config,...patch})))
}
const files=[{file:'index.html',bytes:1,sha256:'a'.repeat(64)}]
const receipt={format:'emcoin-native-bundle/v1',api:'https://app.emcoin.cloud',hashRouter:true,native:true,serviceWorker:false,sourceDigest:'a'.repeat(64),files}
test('exact receipt',()=>assert.doesNotThrow(()=>validateReceipt(receipt,files)))
test('changed bundled file rejected',()=>assert.throws(()=>validateReceipt(receipt,[{...files[0],sha256:'b'.repeat(64)}])))
test('worker rejected',()=>{const f=[...files,{file:'sw.js'}];assert.throws(()=>validateReceipt({...receipt,files:f},f))})
test('wrong API rejected',()=>assert.throws(()=>validateReceipt({...receipt,api:'http://localhost:3001'},files)))
