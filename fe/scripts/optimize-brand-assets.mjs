import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

// Mechanical encoding only. Never touch card art, avatar slots or original PNG masters.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const themes = ['emotion-orbit', 'kindness-workshop']
const names = ['logo-v2', 'backdrop-v3', 'primary-v3', 'secondary-v3', 'quiet-v3',
  'menu-panel-v3', 'menu-panel-v4', 'table-v3', 'board-backdrop-v1']
const records = []
for (const theme of themes) for (const name of names) {
  const url = `/cartoon/ui/themes/${theme}/${name}`
  let source
  try { source = await fs.readFile(path.join(root, 'public', `${url}.png`)) }
  catch (error) { if (error.code === 'ENOENT') continue; throw error }
  const quality = theme === 'kindness-workshop' ? 92 : 94
  const encoded = await sharp(source).webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer()
  const metadata = await sharp(source).metadata()
  const before = await sharp(source).ensureAlpha().raw().toBuffer()
  const after = await sharp(encoded).ensureAlpha().raw().toBuffer()
  if (before.length !== after.length) throw new Error('OPTIMIZATION_DIMENSION_DRIFT')
  let errorSum = 0, channels = 0
  for (let pixel = 0; pixel < before.length; pixel += 4) {
    if (before[pixel + 3] !== after[pixel + 3]) throw new Error('OPTIMIZATION_ALPHA_DRIFT')
    if (before[pixel + 3] > 0) for (let channel = 0; channel < 3; channel++) {
      errorSum += Math.abs(before[pixel + channel] - after[pixel + channel]); channels++
    }
  }
  const meanVisibleRgbError = errorSum / Math.max(1, channels)
  if (meanVisibleRgbError > 3 || encoded.length >= source.length) throw new Error('OPTIMIZATION_BUDGET_FAILED')
  await fs.writeFile(path.join(root, 'public', `${url}.webp`), encoded)
  records.push({ source: `${url}.png`, url: `${url}.webp`, sourceSha256: hash(source),
    sha256: hash(encoded), sourceBytes: source.length, bytes: encoded.length,
    width: metadata.width, height: metadata.height, quality, maxAlphaError: 0, meanVisibleRgbError })
}

// Bulk mechanical reference update restricted to the two approved themes and exact filenames.
// Dynamic theme paths use these same filenames, so include controlThemes.ts explicitly.
const changed = []
async function migrate(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) await migrate(filename)
    else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      const before = await fs.readFile(filename, 'utf8')
      let after = before
      for (const { source, url } of records) after = after.replaceAll(source, url)
      if (entry.name === 'controlThemes.ts' || entry.name === 'brandThemes.test.tsx') {
        for (const name of names) after = after.replaceAll(`${name}.png`, `${name}.webp`)
      }
      if (entry.name === 'prototypeFidelity.css') {
        for (const name of ['secondary-v3', 'quiet-v3']) after = after.replaceAll(`${name}.png`, `${name}.webp`)
      }
      if (after !== before) { await fs.writeFile(filename, after); changed.push(path.relative(root, filename)) }
    }
  }
}
await migrate(path.join(root, 'src'))
const manifestPath = path.join(root, 'src/assets/assetManifest.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const protectedBefore = JSON.stringify(manifest.protectedCardFaces)
for (const record of manifest.preload) {
  const replacement = records.find(item => item.source === record.oldUrl || item.url === record.oldUrl)
  if (!replacement) continue
  Object.assign(record, { logicalId: `preload:${replacement.url}`, oldUrl: replacement.url,
    sha256: replacement.sha256, bytes: replacement.bytes, width: replacement.width, height: replacement.height })
}
const critical = [], background = []
for (const record of manifest.preload) (record.priority === 'critical' ? critical : background).push({ url: record.oldUrl, tag: record.tag })
manifest.preloadFingerprint = hash(JSON.stringify({ critical, background }))
if (JSON.stringify(manifest.protectedCardFaces) !== protectedBefore) throw new Error('PROTECTED_CARD_DRIFT')
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
await fs.writeFile(path.join(root, 'src/assets/preloadAssets.json'), JSON.stringify({ version: 'ui-preload-assets/v2', critical, background }, null, 2) + '\n')
const report = JSON.stringify({
  version: 'brand-optimization/v1', encoding: 'WebP Orbit94/Workshop92, alpha100; no resize/crop',
  protectedCardFacesChanged: false, records,
}, null, 2) + '\n'
await fs.writeFile(path.join(root, '../docs/design/brand-optimization.json'), report)
await fs.writeFile(path.join(root, 'src/assets/brandOptimization.json'), report)
console.log(JSON.stringify({ changed, records: records.length,
  sourceBytes: records.reduce((sum, record) => sum + record.sourceBytes, 0),
  optimizedBytes: records.reduce((sum, record) => sum + record.bytes, 0),
  preloadFingerprint: manifest.preloadFingerprint }))
