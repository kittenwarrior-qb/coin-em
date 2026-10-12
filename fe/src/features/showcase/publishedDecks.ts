import type { CatalogCard } from '@/features/admin/catalogClient'
const labels = { role: 'Vai trò', situation: 'Tình huống', emotion: 'Cảm xúc', reflection: 'Phản tư', selfcare: 'Bí kíp ôm' }
export function publishedShowcaseDecks(cards: CatalogCard[]) {
  return (Object.keys(labels) as CatalogCard['category'][]).map(category => {
    const entries = cards.filter(card => card.category === category)
    return { id: category, label: labels[category], count: entries.length,
      cards: entries.map(card => ({ title: card.name, group: card.group || category, front: card.frontImageUrl, back: card.backImageUrl })) }
  })
}
