/** Compatibility shape already accepted by the server's frozen-card resolver.
 * Unknown/missing IDs remain server decisions; never infer aliases or art. */
export function cardIdentity(card: object): { id?: string } {
  if (card && !Array.isArray(card) && Object.prototype.hasOwnProperty.call(card, 'id')) {
    const id = (card as { id?: unknown }).id
    if (typeof id === 'string') return { id }
  }
  return {}
}
