import { Room, GameAction, GameResult } from '../../types'

/**
 * Base interface for all game commands
 * Each command encapsulates a specific game action
 */
export interface ICommand {
  execute(room: Room, action: GameAction): GameResult
}
