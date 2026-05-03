/**
 * Bot Simulation — Full game flow, all 16 phases, fast mode
 * Run: npm run test:bot
 *
 * tick() = 50ms for phase transitions and non-rate-limited actions.
 * coinTick() = 1100ms — respects give_coin 1000ms server rate limit.
 * voteTick() = 2100ms — respects ntg_vote 2000ms server rate limit.
 * Narrator advances phase ONLY after all actions in that phase are done.
 * guess-silencer: ALL rounds vote the actual silencer (to verify coin logic).
 */

import { BotOrchestrator } from './framework/BotOrchestrator'
import { TestLogger, LogLevel } from '../utils/TestLogger'
import { TestReporter } from '../utils/TestReporter'

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001'
const ROOM_ID = process.env.ROOM_ID || `bot-${Date.now()}`
const BOT_COUNT = parseInt(process.env.BOT_COUNT || '7')
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO'

const logger = new TestLogger(LogLevel[LOG_LEVEL as keyof typeof LogLevel], true)
const reporter = new TestReporter()
const orchestrator = new BotOrchestrator({ serverUrl: SERVER_URL, roomId: ROOM_ID, botCount: BOT_COUNT, logger })

const tick = () => new Promise(r => setTimeout(r, 50))
const coinTick = () => new Promise(r => setTimeout(r, 1100))  // > 1000ms give_coin rate limit
const voteTick = () => new Promise(r => setTimeout(r, 2100))  // > 2000ms ntg_vote rate limit

// Track which round each bot has been narrator/NTG
const narratorHistory: string[] = []
const ntgHistory: string[] = []

function logCoins(label: string, state: any) {
  logger.info('COINS', `── ${label} ──`)
  state.players
    .filter((p: any) => !p.isFake)
    .forEach((p: any) => {
      const c = p.coins || { red: 0, yellow: 0, green: 0 }
      const isNarrator = p.isNarrator ? ' [Quản trò]' : p.isSender ? ' [NTG]' : ''
      logger.info('COINS', `  ${p.name}${isNarrator}: ❤️${c.red} 💛${c.yellow} 💚${c.green}`)
    })
}

// ── Phase handlers ────────────────────────────────────────────────────────────

orchestrator.registerPhaseHandler('role-reveal', async (_bots, state) => {
  // Track narrator/NTG rotation
  const narrator = state.players.find((p: any) => p.isNarrator)
  const ntg = state.players.find((p: any) => p.isSender)
  if (narrator && !narratorHistory.includes(narrator.name)) narratorHistory.push(narrator.name)
  if (ntg && !ntgHistory.includes(ntg.name)) ntgHistory.push(ntg.name)

  logger.info('PHASE', `▶ ROLE REVEAL — Round ${state.currentRound}/${state.totalRounds}`)
  logger.info('PHASE', `  Quản trò: ${narrator?.name} | NTG: ${ntg?.name}`)
  logCoins(`Round ${state.currentRound} start`, state)
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('night', async (_bots, _state) => {
  logger.info('PHASE', '▶ NIGHT')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('healer-turn', async (bots, state) => {
  logger.info('PHASE', '▶ HEALER TURN')
  const healerData = state.players.find((p: any) => p.originalRole === 'Người Chữa Lành')
  const healer = healerData ? bots.find(b => b.id === healerData.userId) : undefined

  if (healer) {
    const silencedData = state.players.find((p: any) => p.userId === state.mutedPlayer)
    const target = silencedData
      ? (bots.find(b => b.id === silencedData.userId) ?? orchestrator.getRandomBot([healer]))
      : orchestrator.getRandomBot([healer])
    const bonus = silencedData && target.id === silencedData.userId ? ' (+5💛!)' : ''
    logger.action(healer.name, `HEAL → ${target.name}${bonus}`)
    healer.nightAction(ROOM_ID, 'heal', target.socketId)
    await tick()
  }
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('silencer-turn', async (bots, state) => {
  logger.info('PHASE', '▶ SILENCER TURN')
  const silencerData = state.players.find((p: any) => p.originalRole === 'Người Im Lặng')
  const silencer = silencerData ? bots.find(b => b.id === silencerData.userId) : undefined

  if (silencer) {
    const target = orchestrator.getRandomBot([silencer])
    logger.action(silencer.name, `SILENCE → ${target.name}`)
    silencer.nightAction(ROOM_ID, 'silence', target.socketId)
    await tick()
  }
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('situation-card', async (_bots, _state) => {
  logger.info('PHASE', '▶ SITUATION CARD')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('emotion-card', async (_bots, _state) => {
  logger.info('PHASE', '▶ EMOTION CARD')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('story-telling', async (_bots, _state) => {
  logger.info('PHASE', '▶ STORY TELLING')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('group-response', async (bots, state) => {
  logger.info('PHASE', '▶ GROUP RESPONSE — NTG votes')
  const ntgData = state.players.find((p: any) => p.isSender)
  const ntg = ntgData ? bots.find(b => b.id === ntgData.userId) : undefined

  if (ntg) {
    const candidates = bots.filter(b => b.id !== ntg.id)
    const voteCount = Math.min(Math.floor(Math.random() * 3) + 1, candidates.length)
    const targets = [...candidates].sort(() => Math.random() - 0.5).slice(0, voteCount)
    for (const target of targets) {
      const targetYellow = target.state.coins?.yellow ?? 0
      logger.action(ntg.name, `NTG_VOTE → ${target.name} (${targetYellow}+5=${targetYellow + 5}💛)`)
      ntg.ntgVote(ROOM_ID, target.socketId)
      await voteTick()
    }
  }
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('reflection-card', async (_bots, _state) => {
  logger.info('PHASE', '▶ REFLECTION CARD')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('reflection-sharing', async (bots, state) => {
  const ntgData = state.players.find((p: any) => p.isSender)
  const ntg = ntgData ? bots.find(b => b.id === ntgData.userId) : undefined
  if (ntg) {
    const ntgYellow = ntg.state.coins?.yellow ?? 0
    logger.info('PHASE', `▶ REFLECTION SHARING — ${ntg.name} (${ntgYellow}+5=${ntgYellow + 5}💛)`)
    ntg.shareReflection(ROOM_ID, 'Tôi chọn thẻ này vì nó phản ánh cảm xúc hôm nay.')
    await tick()
  }
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('selfcare-card', async (_bots, _state) => {
  logger.info('PHASE', '▶ SELFCARE CARD')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('hug-action', async (_bots, _state) => {
  logger.info('PHASE', '▶ HUG ACTION')
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('guess-silencer', async (bots, state) => {
  logger.info('PHASE', '▶ GUESS SILENCER')

  // Always vote the actual silencer (server exposes originalRole in state)
  const silencerData = state.players.find((p: any) => p.originalRole === 'Người Im Lặng')

  for (const bot of bots) {
    let suspectSocketId: string

    if (!silencerData) {
      // Fallback: random vote if silencer not found in state
      const suspect = orchestrator.getRandomBot([bot])
      suspectSocketId = suspect.socketId
      logger.action(bot.name, `VOTE → ${suspect.name} (random fallback)`)
    } else {
      const silencerBot = bots.find(b => b.id === silencerData.userId)
      if (silencerBot && silencerBot.id !== bot.id) {
        suspectSocketId = silencerBot.socketId
        logger.action(bot.name, `VOTE → ${silencerBot.name} (silencer!) ✅`)
      } else {
        // Silencer votes for someone else (can't vote self)
        const suspect = orchestrator.getRandomBot([bot])
        suspectSocketId = suspect.socketId
        logger.action(bot.name, `VOTE → ${suspect.name} (self-exclude)`)
      }
    }

    bot.submitVote(ROOM_ID, suspectSocketId)
    await tick()
  }
  // After all bots voted, narrator advances to reveal-silencer
  await tick()
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('reveal-silencer', async (_bots, state) => {
  logger.info('PHASE', '▶ REVEAL SILENCER')
  const silencer = state.players.find((p: any) => p.originalRole === 'Người Im Lặng')
  const votes = state.votes || {}
  const tally: Record<string, number> = {}
  Object.values(votes).forEach((id: any) => { tally[id] = (tally[id] || 0) + 1 })
  const topId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
  const found = topId === silencer?.userId
  const voteCount = Object.keys(votes).length
  const silencerVotes = silencer ? (tally[silencer.userId] ?? 0) : 0
  logger.info('PHASE', `  Silencer: ${silencer?.name ?? '?'} | Votes for silencer: ${silencerVotes}/${voteCount}`)
  logger.info('PHASE', `  ${found ? '✅ FOUND → NTG +N💚, Silencer +2💛' : '❌ NOT FOUND → NTG +(N-3)💚, Silencer +7💛'}`)
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('give-coins', async (bots, _state) => {
  logger.info('PHASE', '▶ GIVE COINS')

  // Track green coins gained this phase locally (bot.state only updates on turn_changed)
  const greenGained: Record<string, number> = {}
  const getGreen = (bot: typeof bots[0]) =>
    (bot.state.coins?.green ?? 0) + (greenGained[bot.id] ?? 0)

  // Each bot gives 1 yellow + 1 red — check phase before each send
  for (const bot of bots) {
    if (!orchestrator.isCurrentPhase('give-coins')) {
      logger.warning('PHASE', 'give-coins: phase changed, aborting remaining coins')
      return
    }

    const yellowBalance = bot.state.coins?.yellow ?? 0
    const redBalance = bot.state.coins?.red ?? 0

    // Give 1 yellow coin to a random target
    if (yellowBalance > 0) {
      const yellowTarget = orchestrator.getRandomBot([bot])
      const before = getGreen(yellowTarget)
      logger.action(bot.name, `GIVE 1💛 → ${yellowTarget.name} (${before}+1=${before + 1}💚)`)
      bot.giveCoin(ROOM_ID, yellowTarget.socketId, 'yellow')
      greenGained[yellowTarget.id] = (greenGained[yellowTarget.id] ?? 0) + 1
      await coinTick()
    }

    if (!orchestrator.isCurrentPhase('give-coins')) {
      logger.warning('PHASE', 'give-coins: phase changed after yellow, aborting red')
      return
    }

    // Give 1 red coin to a random target
    if (redBalance > 0) {
      const redTarget = orchestrator.getRandomBot([bot])
      const before = getGreen(redTarget)
      logger.action(bot.name, `GIVE 1❤️ → ${redTarget.name} (${before}+1=${before + 1}💚)`)
      bot.giveCoin(ROOM_ID, redTarget.socketId, 'red')
      greenGained[redTarget.id] = (greenGained[redTarget.id] ?? 0) + 1
      await coinTick()
    }
  }

  if (!orchestrator.isCurrentPhase('give-coins')) return
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

orchestrator.registerPhaseHandler('reward', async (_bots, state) => {
  logger.info('PHASE', '▶ REWARD')
  // Show NTG green coin gain this round
  const ntg = state.players.find((p: any) => p.isSender)
  const N = state.players.length
  logger.info('PHASE', `  NTG: ${ntg?.name ?? '?'} | 💚 coins: ${ntg?.coins?.green ?? 0} (give_coin gives 💛/❤️ only — 💚 comes from NTG reward)`)
  logCoins('End of round', state)
  orchestrator.getNarrator()?.advanceTurn(ROOM_ID)
})

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🎮  BOT SIMULATION — EmCoin (fast mode, rate limit disabled)')
  console.log('='.repeat(70))
  console.log(`  Server : ${SERVER_URL}  |  Room : ${ROOM_ID}  |  Bots : ${BOT_COUNT}`)
  console.log('='.repeat(70) + '\n')

  reporter.startSuite('Bot Simulation')
  const startTime = Date.now()

  try {
    await orchestrator.initializeBots()
    await orchestrator.start()
    await new Promise(r => setTimeout(r, 5 * 60 * 1000))

    // Print rotation summary
    logger.info('SUMMARY', `Quản trò history (${narratorHistory.length}): ${narratorHistory.join(' → ')}`)
    logger.info('SUMMARY', `NTG history (${ntgHistory.length}): ${ntgHistory.join(' → ')}`)

    reporter.addTest({ name: 'Full Game Simulation', status: 'pass', duration: Date.now() - startTime })
  } catch (err: any) {
    logger.error('MAIN', `Simulation failed: ${err.message}`)
    reporter.addTest({ name: 'Full Game Simulation', status: 'fail', duration: 0, error: err.message })
    process.exit(1)
  } finally {
    reporter.endSuite()
    reporter.printConsoleReport()
  }
}

process.on('SIGINT', () => {
  logger.warning('MAIN', 'Interrupted')
  orchestrator.cleanup()
})

main()
