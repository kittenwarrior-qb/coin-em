import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const hash = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex')

/** Offline scope is deliberately smaller than the application shell. */
export function publicGuidePwa(): Plugin {
  let root = '', base = '/'
  return {
    name: 'emcoin-public-guide-pwa', apply: 'build',
    configResolved(config) {
      root = config.root; base = config.base
      if (!base.startsWith('/') || !base.endsWith('/') || base.includes('?') || base.includes('#')) throw new Error('PWA requires an absolute same-origin directory base')
    },
    generateBundle(_, bundle) {
      const manifest = JSON.stringify({ id: base, name: 'EmCoin — Hành trình cảm xúc', short_name: 'EmCoin', lang: 'vi',
        start_url: base, scope: base, display: 'standalone', background_color: '#fff4dc', theme_color: '#fff4dc',
        description: 'Chơi EmCoin khi có mạng; chỉ đọc hướng dẫn công khai khi ngoại tuyến.',
        icons: [{ src: `${base}logo.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] })
      const worker = readFileSync(path.join(root, 'pwa/worker.js'), 'utf8')
      const assets = ['offline.html', 'logo.svg'].map(file => ({ path: file, hash: hash(readFileSync(path.join(root, 'public', file))) }))
      assets.push({ path: 'manifest.webmanifest', hash: hash(manifest) })
      const application = Object.keys(bundle).sort().map(key => {
        const entry = bundle[key]
        return `${key}:${hash(entry.type === 'chunk' ? entry.code : entry.source)}`
      }).join('\n')
      const config = { prefix: `emcoin-public-guide-${hash(base).slice(0, 12)}-`, version: hash(worker + manifest + JSON.stringify(assets) + application).slice(0, 24), assets }
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest })
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `const CONFIG = ${JSON.stringify(config)};\n${worker}` })
    },
  }
}
