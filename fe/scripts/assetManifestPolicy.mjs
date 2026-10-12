import { createHash } from 'node:crypto'
import { classifyAsset, protectedCardFaces } from './assetScope.mjs'

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const fail = () => { throw new Error('ASSET_MANIFEST_REVIEW_REQUIRED') }
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const metadataKeys = ['sha256', 'bytes', 'width', 'height']
const exactKeys = (value, keys) => Object.keys(value).sort().join('|') === [...keys].sort().join('|')
function validMetadata(record, local) {
  return local ? typeof record.sha256 === 'string' && /^[a-f0-9]{64}$/.test(record.sha256) &&
    ['bytes', 'width', 'height'].every(key => Number.isSafeInteger(record[key]) && record[key] > 0) :
    metadataKeys.every(key => record[key] === null)
}

/** URL-only local paths, never allow traversal/protocol/query/absolute filesystem access. */
export function manifestLocalPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || /[?#\\\u0000]/.test(url)) fail()
  let decoded
  try { decoded = decodeURIComponent(url) } catch { fail() }
  if (/[?#\\\u0000]/.test(decoded) || decoded.startsWith('//') ||
      decoded.split('/').some(segment => segment === '.' || segment === '..') ||
      !/\.(?:png|jpe?g|webp|gif|svg|avif|ico)$/i.test(decoded)) fail()
  return decoded.slice(1)
}

/** Fixed reference comparison; no network/renderer mutation or license inference. */
export function validateAssetManifest(manifest, projection, baseline) {
  if (!object(manifest) || manifest.version !== 'asset-manifest/v2' ||
      manifest.catalogVersion !== 'web-card-baseline/v1' || !Array.isArray(manifest.preload) ||
      manifest.preload.length !== 110 || !Array.isArray(manifest.protectedCardFaces) ||
      !object(projection) || projection.version !== 'ui-preload-assets/v2' ||
      !exactKeys(manifest, ['version', 'catalogVersion', 'preloadFingerprint', 'preload', 'protectedCardFaces']) ||
      !exactKeys(projection, ['version', 'critical', 'background'])) fail()
  const ids = new Set()
  const critical = [], background = [], local = []
  for (const record of manifest.preload) {
    if (!object(record) || typeof record.oldUrl !== 'string' ||
        record.logicalId !== `preload:${record.oldUrl}` || ids.has(record.logicalId) ||
        record.newUrl !== null || typeof record.tag !== 'string' || !record.tag ||
        !['critical', 'background'].includes(record.priority) ||
        record.scope !== classifyAsset(record.oldUrl) || record.rights !== 'unverified' ||
        record.crop !== 'unchanged' || record.fallback !== null ||
        record.cache !== 'browser-http-not-PWA-cache' || !validMetadata(record, true) ||
        !exactKeys(record, ['logicalId', 'oldUrl', 'newUrl', 'tag', 'priority', 'scope', 'rights', 'crop', 'fallback', 'cache', ...metadataKeys])) fail()
    manifestLocalPath(record.oldUrl)
    ids.add(record.logicalId)
    ;(record.priority === 'critical' ? critical : background).push({ url: record.oldUrl, tag: record.tag })
    local.push(record)
  }
  if (critical.length !== 4 || manifest.preloadFingerprint !== hash({ critical, background }) ||
      JSON.stringify(projection) !== JSON.stringify({ version: 'ui-preload-assets/v2', critical, background })) fail()
  const faces = protectedCardFaces(baseline)
  if (faces.length !== manifest.protectedCardFaces.length) fail()
  for (const [index, expected] of faces.entries()) {
    const record = manifest.protectedCardFaces[index]
    if (!object(record) || Object.entries(expected).some(([key, value]) => record[key] !== value) ||
        !exactKeys(record, [...Object.keys(expected), ...metadataKeys])) fail()
    const isLocal = record.oldUrl.startsWith('/')
    if (!validMetadata(record, isLocal)) fail()
    if (isLocal) { manifestLocalPath(record.oldUrl); local.push(record) }
  }
  return { local, critical: critical.length, background: background.length, protectedFaces: faces.length }
}
