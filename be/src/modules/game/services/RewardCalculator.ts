import { Room, Role } from '../types'

/**
 * End-of-round reward logic (applied when entering 'reward' phase).
 *
 * Immediate bonuses (applied during the round, NOT here):
 *   - NTG share reflection → +5 yellow (ShareReflectionCommand)
 *   - NTG vote best responder → +5 yellow per voted player (NTGVoteCommand)
 *
 * End-of-round bonuses (applied here):
 *   - Người Kết Nối / Người Gợi Mở:
 *       NOT muted AND responded → +2 yellow
 *       muted → 0 (bị im lặng, không được thưởng)
 *   - Người Dẫn Lối:
 *       NOT muted AND completed role (rút thẻ bí kíp) AND responded → +2 yellow
 *       muted → 0
 *   - Người Im Lặng:
 *       not found by vote → +7 yellow
 *       found by vote → +2 yellow
 *   - Correct silencer guessers:
 *       table found silencer -> +N green (N = player count)
 *       table missed silencer -> +(N-3) green, min 0
 */
export class RewardCalculator {
  calculateRewards(room: Room): Room {
    const playerCount = room.players.length
    const silencer = room.players.find((p) => p.originalRole === Role.SILENCER)
    const guide = room.players.find((p) => p.originalRole === Role.GUIDE)

    // Determine if silencer was correctly identified (majority vote)
    const voteCounts: Record<string, number> = {}
    Object.values(room.votes).forEach((id) => {
      voteCounts[id] = (voteCounts[id] || 0) + 1
    })
    let mostVotedId: string | null = null
    let maxVotes = 0
    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) { maxVotes = count; mostVotedId = id }
    })
    const silencerFound = mostVotedId === silencer?.userId
    const correctGuesserIds = Object.entries(room.votes)
      .filter(([, targetId]) => targetId === silencer?.userId)
      .map(([voterId]) => voterId)
    const greenGuessBonus = silencerFound ? playerCount : Math.max(0, playerCount - 3)
    const silencerYellowBonus = silencerFound ? 2 : 7

    // Who was muted this round (silencer's target, unless healed)
    const mutedUserId = room.mutedPlayer // null if healed or no silence

    // Collect all players voted by NTG (already received +5 from NTGVoteCommand)
    const ntgVotedIds = new Set<string>(
      Object.values(room.ntgVotes ?? {}).flat()
    )
    const roleRewardedIds = new Set<string>(
      room.gameLog
        .filter((entry) => entry.type === 'ROLE_REWARD' && entry.targetId)
        .map((entry) => entry.targetId as string)
    )

    const updatedPlayers = room.players.map((p) => {
      let yellowBonus = 0
      let greenBonus = 0

      const isMuted = p.userId === mutedUserId
      const wasNtgVoted = ntgVotedIds.has(p.userId)
      const wasRoleRewarded = roleRewardedIds.has(p.userId)

      // ── Người Kết Nối / Người Gợi Mở ────────────────────────────────────────
      if (p.originalRole === Role.CONNECTOR || p.originalRole === Role.OPENER) {
        if (!isMuted && room.responses?.[p.userId] && !wasRoleRewarded) {
          // Only +2 if NOT already voted by NTG (NTGVoteCommand already gave +5)
          if (!wasNtgVoted) {
            yellowBonus += 2
          }
        }
        // muted → no bonus (bị im lặng)
      }

      // ── Người Dẫn Lối ────────────────────────────────────────────────────────
      if (p.originalRole === Role.GUIDE) {
        const completedRole = room.nightActions?.cardSelected
        if (!isMuted && completedRole && room.responses?.[p.userId] && !wasRoleRewarded) {
          // Only +2 if NOT already voted by NTG (NTGVoteCommand already gave +5)
          if (!wasNtgVoted) {
            yellowBonus += 2
          }
        }
        // muted → no bonus
      }

      // ── Người Im Lặng ────────────────────────────────────────────────────────
      if (p.originalRole === Role.SILENCER) {
        yellowBonus += silencerYellowBonus
      }

      // Correct guessers receive green coins for finding the silencer.
      if (correctGuesserIds.includes(p.userId)) {
        greenBonus += greenGuessBonus
      }

      return {
        ...p,
        coins: {
          ...p.coins,
          yellow: Math.max(0, p.coins.yellow + yellowBonus),
          green: p.coins.green + greenBonus,
        },
      }
    })

    return {
      ...room,
      players: updatedPlayers,
      gameLog: [
        ...room.gameLog,
        {
          type: 'REWARDS_CALCULATED',
          actorId: 'system',
          timestamp: Date.now(),
          data: {
            silencerFound,
            silencerId: silencer?.userId,
            mutedPlayerId: mutedUserId,
            silencerYellowBonus,
            greenGuessBonus,
            correctGuesserIds,
          },
        },
      ],
    }
  }
}
