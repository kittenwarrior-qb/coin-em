import { Room, GameAction, GameResult } from '../types'
import { ICommand } from './base/ICommand'

/**
 * Command: Give yellow or red coin to another player (give-coins phase)
 * - Giver loses 1 coin of the given type (yellow or red)
 * - Receiver gains 1 GREEN coin (all received coins convert to green)
 * - Green coins cannot be given directly
 */
export class GiveCoinCommand implements ICommand {
  execute(room: Room, action: GameAction): GameResult {
    const { targetId, data } = action
    const { coinType, amount = 1 } = data || {}

    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, error: 'Invalid coin amount' }
    }

    if (coinType === 'green') {
      return { success: false, error: 'Cannot give green coins' }
    }

    if (action.actorId === targetId) {
      return { success: false, error: 'Cannot give coin to self' }
    }

    const giver = room.players.find((p) => p.userId === action.actorId)
    const receiver = room.players.find((p) => p.userId === targetId)

    if (!giver || !receiver) {
      return { success: false, error: 'PLAYER_NOT_FOUND' }
    }

    if (coinType === 'red' && giver.coins.red < amount) {
      return { success: false, error: 'Insufficient red coins' }
    }
    if (coinType === 'yellow' && giver.coins.yellow < amount) {
      return { success: false, error: 'Insufficient yellow coins' }
    }

    // Track giving
    const redCoinsGiven = { ...room.redCoinsGiven }
    const yellowCoinsGiven = { ...room.yellowCoinsGiven }

    if (coinType === 'red') {
      if (!redCoinsGiven[action.actorId]) redCoinsGiven[action.actorId] = {}
      redCoinsGiven[action.actorId][targetId!] =
        (redCoinsGiven[action.actorId][targetId!] || 0) + amount
    }

    if (coinType === 'yellow') {
      if (!yellowCoinsGiven[action.actorId]) yellowCoinsGiven[action.actorId] = {}
      yellowCoinsGiven[action.actorId][targetId!] =
        (yellowCoinsGiven[action.actorId][targetId!] || 0) + amount
    }

    // Giver loses the coin type given; receiver gains GREEN coins
    const updatedPlayers = room.players.map((p) => {
      if (p.userId === action.actorId) {
        return { ...p, coins: { ...p.coins, [coinType]: p.coins[coinType as 'red' | 'yellow'] - amount } }
      }
      if (p.userId === targetId) {
        return { ...p, coins: { ...p.coins, green: p.coins.green + amount } }
      }
      return p
    })

    return {
      success: true,
      room: {
        ...room,
        players: updatedPlayers,
        redCoinsGiven,
        yellowCoinsGiven,
        lastActivity: Date.now(),
        gameLog: [
          ...room.gameLog,
          {
            type: 'GIVE_COIN',
            actorId: action.actorId,
            targetId,
            timestamp: Date.now(),
            data: { coinType, amount, receiverGainsGreen: amount },
          },
        ],
      },
    }
  }
}
