// Conservative metadata only. Protection never implies licensing or runtime coverage.
export function classifyAsset(url, sourceFiles = []) {
  const sourceProtection = sourceFiles.some(file => file === 'src/constants/cardImages.ts' || file === 'src/pages/characterModels.ts' || file === 'src/components/game/GuideBook.tsx')
  let pathname
  try { pathname = decodeURIComponent(new URL(url, 'https://inventory.invalid').pathname) } catch { return 'review-required' }
  if (sourceProtection || /^\/(?:cards|card-showcase|tutorial|stickers|models)(?:\/|$)/.test(pathname)) return 'protected-card-related'
  if (url.startsWith('/') && !url.startsWith('//') && /^\/cartoon\/(?:buttons|ui)\//.test(pathname)) return 'ui-reskin-candidate'
  return 'review-required'
}

export function protectedCardFaces(baseline) {
  if (baseline.version !== 'web-card-baseline/v1' || baseline.cards.length !== 100 || new Set(baseline.cards.map(card => card.id)).size !== 100) throw new Error('Unexpected frozen web catalog; review required')
  return baseline.cards.flatMap(card => ['front', 'back'].map(face => {
    const url = card[`${face}Image`]
    if (typeof url !== 'string' || !url) throw new Error('Missing frozen face; review required')
    return { logicalId: `${card.id}:${face}`, cardId: card.id, face, oldUrl: url, newUrl: null,
      scope: 'protected-card-related', reskinStatus: 'excluded-owner-protection',
      rights: 'owner-declared-deck-IP-not-independent-license-verification',
      cache: 'on-demand-not-PWA-cache', fallback: null, crop: 'unchanged' }
  }))
}
