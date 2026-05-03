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
      case 'SEND_RESPONSE':
        return this.validateSendResponse(room, actor, action)
      case 'NTG_VOTE':
        return this.validateNTGVote(room, actor, action)
      case 'SHARE_REFLECTION':
        return this.validateShareReflection(room, actor, action)
      default:
        return { valid: false, error: 'Unknown action type' }
    }
  }

  /**
   * Validate silence action
   */
  private validateSilence(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be silencer-turn phase
    if (room.phase !== 'silencer-turn') {
      return { valid: false, error: 'Not silencer turn' }
    }

    // Actor must be silencer (check originalRole)
    if (actor.originalRole !== Role.SILENCER) {
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
    // Must be healer-turn phase
    if (room.phase !== 'healer-turn') {
      return { valid: false, error: 'Not healer turn' }
    }

    // Actor must be healer (check originalRole)
    if (actor.originalRole !== Role.HEALER) {
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
   * Validate select selfcare card action
   * Actor: Người Dẫn Lối (Guide) nếu có trong round, ngược lại NTG (Sender) bốc thay
   */
  private validateSelectSelfcareCard(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be selfcare-card phase
    if (room.phase !== 'selfcare-card') {
      return { valid: false, error: 'Not selfcare-card phase' }
    }

    // Check idempotency - already selected card
    if (room.nightActions?.cardSelected) {
      return { valid: false, error: 'ACTION_ALREADY_DONE' }
    }

    // Must have card data
    if (!action.data?.card) {
      return { valid: false, error: 'No card data' }
    }

    // Determine who is allowed to draw:
    // Guide (originalRole) if present in this round, otherwise NTG (isSender)
    const guideInRound = room.players.find(
      (p) => p.originalRole === Role.GUIDE && !p.isFake
    )

    if (guideInRound) {
      // Guide must draw
      if (actor.originalRole !== Role.GUIDE) {
        return { valid: false, error: 'Only Guide can draw selfcare card this round' }
      }
    } else {
      // No Guide → NTG draws
      if (!actor.isSender) {
        return { valid: false, error: 'Only NTG can draw selfcare card when no Guide is present' }
      }
    }

    return { valid: true }
  }

  /**
   * Validate give coin action
   * UPDATED: Support flexible amounts, multiple recipients
   */
  private validateGiveCoin(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be give-coins phase
    if (room.phase !== 'give-coins') {
      return { valid: false, error: 'Not give-coins phase' }
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

    const coinType = action.data.coinType
    const amount = action.data.amount || 1

    // Cannot give green coins
    if (coinType === 'green') {
      return { valid: false, error: 'Cannot give green coins' }
    }

    // Check if actor has enough coins
    if (coinType === 'red' && actor.coins.red < amount) {
      return { valid: false, error: 'Insufficient red coins' }
    }

    if (coinType === 'yellow' && actor.coins.yellow < amount) {
      return { valid: false, error: 'Insufficient yellow coins' }
    }

    return { valid: true }
  }

  /**
   * Validate vote action
   */
  private validateVote(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be guess-silencer phase
    if (room.phase !== 'guess-silencer') {
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

  /**
   * Validate send response action
   */
  private validateSendResponse(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be group-response phase
    if (room.phase !== 'group-response') {
      return { valid: false, error: 'Not group-response phase' }
    }

    // Must have message
    if (!action.data?.message) {
      return { valid: false, error: 'No message provided' }
    }

    return { valid: true }
  }

  /**
   * Validate NTG vote (best responder) in group-response phase
   */
  private validateNTGVote(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    if (room.phase !== 'group-response') {
      return { valid: false, error: 'Not group-response phase' }
    }
    if (!actor.isSender) {
      return { valid: false, error: 'ONLY_NTG_CAN_VOTE' }
    }
    if (!action.targetId) {
      return { valid: false, error: 'No target specified' }
    }
    const target = room.players.find((p) => p.userId === action.targetId)
    if (!target) {
      return { valid: false, error: 'Target not found' }
    }
    if (action.targetId === action.actorId) {
      return { valid: false, error: 'Cannot vote for self' }
    }
    // Check duplicate vote for same target (array format)
    const existing: string[] = (room.ntgVotes as any)?.[actor.userId] ?? []
    if (existing.includes(action.targetId)) {
      return { valid: false, error: 'ALREADY_VOTED_FOR_THIS_PLAYER' }
    }
    return { valid: true }
  }

  /**
   * Validate share reflection (NTG shares in reflection-sharing phase)
   */
  private validateShareReflection(room: Room, actor: any, action: GameAction): { valid: boolean; error?: string } {
    // Must be reflection-sharing phase
    if (room.phase !== 'reflection-sharing') {
      return { valid: false, error: 'Not reflection-sharing phase' }
    }

    // Only NTG can share
    if (!actor.isSender) {
      return { valid: false, error: 'ONLY_NTG_CAN_SHARE' }
    }

    return { valid: true }
  }
}
