import manifest from '@/assets/pdfDeckAssets.json'
const dimensions = new Map(manifest.records.map(record => [record.url, `${record.width} / ${record.height}`]))
export function pdfCardAspect(url: string): string | undefined { return dimensions.get(url) }
export function cardImageFit(url: string): 'contain' | 'cover' { return dimensions.has(url) ? 'contain' : 'cover' }
