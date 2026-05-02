import { Room, GameAction, Role } from '../types'

export class ActionValidator {
  /**
   * Validate if action can be executed
   */
  validate(room: Room, action: GameAction): { valid: boolean; error?: string } {
    // Find actor
    const actor = room.players.find((p) => p.userId === action.actorId)
    if (!actor) {
      return { valid: false, error: 'Actor not found' }
    }

    // Validate based on action type
    switch (action.type) {
      case 'SILENCE':
        return this.validateSilence(room, actor, action)
      case 'HEAL':
        return this.validateHeal(room, actor, action)
      case 'SELECT_CARD':
        return this.validateSelectCard(room, actor, action)
      case 'SELECT_SELFCARE_CARD':
        return this.validateSelectSelfcareCard(room, actor, action)
      case 'GIVE_COIN':
        return this.validateGiveCoin(room, actor, action)
      case 'VOTE':
        return this.validateVote(room, actor, action)
      default:
        return { valid: false, error: 'Unknown action type' }
    }
  }

  /**
   * Validate silence action
   */
  private validateSilence(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be night phase
    if (room.phase !== 'night') {
      return { valid: false, error: 'Not night phase' }
    }

    // Actor must be silencer
    if (actor.role !== Role.SILENCER) {
      return { valid: false, error: 'Not a silencer' }
    }

    // Check idempotency - already silenced someone
    if (room.nightActions?.silenced) {
      return { valid: false, error: 'ACTION_ALREADY_DONE' }
    }

    // Target must exist
    if (!action.targetId) {
      return { valid: false, error: 'No target specified' }
    }

    const target = room.players.find((p) => p.userId === action.targetId)
    if (!target) {
      return { valid: false, error: 'Target not found' }
    }

    // Cannot silence self
    if (action.targetId === action.actorId) {
      return { valid: false, error: 'Cannot silence self' }
    }

    return { valid: true }
  }

  /**
   * Validate heal action
   */
  private validateHeal(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be night phase
    if (room.phase !== 'night') {
      return { valid: false, error: 'Not night phase' }
    }

    // Actor must be healer
    if (actor.role !== Role.HEALER) {
      return { valid: false, error: 'Not a healer' }
    }

    // Check idempotency - already healed someone
    if (room.nightActions?.healed) {
      return { valid: false, error: 'ACTION_ALREADY_DONE' }
    }

    // Target must exist
    if (!action.targetId) {
      return { valid: false, error: 'No target specified' }
    }

    const target = room.players.find((p) => p.userId === action.targetId)
    if (!target) {
      return { valid: false, error: 'Target not found' }
    }

    return { valid: true }
  }

  /**
   * Validate select card action (NTG draws situation card)
   */
  private validateSelectCard(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Actor must be sender
    if (!actor.isSender) {
      return { valid: false, error: 'Not a sender' }
    }

    // Must have card data
    if (!action.data?.card) {
      return { valid: false, error: 'No card data' }
    }

    return { valid: true }
  }

  /**
   * Validate select selfcare card action (Guide selects during night)
   */
  private validateSelectSelfcareCard(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be night phase
    if (room.phase !== 'night') {
      return { valid: false, error: 'Not night phase' }
    }

    // Actor must be guide
    if (actor.role !== Role.GUIDE) {
      return { valid: false, error: 'Not a guide' }
    }

    // Check idempotency - already selected card
    if (room.nightActions?.cardSelected) {
      return { valid: false, error: 'ACTION_ALREADY_DONE' }
    }

    // Must have card data
    if (!action.data?.card) {
      return { valid: false, error: 'No card data' }
    }

    return { valid: true }
  }

  /**
   * Validate give coin action
   */
  private validateGiveCoin(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be day phase (any day sub-phase)
    const dayPhases = ['day-draw', 'day-emotion', 'day-story', 'reflection', 'selfcare']
    if (!dayPhases.includes(room.phase)) {
      return { valid: false, error: 'Not day phase' }
    }

    // Target must exist
    if (!action.targetId) {
      return { valid: false, error: 'No target specified' }
    }

    const target = room.players.find((p) => p.userId === action.targetId)
    if (!target) {
      return { valid: false, error: 'Target not found' }
    }

    // Cannot give coin to self
    if (action.targetId === action.actorId) {
      return { valid: false, error: 'Cannot give coin to self' }
    }

    // Must have coin type
    if (!action.data?.coinType) {
      return { valid: false, error: 'No coin type specified' }
    }

    // Check coin limit - max 1 of each type per person
    const MAX_PER_TYPE = 1
    const given = room.coinsGiven?.[actor.userId]?.[action.targetId]
    if (given && given[action.data.coinType as keyof typeof given] >= MAX_PER_TYPE) {
      return { valid: false, error: 'COIN_LIMIT_REACHED' }
    }

    return { valid: true }
  }

  /**
   * Validate vote action
   */
  private validateVote(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be guess-role phase
    if (room.phase !== 'guess-role') {
      return { valid: false, error: 'NOT_VOTE_PHASE' }
    }

    // Check if already voted
    if (room.votes && room.votes[actor.userId]) {
      return { valid: false, error: 'ALREADY_VOTED' }
    }

    // Target must exist
    if (!action.targetId) {
      return { valid: false, error: 'No target specified' }
    }

    const target = room.players.find((p) => p.userId === action.targetId)
    if (!target) {
      return { valid: false, error: 'Target not found' }
    }

    return { valid: true }
  }

  /**
   * Check if player can advance turn
   */
  canAdvanceTurn(room: Room, userId: string): boolean {
    return room.currentNarrator === userId
  }
}
