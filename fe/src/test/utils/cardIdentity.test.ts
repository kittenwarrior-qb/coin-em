import { expect, it } from 'vitest'
import { cardIdentity } from '@/features/game/selectors/cardIdentity'
import { CARD_DATA } from '@/constants/cardCatalog'

it('sends only the exact own ID without changing any original card or face pairing', () => {
  for (const cards of [CARD_DATA.roles, CARD_DATA.situation, CARD_DATA.emotion, CARD_DATA.reflection, CARD_DATA.selfcare]) {
    for (const card of cards) {
      const before = JSON.stringify(card)
      expect(cardIdentity(card)).toEqual({ id: card.id })
      expect(JSON.stringify(card)).toBe(before)
    }
  }
})
it('does not read unrelated getters or send URL/text/category/private extras', () => {
  const card = { id: 'situation-TH1', get frontImage() { throw new Error('must not read image') },
    category: 'situation', message: 'synthetic-extra', nested: { token: 'synthetic-token' } }
  expect(cardIdentity(card)).toEqual({ id: 'situation-TH1' })
})
it('preserves unknown IDs and documented raw aliases rather than guessing or rewriting them', () => {
  for (const id of ['TH1', 'PT1', 'unknown-fixture', 'x'.repeat(65)]) expect(cardIdentity({ id })).toEqual({ id })
})
it.each([{}, { id: 1 }, { id: null }, Object.create({ id: 'TH1' }), ['TH1']])('does not infer a valid ID for unsupported object %j', card => {
  expect(cardIdentity(card)).toEqual({})
})
