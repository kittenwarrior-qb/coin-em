import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { classifyAsset, protectedCardFaces } from './assetScope.mjs'

// Read-only inventory: no network, no rewriting originals, no inferred usage/rights.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const imagePattern = /\.(?:png|jpe?g|webp|gif|svg|avif|ico)$/i
const sourcePattern = /\.(?:tsx?|jsx?|css|html)$/i
async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const result = await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))
  return result.flat().sort()
}
const publicRoot = path.join(root, 'public')
const files = (await walk(publicRoot)).filter(file => imagePattern.test(file))
const local = await Promise.all(files.map(async file => {
  const bytes = await fs.readFile(file)
  let dimensions = null
  let decodeError = null
  try {
    const metadata = await sharp(bytes).metadata()
    dimensions = { width: metadata.width ?? null, height: metadata.height ?? null, format: metadata.format }
  } catch (error) { decodeError = String(error.message) }
  const url = '/' + path.relative(publicRoot, file).split(path.sep).join('/')
  return { logicalId: `local:${url}`, oldUrl: url, newUrl: null,
    sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, dimensions, decodeError,
    provenance: 'existing repository asset; rights not yet verified', reskinStatus: classifyAsset(url) === 'protected-card-related' ? 'excluded-owner-protection' : 'pending', scope: classifyAsset(url) }
}))
const references = new Map()
const sourceFiles = [...(await walk(path.join(root, 'src'))).filter(file => sourcePattern.test(file) && !path.relative(root, file).split(path.sep).includes('test')),
  path.join(root, 'src/assets/preloadAssets.json'), path.join(root, 'index.html')]
for (const file of sourceFiles) {
  const source = await fs.readFile(file, 'utf8')
  const literals = /["'`]((?:https?:\/\/|\/)[^"'`\r\n]*?\.(?:png|jpe?g|webp|gif|svg|avif|ico)(?:\?[^"'`\r\n]*)?)["'`]/gi
  for (const match of source.matchAll(literals)) {
    const url = match[1]
    if (url.includes('${')) continue
    const entry = references.get(url) ?? new Set()
    entry.add(path.relative(root, file).split(path.sep).join('/'))
    references.set(url, entry)
  }
}
const localUrls = new Set(local.map(item => item.oldUrl))
const referenceList = [...references].sort(([a], [b]) => a.localeCompare(b)).map(([url, sourceFiles]) => ({
  oldUrl: url, newUrl: null, sourceFiles: [...sourceFiles],
  kind: url.startsWith('http') ? 'remote' : 'local',
  exists: url.startsWith('http') ? null : localUrls.has(decodeURIComponent(url.split('?')[0])),
  // Static references are candidates, not proof that a route currently renders them.
  usage: 'static-reference-candidate', reskinStatus: classifyAsset(url, [...sourceFiles]) === 'protected-card-related' ? 'excluded-owner-protection' : 'pending', rights: 'unverified', scope: classifyAsset(url, [...sourceFiles]),
}))
const baseline = JSON.parse(await fs.readFile(path.join(root, '../be/src/constants/webCardBaseline.json'), 'utf8'))
const protectedFaces = protectedCardFaces(baseline)
const scopeCounts = Object.fromEntries(['protected-card-related', 'ui-reskin-candidate', 'review-required'].map(scope => [scope, local.filter(item => item.scope === scope).length]))
const summary = {
  version: 'asset-inventory/v1',
  localImageCount: local.length,
  localBytes: local.reduce((sum, item) => sum + item.bytes, 0),
  localContentHash: createHash('sha256').update(local.map(item => `${item.oldUrl}:${item.sha256}`).join('\n')).digest('hex'),
  staticReferenceCount: referenceList.length,
  remoteReferenceCount: referenceList.filter(item => item.kind === 'remote').length,
  missingLocalReferences: referenceList.filter(item => item.exists === false).map(item => item.oldUrl),
  decodeErrors: local.filter(item => item.decodeError).map(item => ({ url: item.oldUrl, error: item.decodeError })),
  reskinnedCount: 0,
  protectedCardFaceCount: protectedFaces.length,
  localScopeCounts: scopeCounts,
  limitations: ['Dynamic/constructed paths require runtime verification.', 'Remote files were not fetched; their hashes/dimensions/rights remain unverified.', 'No old asset was deleted or replaced.'],
}
process.stdout.write(JSON.stringify(process.argv.includes('--json') ? { summary, local, references: referenceList, protectedFaces } : summary, null, 2) + '\n')
if (process.argv.includes('--check') && (summary.missingLocalReferences.length || summary.decodeErrors.length)) process.exitCode = 1
