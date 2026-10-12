import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { Plugin } from 'vite'

interface OptimizationRecord { source: string; url: string; sha256: string }

/** Drop only the exact 17 superseded PNG masters from owned build output, not source. */
export function pruneOptimizedMasters(root: string, outDir: string, records: OptimizationRecord[]) {
  const output = path.resolve(root, outDir)
  // No arbitrary outside paths, workspace roots, public source or source directories.
  if (output !== path.join(path.resolve(root), 'dist')) throw new Error('UNSAFE_OPTIMIZED_OUTPUT')
  if (records.length !== 17 || new Set(records.map(record => record.source)).size !== 17) throw new Error('INVALID_OPTIMIZATION_RECORDS')
  const files = records.map(record => {
    if (!/^\/cartoon\/ui\/themes\/(emotion-orbit|kindness-workshop)\/(logo-v2|backdrop-v3|primary-v3|secondary-v3|quiet-v3|menu-panel-v3|menu-panel-v4|table-v3|board-backdrop-v1)\.png$/.test(record.source) ||
        record.url !== record.source.replace(/\.png$/, '.webp')) throw new Error('UNSAFE_OPTIMIZED_ASSET')
    const replacement = path.join(output, record.url.slice(1))
    if (createHash('sha256').update(readFileSync(replacement)).digest('hex') !== record.sha256) throw new Error('MISSING_OPTIMIZED_REPLACEMENT')
    return path.join(output, record.source.slice(1))
  })
  // Validate every replacement before deleting any generated copy. PNG sources are recoverable in public/.
  let removed = 0
  for (const file of files) if (existsSync(file)) { unlinkSync(file); removed++ }
  return removed
}

export function optimizedBrandBuild(): Plugin {
  let root = '', outDir = ''
  return {
    name: 'emcoin-optimized-brand-output', apply: 'build',
    configResolved(config) { root = config.root; outDir = config.build.outDir },
    closeBundle() {
      const report = JSON.parse(readFileSync(path.join(root, 'src/assets/brandOptimization.json'), 'utf8'))
      pruneOptimizedMasters(root, outDir, report.records)
    },
  }
}
