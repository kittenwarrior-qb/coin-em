import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { manifestLocalPath, validateAssetManifest } from './assetManifestPolicy.mjs'

// Read-only, no CDN requests, generated files, asset edits or cache population.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/assets/assetManifest.json'), 'utf8'))
const projection = JSON.parse(await fs.readFile(path.join(root, 'src/assets/preloadAssets.json'), 'utf8'))
const baseline = JSON.parse(await fs.readFile(path.join(root, '../be/src/constants/webCardBaseline.json'), 'utf8'))
const verified = validateAssetManifest(manifest, projection, baseline)
const publicRoot = await fs.realpath(path.join(root, 'public'))
for (const record of verified.local) {
  const filename = await fs.realpath(path.resolve(publicRoot, manifestLocalPath(record.oldUrl)))
  if (!filename.startsWith(publicRoot + path.sep)) throw new Error('ASSET_PATH_OUTSIDE_PUBLIC')
  const bytes = await fs.readFile(filename)
  const metadata = await sharp(bytes).metadata()
  if (createHash('sha256').update(bytes).digest('hex') !== record.sha256 || bytes.length !== record.bytes ||
      metadata.width !== record.width || metadata.height !== record.height) throw new Error('ASSET_MANIFEST_CONTENT_MISMATCH')
}
console.log(JSON.stringify({ version: manifest.version, result: 'passed',
  critical: verified.critical, background: verified.background, protectedFaces: verified.protectedFaces,
  localChecks: verified.local.length, remoteContentVerified: false, rightsVerified: false, protectedFaceReskins: 0 }))
