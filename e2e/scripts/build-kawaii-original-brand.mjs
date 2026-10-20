import {readFile,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'

// Mechanical derivative, not a redraw: preserve every original artwork path,
// extrusion and embedded gradient image. Only remove the curved tagline texts.
const source=new URL('../../fe/public/logo.svg',import.meta.url)
const destination=new URL('../../fe/public/cartoon/ui/prototypes/kawaii/original-brand.svg',import.meta.url)
const original=await readFile(source,'utf8')
const taglines=original.match(/<text\b[\s\S]*?<\/text>/g)||[]
assert.equal(taglines.length,22,'Review source structure before regenerating')
const derivative=original.replace(/<text\b[\s\S]*?<\/text>/g,'')
  .replace('viewBox="0 0 419.62 354.36"','viewBox="0 0 419.62 315"')
assert.notEqual(derivative,original)
await writeFile(destination,derivative)
console.log(JSON.stringify({source:fileURLToPath(source),output:fileURLToPath(destination),removedTaglines:taglines.length,bytes:Buffer.byteLength(derivative)}))
