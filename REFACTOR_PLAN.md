# 🔧 REFACTOR PLAN — EMCOIN GAME

> Dựa trên: `prompt.md` + `ARCHITECTURE_ANALYSIS.md` + đọc toàn bộ source code thực tế  
> Ngày: 2026-05-02

---

## 📌 TỔNG QUAN HIỆN TRẠNG

### Kiến trúc hiện tại
```
Frontend: React (Vite) + Zustand (gameStore / socketStore / uiStore) + useSocket hook
Backend:  Node.js + Socket.IO → Handler → Service → GameEngine → RoomRepository (In-Memory Map)
```

### Những gì đang hoạt động tốt ✅
- Tách biệt rõ Handler / Service / Engine / Repository
- StateMachine có sẵn (dù transitions còn đơn giản)
- ActionValidator đã validate từng loại action
- Try-catch wrapper ở socket handlers
- File persistence (persistence.js) đã có nhưng chưa tích hợp đầy đủ

### Những vấn đề nghiêm trọng ❌
- **Game flow phía client tự điều khiển** (`useGameFlow.ts` — `nextStep()` chạy hoàn toàn phía FE)
- **Phase mismatch**: Backend có 3 phase (`role-reveal / night / day`), Frontend có 9 step (`role-reveal, night, day-draw, day-emotion, day-story, reflection, selfcare, guess-role, reward`)
- **Voting không track**: `executeVote` chỉ ghi log, không lưu votes, không detect kết quả
- **Coin không giới hạn**: `validateGiveCoin` không kiểm tra số lượng coin đã tặng
- **Reconnect thiếu**: Khi reconnect, state trả về `room_state` nhưng không restore `gameStep` phía FE
- **Night action race condition**: Nhiều role cùng action đêm, không có mutex/idempotency
- **`persistence.js` là JS thuần** trong project TypeScript — không được gọi từ Repository

---

## 🔴 PHASE 1 — CRITICAL FIXES (Ưu tiên cao nhất)

### 1.1 — Đồng bộ Game Phase: Backend làm source of truth

**Vấn đề:**  
- FE tự chạy `nextStep()` không emit socket → các client khác không biết phase đã đổi  
- BE phase (`role-reveal/night/day`) không map sang FE step (`day-draw, day-emotion`...)

**Giải pháp:**
```typescript
// BE: Mở rộng GamePhase type
type GamePhase =
  | 'role-reveal'
  | 'night'
  | 'day-draw'
  | 'day-emotion'
  | 'day-story'
  | 'reflection'
  | 'selfcare'
  | 'guess-role'
  | 'reward'
  | 'ended'

// StateMachine.ts — cập nhật transitions đầy đủ
'role-reveal' → 'night'
'night'       → 'day-draw'
'day-draw'    → 'day-emotion'
'day-emotion' → 'day-story'
'day-story'   → 'reflection'
'reflection'  → 'selfcare'
'selfcare'    → 'guess-role'
'guess-role'  → 'reward'
'reward'      → 'role-reveal' (next round) | 'ended'
```

**Files cần sửa:**
- `be/src/modules/game/types/index.ts` — mở rộng `GamePhase`
- `be/src/modules/game/engine/StateMachine.ts` — thêm đủ transitions
- `be/src/modules/game/engine/TurnManager.ts` — xóa logic turn 1/2/3, dùng phase name
- `fe/src/hooks/useGameFlow.ts` — **xóa `nextStep()` local**, lắng nghe `phase_changed` từ server
- `fe/src/stores/gameStore.ts` — `gameStep` phải được set từ socket event, không tự tính

---

### 1.2 — Fix Voting: Track votes + Auto-resolve

**Vấn đề:**  
`executeVote()` trong GameEngine chỉ ghi log, không lưu `votes: Map<voterId, targetId>` vào room state. Không có logic tổng kết kết quả.

**Giải pháp:**
```typescript
// Room type — thêm field
interface Room {
  // ...existing
  votes: Record<string, string>  // voterId → targetId
  voteDeadline?: number          // timestamp
}

// ActionValidator — thêm kiểm tra
validateVote(room, actor, action) {
  if (room.phase !== 'guess-role') return { valid: false, error: 'NOT_VOTE_PHASE' }
  if (room.votes[actor.userId]) return { valid: false, error: 'ALREADY_VOTED' }
  // ...
}

// GameEngine.executeVote — lưu vote + check auto-reveal
private executeVote(room, action): GameResult {
  const newVotes = { ...room.votes, [action.actorId]: action.targetId }
  const allVoted = room.players.length === Object.keys(newVotes).length
  
  const updatedRoom = { ...room, votes: newVotes }
  if (allVoted) {
    // Tự động chuyển phase sang reward
    updatedRoom.phase = 'reward'
  }
  return { success: true, room: updatedRoom, autoAdvance: allVoted }
}
```

**Files cần sửa:**
- `be/src/modules/game/types/index.ts` — thêm `votes` field vào Room
- `be/src/modules/game/engine/ActionValidator.ts` — validate phase + already-voted
- `be/src/modules/game/engine/GameEngine.ts` — lưu vote + auto-advance
- `be/src/socket/handlers/gameHandlers.ts` — emit `voting_complete` khi allVoted

---

### 1.3 — Fix Coin Anti-spam & Giới hạn

**Vấn đề:**  
Không giới hạn số coin tặng. 1 player có thể spam `give_coin` mãi cho cùng 1 người.

**Giải pháp:**
```typescript
// Room type — thêm tracking
interface Room {
  coinsGiven: Record<string, Record<string, { red: number; yellow: number; green: number }>>
  // coinsGiven[giverId][receiverId] = { red: 1, yellow: 0, green: 0 }
}

// ActionValidator
validateGiveCoin(room, actor, action) {
  const MAX_PER_TYPE = 1  // Mỗi loại coin chỉ tặng 1 lần/người
  const given = room.coinsGiven?.[actor.userId]?.[action.targetId]
  if (given?.[action.data.coinType] >= MAX_PER_TYPE) {
    return { valid: false, error: 'COIN_LIMIT_REACHED' }
  }
}
```

**Files cần sửa:**
- `be/src/modules/game/types/index.ts` — thêm `coinsGiven`
- `be/src/modules/game/engine/ActionValidator.ts` — validate limit
- `be/src/modules/game/engine/GameEngine.ts` — update `coinsGiven` khi tặng

---

### 1.4 — Fix Night Action: Idempotency + Race Condition

**Vấn đề:**  
Nếu `Người Im Lặng` emit `night_action` 2 lần nhanh → 2 handler chạy song song → state cuối cùng tùy thuộc cái nào resolve sau.

**Giải pháp:**
```typescript
// Room type — track night actions đã thực hiện
interface Room {
  nightActions: {
    silenced: boolean   // Im Lặng đã action chưa
    healed: boolean     // Chữa Lành đã action chưa
    cardSelected: boolean // Dẫn Lối đã chọn card chưa
  }
}

// ActionValidator — idempotency check
validateSilence(room, actor, action) {
  if (room.nightActions?.silenced) {
    return { valid: false, error: 'ACTION_ALREADY_DONE' }
  }
}

// GameEngine.executeSilence — mark as done
const updatedRoom = {
  ...room,
  mutedPlayer: action.targetId,
  nightActions: { ...room.nightActions, silenced: true }
}
```

**Files cần sửa:**
- `be/src/modules/game/types/index.ts` — thêm `nightActions`
- `be/src/modules/game/engine/ActionValidator.ts`
- `be/src/modules/game/engine/GameEngine.ts` — reset `nightActions` khi bắt đầu đêm mới

---

### 1.5 — Fix Reconnect: Restore đúng gameStep

**Vấn đề:**  
Khi user reload, `reconnect_room` trả về `room_state` nhưng FE không biết map `room.phase` sang đúng `gameStep`. FE luôn reset về `'role-reveal'`.

**Giải pháp:**
```typescript
// roomHandlers.ts — reconnect_room
socket.emit('room_state', {
  ...roomService.getPublicState(updatedRoom),
  phase: updatedRoom.phase,  // đảm bảo phase đầy đủ được gửi
})

// useSocket.ts — on room_state
socket.on('room_state', (state) => {
  setRoomState(state)
  // Sync gameStep với server phase
  if (state.phase) {
    useGameStore.getState().setGameStep(state.phase)
  }
})
```

**Files cần sửa:**
- `fe/src/hooks/useSocket.ts` — sync `gameStep` khi nhận `room_state`
- `be/src/socket/handlers/roomHandlers.ts` — đảm bảo `phase` được include trong response

---

## ⚠️ PHASE 2 — HIGH PRIORITY

### 2.1 — Server-Driven Phase Timeout

**Vấn đề:**  
Các phase phụ thuộc moderator click `next_turn`. Nếu moderator disconnect → game stuck mãi.

**Giải pháp:**
```typescript
// be/src/modules/game/PhaseTimer.ts (file mới)
export class PhaseTimer {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  
  startTimer(roomId: string, phase: GamePhase, onExpire: () => void) {
    this.clearTimer(roomId)
    const timeout = PHASE_TIMEOUTS[phase]
    if (!timeout) return
    
    const timer = setTimeout(onExpire, timeout)
    this.timers.set(roomId, timer)
  }
  
  clearTimer(roomId: string) {
    const timer = this.timers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(roomId)
    }
  }
}

const PHASE_TIMEOUTS: Partial<Record<GamePhase, number>> = {
  'night':      30_000,  // 30s
  'guess-role': 10_000,  // 10s
  'reward':     60_000,  // 60s
}
```

**Files cần tạo/sửa:**
- `be/src/modules/game/PhaseTimer.ts` — NEW
- `be/src/socket/handlers/gameHandlers.ts` — start timer sau mỗi `next_turn`
- `be/src/index.ts` — inject PhaseTimer vào handler

---

### 2.2 — Tích hợp persistence.js vào TypeScript

**Vấn đề:**  
`persistence.js` đã có logic đúng nhưng là JS thuần, không được RoomRepository gọi. Khi restart server → mất tất cả rooms.

**Giải pháp:**
```typescript
// be/src/modules/room/repository/RoomRepository.ts — tích hợp autosave
import { loadRooms, autoSave } from '../../../persistence'

export class RoomRepository {
  private rooms: Map<string, Room>
  
  constructor() {
    this.rooms = loadRooms() as Map<string, Room>  // Load khi khởi động
  }
  
  save(room: Room): void {
    this.rooms.set(room.id, room)
    autoSave(this.rooms)  // Debounced write to disk
  }
}
```

**Files cần sửa:**
- `be/src/persistence.js` → rename sang `persistence.ts`
- `be/src/modules/room/repository/RoomRepository.ts` — gọi `loadRooms()` và `autoSave()`

---

### 2.3 — Rate Limiting cho Socket Events

**Vấn đề:**  
Client có thể spam `give_coin`, `submit_vote`, `night_action` liên tục.

**Giải pháp:**
```typescript
// be/src/socket/middleware/rateLimiter.ts (NEW)
const actionTimestamps = new Map<string, number>()

export function rateLimitAction(socket: Socket, action: string, limitMs = 500): boolean {
  const key = `${socket.id}:${action}`
  const last = actionTimestamps.get(key) || 0
  const now = Date.now()
  
  if (now - last < limitMs) return false  // reject
  
  actionTimestamps.set(key, now)
  return true
}

// Dùng trong handlers:
socket.on('give_coin', async (data, callback) => {
  if (!rateLimitAction(socket, 'give_coin', 1000)) {
    return callback?.({ error: 'RATE_LIMITED', message: 'Vui lòng chờ.' })
  }
  // ... logic
})
```

**Files cần tạo:**
- `be/src/socket/middleware/rateLimiter.ts` — NEW
- Áp dụng vào `gameHandlers.ts`: `give_coin`, `submit_vote`, `night_action`

---

### 2.4 — Frontend: Tách useSocket thành nhiều hooks nhỏ

**Vấn đề:**  
`useSocket.ts` là 306 dòng xử lý mọi thứ: connection, room events, game events, session. Rất khó maintain và test.

**Giải pháp:**
```
fe/src/hooks/
  useSocketConnection.ts   — chỉ quản lý connect/disconnect/reconnect
  useRoomSocket.ts         — join_room, player_joined, player_left, room_state
  useGameSocket.ts         — game_started, turn_changed, coin_given, vote events
  useSocket.ts             — re-export tổng hợp (backward compat)
```

---

## 🟡 PHASE 3 — MEDIUM PRIORITY

### 3.1 — Validate Role trước Night Action (Dẫn Lối edge case)

**Vấn đề hiện tại:**  
`Người Dẫn Lối` (GUIDE role) chưa có action trong đêm — chọn selfcare card. Logic này thiếu hoàn toàn trong `ActionValidator` và `GameEngine`.

**Cần thêm:**
```typescript
// ActionValidator — thêm case
case 'SELECT_SELFCARE_CARD':
  return this.validateSelectSelfcareCard(room, actor, action)

// Validate: chỉ Guide mới được, chỉ trong phase night
private validateSelectSelfcareCard(room, actor, action) {
  if (room.phase !== 'night') return { valid: false, error: 'NOT_NIGHT_PHASE' }
  if (actor.role !== Role.GUIDE) return { valid: false, error: 'NOT_GUIDE' }
  if (room.nightActions?.cardSelected) return { valid: false, error: 'ALREADY_SELECTED' }
  return { valid: true }
}
```

---

### 3.2 — Fix `getPlayerView`: Bảo vệ role leak

**Vấn đề:**  
`GameEngine.getPlayerView()` ẩn role người khác trong phase `role-reveal`, nhưng trong `night` phase, Narrator (Quản trò) cần biết ai có role gì để điều phối. Logic hiện tại chưa xử lý theo phase.

**Giải pháp:**
```typescript
getPlayerView(room: Room, playerId: string): any {
  const myPlayer = room.players.find(p => p.userId === playerId)
  const isNarrator = myPlayer?.isNarrator
  
  return {
    ...room,
    players: room.players.map(p => ({
      ...p,
      role: (
        p.userId === playerId ||   // own role
        p.isNarrator ||            // narrator always public
        p.isSender ||              // NTG always public
        (isNarrator && room.phase === 'night')  // narrator sees all during night
      ) ? p.role : undefined,
    }))
  }
}
```

---

### 3.3 — Cleanup Room Lifecycle

**Vấn đề:**  
Khi player disconnect, không có timeout để remove player. Room chờ mãi.

**Giải pháp:**
```typescript
// be/src/index.ts — on disconnect
socket.on('disconnect', () => {
  // Mark player as disconnected (không xóa ngay)
  const room = findRoomBySocketId(socket.id)
  if (room) {
    roomRepository.update(room.id, {
      players: room.players.map(p =>
        p.socketId === socket.id
          ? { ...p, connected: false, disconnectedAt: Date.now() }
          : p
      )
    })
    
    // Notify others
    io.to(room.id).emit('player_disconnected', { socketId: socket.id })
    
    // Auto-remove sau 2 phút nếu không reconnect
    setTimeout(() => {
      const current = roomRepository.findById(room.id)
      const player = current?.players.find(p => p.socketId === socket.id)
      if (player && !player.connected) {
        roomService.removePlayer(room.id, player.userId)
        io.to(room.id).emit('player_left', { userId: player.userId })
      }
    }, 2 * 60 * 1000)
  }
})
```

---

### 3.4 — State Versioning (Optimistic update guard)

**Vấn đề:**  
Nếu 2 clients gửi action cùng lúc (race condition), server xử lý tuần tự nhưng cả 2 đều nhận broadcast → client 2 bị overwrite bởi state cũ.

**Giải pháp nhẹ:**
```typescript
// Room type
interface Room {
  stateVersion: number  // tăng mỗi lần state thay đổi
}

// Mỗi lần save room: stateVersion++
// Client gửi action kèm version hiện tại
// Server reject nếu version không khớp
```

---

## 🔵 PHASE 4 — LOW PRIORITY / FUTURE

### 4.1 — Authentication (JWT)
Hiện tại bất kỳ ai biết `roomId` đều có thể join và thực hiện action.

### 4.2 — Monitoring & Logging
- Thay `console.log` bằng structured logger (winston)
- Thêm event tracking: `[ROOM_CREATED]`, `[GAME_STARTED]`, `[PHASE_CHANGED]`, `[COIN_GIVEN]`

### 4.3 — Redis (Production Scale)
- Thay In-Memory Map + file → Redis
- Socket.IO Redis Adapter cho multi-instance

---

## 📋 IMPLEMENTATION ROADMAP

| Phase | Task | Độ khó | Ưu tiên | Thời gian est. |
|-------|------|--------|---------|----------------|
| **P1** | Đồng bộ phase BE↔FE (9 steps) | ⭐⭐⭐ | 🔴 | 2-3 ngày |
| **P1** | Fix Voting: track + auto-resolve | ⭐⭐ | 🔴 | 1 ngày |
| **P1** | Coin anti-spam + limit | ⭐ | 🔴 | 0.5 ngày |
| **P1** | Night action idempotency | ⭐⭐ | 🔴 | 1 ngày |
| **P1** | Reconnect restore gameStep | ⭐ | 🔴 | 0.5 ngày |
| **P2** | Phase timeout (server-driven) | ⭐⭐⭐ | ⚠️ | 1-2 ngày |
| **P2** | Tích hợp persistence.ts | ⭐ | ⚠️ | 0.5 ngày |
| **P2** | Rate limiting middleware | ⭐ | ⚠️ | 0.5 ngày |
| **P2** | Tách useSocket hooks | ⭐⭐ | ⚠️ | 1 ngày |
| **P3** | Guide night action (SELECT_SELFCARE) | ⭐⭐ | 🟡 | 1 ngày |
| **P3** | getPlayerView by phase | ⭐ | 🟡 | 0.5 ngày |
| **P3** | Disconnect timeout + player lifecycle | ⭐⭐ | 🟡 | 1 ngày |
| **P3** | State versioning | ⭐⭐ | 🟡 | 1 ngày |
| **P4** | JWT Auth | ⭐⭐⭐ | 🔵 | 2-3 ngày |
| **P4** | Winston logger | ⭐ | 🔵 | 0.5 ngày |
| **P4** | Redis integration | ⭐⭐⭐⭐ | 🔵 | 3-5 ngày |

---

## 🗂️ FILES CẦN THAY ĐỔI (TÓM TẮT)

### Backend
| File | Loại thay đổi |
|------|--------------|
| `be/src/modules/game/types/index.ts` | Thêm `votes`, `nightActions`, `coinsGiven`, `stateVersion`, mở rộng `GamePhase` |
| `be/src/modules/game/engine/StateMachine.ts` | Thêm đủ 9 transitions |
| `be/src/modules/game/engine/TurnManager.ts` | Refactor — dùng phase name thay turn 1/2/3 |
| `be/src/modules/game/engine/ActionValidator.ts` | Thêm: idempotency, vote phase check, coin limit, guide card |
| `be/src/modules/game/engine/GameEngine.ts` | Fix vote tracking, coin tracking, night idempotency |
| `be/src/modules/room/repository/RoomRepository.ts` | Gọi `loadRooms()` + `autoSave()` |
| `be/src/socket/handlers/gameHandlers.ts` | Rate limiting, emit phase timer events |
| `be/src/socket/handlers/roomHandlers.ts` | Disconnect handling, player lifecycle |
| `be/src/persistence.js` → `.ts` | Đổi sang TypeScript |
| `be/src/modules/game/PhaseTimer.ts` | **NEW** — server-side phase timeout |
| `be/src/socket/middleware/rateLimiter.ts` | **NEW** — rate limiter |

### Frontend
| File | Loại thay đổi |
|------|--------------|
| `fe/src/hooks/useSocket.ts` | Sync `gameStep` từ `room_state.phase`, tách nhỏ |
| `fe/src/hooks/useGameFlow.ts` | Xóa local `nextStep()`, emit `next_turn` socket thay thế |
| `fe/src/stores/gameStore.ts` | `gameStep` driven by server phase |
| `fe/src/hooks/useSocketConnection.ts` | **NEW** |
| `fe/src/hooks/useRoomSocket.ts` | **NEW** |
| `fe/src/hooks/useGameSocket.ts` | **NEW** |

---

## ✅ MỤC TIÊU SAU KHI REFACTOR

- 🟢 Game không bị stuck (timeout tự động chuyển phase)
- 🟢 Không bị mất state khi reload trang (reconnect đúng gameStep)
- 🟢 Không thể spam coin hoặc vote nhiều lần
- 🟢 Night action idempotent — gửi 2 lần vẫn chỉ tính 1 lần
- 🟢 Phase đồng bộ tất cả clients qua server broadcast
- 🟢 Room data persist qua server restart (file-based)
- 🟢 Role không bị leak ra ngoài sai phase
