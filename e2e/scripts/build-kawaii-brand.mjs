import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {stat} from 'node:fs/promises'
const sharp=createRequire(new URL('../../fe/package.json',import.meta.url))('sharp')
const source=new URL('../../fe/public/cartoon/ui/themes/candy-clouds/coin-mark.svg',import.meta.url)
const target=new URL('../../fe/public/cartoon/ui/themes/candy-clouds/coin-mark.webp',import.meta.url)
// Faithful encoding of the approved original coin paths, sized for a 2× phone header.
await sharp(fileURLToPath(source)).resize({width:720,withoutEnlargement:false}).webp({quality:92,effort:6}).toFile(fileURLToPath(target))
console.log(JSON.stringify({sourceBytes:(await stat(source)).size,webpBytes:(await stat(target)).size}))
