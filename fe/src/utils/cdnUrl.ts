/**
 * Injects Cloudinary transformation params into an upload URL.
 * Handles both plain upload URLs and already-transformed URLs (idempotent).
 *
 * Example:
 *   cdnUrl('f_auto,q_auto:best,w_600', 'https://res.cloudinary.com/.../upload/v123/img.png')
 *   → 'https://res.cloudinary.com/.../upload/f_auto,q_auto:best,w_600/v123/img.png'
 */
export function cdnUrl(transforms: string, url: string): string {
  // Already has transforms injected — skip
  if (url.includes('/upload/f_')) return url
  return url.replace('/upload/', `/upload/${transforms}/`)
}

// Presets matching actual render sizes
export const CDN_FRONT = (url: string) => cdnUrl('f_auto,q_auto:best,w_600', url) // card fronts, max 70vw flip
export const CDN_BACK  = (url: string) => cdnUrl('f_auto,q_auto:best,w_300', url) // card backs / thumbnails
export const CDN_COIN  = (url: string) => cdnUrl('f_auto,q_auto:best,w_80',  url) // coins rendered at 25px

/**
 * Applies CDN transforms to every URL in a CARD_IMAGES-shaped object.
 * - Keys named 'back' or ending in 'back' → CDN_BACK
 * - Keys 'front' or coin values → CDN_FRONT / CDN_COIN
 * - Plain string values (role/situation/etc card fronts) → CDN_FRONT
 */
export function applyCardTransforms<T>(obj: T, isCoin = false): T {
  if (typeof obj === 'string') {
    return (isCoin ? CDN_COIN(obj) : CDN_FRONT(obj)) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map(item => applyCardTransforms(item)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
        if (k === 'back') return [k, typeof v === 'string' ? CDN_BACK(v) : applyCardTransforms(v)]
        if (k === 'front') return [k, typeof v === 'string' ? CDN_FRONT(v) : applyCardTransforms(v)]
        return [k, applyCardTransforms(v, isCoin)]
      })
    ) as unknown as T
  }
  return obj
}
