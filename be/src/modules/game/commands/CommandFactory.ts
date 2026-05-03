import { GameAction } from '../types'
import { ICommand } from './base/ICommand'
import { SilenceCommand } from './SilenceCommand'
import { HealCommand } from './HealCommand'
import { VoteCommand } from './VoteCommand'
import { SelectCardCommand } from './SelectCardCommand'
import { SelectSelfcareCardCommand } from './SelectSelfcareCardCommand'
import { GiveCoinCommand } from './GiveCoinCommand'
import { SendResponseCommand } from './SendResponseCommand'
import { NTGVoteCommand } from './NTGVoteCommand'
import { ShareReflectionCommand } from './ShareReflectionCommand'

/**
 * Factory for creating command instances based on action type
 * Replaces switch-case in GameEngine
 */
export class CommandFactory {
  private commands: Map<string, ICommand>

  constructor() {
    this.commands = new Map([
      ['SILENCE', new SilenceCommand()],
      ['HEAL', new HealCommand()],
      ['VOTE', new VoteCommand()],
      ['SELECT_CARD', new SelectCardCommand()],
      ['SELECT_SELFCARE_CARD', new SelectSelfcareCardCommand()],
      ['GIVE_COIN', new GiveCoinCommand()],
      ['SEND_RESPONSE', new SendResponseCommand()],
      ['NTG_VOTE', new NTGVoteCommand()],
      ['SHARE_REFLECTION', new ShareReflectionCommand()],
    ])
  }

  getCommand(action: GameAction): ICommand | null {
    return this.commands.get(action.type) || null
  }
}
