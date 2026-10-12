import { Role } from '../types'

export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 10
const base = [Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.CONNECTOR, Role.OPENER] as const
const decks: Readonly<Record<number, readonly Role[]>> = Object.freeze({
  5: Object.freeze([...base]),
  6: Object.freeze([...base, Role.GUIDE]),
  7: Object.freeze([...base, Role.GUIDE, Role.HEALER]),
  8: Object.freeze([Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.SILENCER, Role.CONNECTOR, Role.OPENER, Role.GUIDE, Role.HEALER]),
  9: Object.freeze([Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.SILENCER, Role.CONNECTOR, Role.CONNECTOR, Role.OPENER, Role.GUIDE, Role.HEALER]),
  10: Object.freeze([Role.NARRATOR, Role.SENDER, Role.SILENCER, Role.SILENCER, Role.CONNECTOR, Role.CONNECTOR, Role.OPENER, Role.OPENER, Role.GUIDE, Role.HEALER]),
})

/** Return a copy so shuffling/debug selection cannot change the approved deck. */
export function getRoleDeck(count: number): Role[] {
  if (!Number.isInteger(count) || !decks[count]) throw new Error(`Invalid player count: ${count}. Must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`)
  return [...decks[count]]
}
