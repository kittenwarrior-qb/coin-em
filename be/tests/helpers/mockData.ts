import { Room, Player, Role, GamePhase } from '../../src/modules/game/types'

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    socketId: `socket-${Math.random().toString(36).substr(2, 9)}`,
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    name: `Player ${Math.floor(Math.random() * 1000)}`,
    coins: { red: 0, yellow: 0, green: 0 },
    ...overrides,
  }
}

export function createMockPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => createMockPlayer({ name: `Player ${i + 1}` }))
}

export function createMockRoom(playerCount: number = 7, overrides: Partial<Room> = {}): Room {
  const players = createMockPlayers(playerCount)
  const host = players[0]

  return {
    id: `room-${Math.random().toString(36).substr(2, 9)}`,
    host: host.userId,
    players,
    status: 'waiting',
    phase: 'role-reveal',
    turn: 1,
    currentRound: 1,
    totalRounds: playerCount,
    currentNTG: null,
    currentNarrator: null,
    mutedPlayer: null,
    healedPlayer: null,
    selectedCard: null,
    gameLog: [],
    lastActivity: Date.now(),
    votes: {},
    ntgVotes: {},
    nightActions: { silenced: false, healed: false, cardSelected: false },
    redCoinsGiven: {},
    yellowCoinsGiven: {},
    roleCompletions: {},
    responses: {},
    bonusesGiven: { healerBonus: false },
    settings: { situationGroups: ['light'], emotionGroups: ['basic'] },
    ...overrides,
  }
}

export function createPlayingRoom(playerCount: number = 7): Room {
  const room = createMockRoom(playerCount)
  
  // Assign roles
  const roles: Role[] = [
    Role.NARRATOR,
    Role.SENDER,
    Role.SILENCER,
    Role.HEALER,
    Role.CONNECTOR,
    Role.OPENER,
    Role.GUIDE,
  ]

  room.players = room.players.map((p, i) => ({
    ...p,
    role: roles[i % roles.length],
    originalRole: roles[i % roles.length], // Set originalRole for ActionValidator
    isNarrator: i === 0,
    isSender: i === 1,
    // Initial coins: red=3, yellow=playerCount, green=0
    coins: { red: 3, yellow: playerCount, green: 0 },
    collectedGreenCoins: 0,
  }))

  room.status = 'playing'
  room.currentNarrator = room.players[0].userId
  room.currentNTG = room.players[1].userId

  return room
}

export function setRoomPhase(room: Room, phase: GamePhase): Room {
  return { ...room, phase }
}
