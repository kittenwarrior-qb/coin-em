import { createHash } from 'node:crypto'
import { lstat, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export function validateConfig(config) {
  if (config.appId !== 'cloud.emcoin.app' || config.appName !== 'EmCoin' || config.webDir !== 'web' ||
      config.loggingBehavior !== 'none' || config.server?.url || config.server?.cleartext !== false ||
      config.server?.hostname !== 'localhost' || config.server?.androidScheme !== 'https' ||
      config.server?.iosScheme !== 'capacitor' || !Array.isArray(config.server?.allowNavigation) ||
      config.server.allowNavigation.length || config.android?.allowMixedContent !== false ||
      config.android?.webContentsDebuggingEnabled !== false) throw Error('UNSAFE_NATIVE_CONFIG')
}
export const hash = bytes => createHash('sha256').update(bytes).digest('hex')
export async function inventory(root) {
  const files = []
  async function visit(directory) {
    if ((await lstat(directory)).isSymbolicLink()) throw Error('NATIVE_SYMLINK_REJECTED')
    for (const name of (await readdir(directory)).sort()) {
      const absolute = path.join(directory, name), stat = await lstat(absolute)
      if (stat.isSymbolicLink()) throw Error('NATIVE_SYMLINK_REJECTED')
      if (stat.isDirectory()) await visit(absolute)
      else if (stat.isFile()) {
        const file = path.relative(root, absolute).replaceAll('\\', '/')
        if (file === 'native-build.json') continue
        if (/(^|\/)(\.env[^/]*|node_modules|\.git)(\/|$)|\.(map|jks|keystore|p12|mobileprovision)$/i.test(file)) throw Error('FORBIDDEN_NATIVE_ASSET')
        const bytes = await readFile(absolute)
        files.push({ file, bytes:bytes.length, sha256:hash(bytes) })
      }
    }
  }
  await visit(root)
  return files.sort((a,b)=>a.file.localeCompare(b.file))
}
export function validateReceipt(receipt, files) {
  if (receipt.format !== 'emcoin-native-bundle/v1' || receipt.api !== 'https://app.emcoin.cloud' ||
      receipt.hashRouter !== true || receipt.native !== true || receipt.serviceWorker !== false ||
      !/^[a-f0-9]{64}$/.test(receipt.sourceDigest ?? '') || JSON.stringify(receipt.files) !== JSON.stringify(files) ||
      !files.some(item=>item.file === 'index.html') || files.some(item=>['sw.js','manifest.webmanifest'].includes(item.file))) throw Error('INVALID_NATIVE_BUNDLE')
}
