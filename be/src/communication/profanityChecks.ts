/** Original, deliberately small vocabulary. No copied third-party dictionary,
 * dynamic regex, network request, semantic classifier or client-controlled exception.
 * Changes require reviewing the vocabulary and its benign regression corpus.
 */
export const PROFANITY_POLICY_VERSION = 'chat-profanity-seed/v1'
const english = Object.freeze([
  'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking', 'motherfucker', 'motherfuckers',
  'shit', 'shitty', 'bullshit', 'asshole', 'assholes', 'cunt', 'cunts', 'dickhead', 'dickheads', 'son of a bitch',
])
const vietnamese = Object.freeze(['địt', 'đụ', 'đéo', 'cặc', 'lồn', 'địt mẹ', 'đụ má', 'đụ mẹ'])
const aliases: Readonly<Record<string, string>> = Object.freeze({ a: '[a@4]', e: '[e3]', i: '[i1!|]', o: '[o0]', s: '[s$5]', t: '[t7]', u: '[uv]' })
const escape = (character: string) => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// After canonicalize(), every non-letter/number/mark is ' ' (whitespace), '.' (anything else) or a leet character.
const separator = '[ .@$!|]', wordCharacter = '[^ .@$!|]'
function compile(term: string, leet: boolean): RegExp {
  const parts = term.split(' ').map(word => [...word].map(character => leet ? aliases[character] ?? escape(character) : escape(character))
    .join(`${separator}{0,3}`))
  // Unicode boundaries, not ASCII \b; no /g so repeated .test calls are stable.
  // Small ASCII classes only: one \p{…} class per pattern made V8 spend seconds on non-Latin-1 text such as "đ".
  return new RegExp(`(?<!${wordCharacter})${parts.join(' {1,3}')}(?!${wordCharacter})`, 'u')
}
const englishPatterns = english.map(term => compile(term, true))
const vietnamesePatterns = vietnamese.map(term => compile(term, false))
const canonicalize = (text: string) => text.replace(/\s/gu, ' ').replace(/[^\p{L}\p{N}\p{M} @$!|]/gu, '.')

/** Only the upstream, at-most-500-character chat body is inspected. Original text is untouched. */
export function containsCuratedProfanity(text: string): boolean {
  const inspected = canonicalize(text.normalize('NFKC').toLowerCase().replace(/[​-‍⁠﻿]/gu, ''))
  // English accent camouflage only. Never strip Vietnamese accents: đụ != đu/du.
  const englishView = inspected.normalize('NFD').replace(/\p{M}/gu, '')
  return englishPatterns.some(pattern => pattern.test(englishView)) || vietnamesePatterns.some(pattern => pattern.test(inspected))
}
