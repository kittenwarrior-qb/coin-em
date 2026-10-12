'use strict'
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const ts = require('typescript')

// Read-only build/test tooling. Evaluate ONLY these known repository sources, no network.
function readWebCardBaseline() {
  const root = path.resolve(__dirname, '../..')
  const filenames = ['fe/src/utils/cdnUrl.ts', 'fe/src/constants/cardImages.ts', 'fe/src/constants/cardCatalog.ts']
  const sources = filenames.map(filename => fs.readFileSync(path.join(root, filename), 'utf8'))
  const evaluate = (source, imports) => {
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const exports = {}
    new Function('require', 'exports', output)(name => {
      if (!Object.hasOwn(imports, name)) throw new Error('Unexpected baseline import')
      return imports[name]
    }, exports)
    return exports
  }
  const cdn = evaluate(sources[0], {})
  const images = evaluate(sources[1], { '@/utils/cdnUrl': cdn })
  const end = sources[2].indexOf('export const CARD_DATA = buildCards()')
  if (end < 0) throw new Error('Current card builder boundary changed; review baseline')
  const inventory = evaluate(sources[2].slice(0, end) + 'export const CARD_DATA = buildCards()', { '@/constants/cardImages': images })
  const cards = ['roles', 'situation', 'emotion', 'reflection', 'selfcare'].flatMap(key => inventory.CARD_DATA[key])
  if (cards.length !== 100 || new Set(cards.map(card => card.id)).size !== cards.length) throw new Error('Unexpected current-web card inventory')
  return {
    version: 'web-card-baseline/v1',
    source: 'existing-web-runtime-not-physical-catalog',
    sourceHashes: Object.fromEntries(filenames.map((filename, i) => [filename, crypto.createHash('sha256').update(sources[i].replace(/\r\n/g, '\n')).digest('hex')])),
    cards,
  }
}
module.exports = { readWebCardBaseline }
if (require.main === module) process.stdout.write(JSON.stringify(readWebCardBaseline(), null, 2) + '\n')
