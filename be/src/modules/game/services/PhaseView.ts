import type { Room } from '../types'
import { Role } from '../types'
import { PHASE_ORDER, phaseApplies, nextPhase, previousPhase } from '../engine/PhaseRegistry'
import { ActionValidator } from '../engine/ActionValidator'
import { validateCardSelection } from './CardCatalog'
import baseline from '../../../constants/webCardBaseline.json'
import { runtimeCatalog, LEGACY_CATALOG_VERSION } from '../../../catalog/runtimeCatalog'

const validator = new ActionValidator()

/** Presentation hint only. Every command is still authorized against fresh state. */
export function phaseView(room: Room, viewerId?: string) {
  const known = room.phase === 'ended' || PHASE_ORDER.includes(room.phase)
  if (!known) return null
  const applicable = PHASE_ORDER.filter(phase => phaseApplies(phase, room))
  const playing = room.status === 'playing' && room.phase !== 'ended'
  const actor = viewerId ? room.players.find(player => player.userId === viewerId) : undefined
  const activeActor = playing && actor && !actor.isDisconnected ? actor : undefined
  const allowed = (type: 'HEAL' | 'SILENCE' | 'VOTE') => Boolean(activeActor && room.players.some(target =>
    validator.validate(room, { type, actorId: activeActor.userId, targetId: target.userId }).valid))
  const catalog = !activeActor || !room.phase.endsWith('-card') ? []
    : room.catalogVersion && room.catalogVersion !== LEGACY_CATALOG_VERSION ? runtimeCatalog(room.catalogVersion) ?? [] : baseline.cards
  const select = (category: string, type: 'SELECT_CARD' | 'SELECT_SELFCARE_CARD' = 'SELECT_CARD') => Boolean(activeActor && room.phase === `${category}-card` && catalog.some(card =>
    card.category === category && validateCardSelection(room, { type, actorId: activeActor.userId, data: { card: { id: card.id } } }).valid))
  const permission = Boolean(activeActor && validator.canAdvanceTurn(room, activeActor.userId))
  const previous = playing ? previousPhase(room.phase, room) : null
  const locked = Boolean(room.coinCycle && (room.coinCycle.closed || room.coinCycle.transfers.length > 0))
  return {
    version: 'phase-view/v1' as const,
    phase: room.phase,
    position: room.phase === 'ended' ? null : applicable.indexOf(room.phase) + 1 || null,
    total: applicable.length,
    next: playing ? nextPhase(room.phase, room) : null,
    previous: previous === room.phase ? null : previous,
    capabilities: {
      advance: permission,
      rollback: permission && !locked && previous !== null && previous !== room.phase,
      heal: allowed('HEAL'),
      silence: allowed('SILENCE'),
      selectSituation: select('situation'),
      selectEmotion: select('emotion'),
      selectReflection: select('reflection'),
      selectSelfcare: select('selfcare', 'SELECT_SELFCARE_CARD'),
      guessSilencer: allowed('VOTE'),
      // Own already-visible role only; no other seat's identity/capability map.
      isHealer: Boolean(actor && actor.originalRole === Role.HEALER),
      isSilencer: Boolean(actor && actor.originalRole === Role.SILENCER),
    },
  }
}
