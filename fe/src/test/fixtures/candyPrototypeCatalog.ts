import catalog from './pdfCatalog.json'

// Preserve the original PDF's IDs and explicitly paired front/back URLs.
export const prototypeCards = catalog.filter(card => !card.archived)
export type PrototypeCard = (typeof prototypeCards)[number]
export const cardCategories = { role: 'Vai trò', situation: 'Tình huống', emotion: 'Cảm xúc', reflection: 'Phản tư', selfcare: 'Bí kíp ôm' }
export function cardsForPhase(phase: string) {
  const category = phase === 'situation-card' ? 'situation' : phase === 'reflection-card' || phase === 'reflection-sharing' ? 'reflection' : phase === 'selfcare-card' || phase === 'hug-action' ? 'selfcare' : 'emotion'
  return prototypeCards.filter(card => card.category === category)
}
