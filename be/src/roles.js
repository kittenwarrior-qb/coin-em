
const ROLES = {
  NARRATOR: 'Người Quản trò',
  SENDER: 'Người Trao Gửi',
  SILENCER: 'Người Im Lặng',
  CONNECTOR: 'Người Kết Nối',
  GUIDE: 'Người Dẫn Lối',
  HEALER: 'Người Chữa Lành',
  PERSPECTIVE: 'Người Gợi Mở',
}

const ROLE_DISTRIBUTION = {
  7: [ROLES.NARRATOR, ROLES.SENDER, ROLES.SILENCER, ROLES.CONNECTOR, ROLES.GUIDE, ROLES.HEALER, ROLES.PERSPECTIVE],
  8: [ROLES.NARRATOR, ROLES.SENDER, ROLES.SILENCER, ROLES.SILENCER, ROLES.CONNECTOR, ROLES.GUIDE, ROLES.HEALER, ROLES.PERSPECTIVE],
  9: [ROLES.NARRATOR, ROLES.SENDER, ROLES.SILENCER, ROLES.SILENCER, ROLES.CONNECTOR, ROLES.CONNECTOR, ROLES.GUIDE, ROLES.HEALER, ROLES.PERSPECTIVE],
  10: [ROLES.NARRATOR, ROLES.SENDER, ROLES.SILENCER, ROLES.SILENCER, ROLES.SILENCER, ROLES.CONNECTOR, ROLES.CONNECTOR, ROLES.GUIDE, ROLES.HEALER, ROLES.PERSPECTIVE],
  11: [ROLES.NARRATOR, ROLES.SENDER, ROLES.SILENCER, ROLES.SILENCER, ROLES.SILENCER, ROLES.CONNECTOR, ROLES.CONNECTOR, ROLES.CONNECTOR, ROLES.GUIDE, ROLES.HEALER, ROLES.PERSPECTIVE],
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function assignRoles(players) {
  const playerCount = players.length
  if (playerCount < 7 || playerCount > 11) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 7-11 players.`)
  }

  const roles = ROLE_DISTRIBUTION[playerCount]
  const shuffledRoles = shuffle(roles)

  return players.map((player, index) => ({
    ...player,
    role: shuffledRoles[index],
    isNarrator: shuffledRoles[index] === ROLES.NARRATOR,
    isSender: shuffledRoles[index] === ROLES.SENDER,
    isMuted: false,
    coins: { 
      red: 3,           // 3 coin đỏ (vô tận)
      yellow: playerCount, // Số coin vàng = số người chơi
      green: 0          // Chưa có coin xanh
    },
  }))
}

export function getPlayersByRole(players, role) {
  return players.filter(p => p.role === role)
}

export { ROLES }
