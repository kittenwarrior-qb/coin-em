# 🏗️ EMCOIN Game Architecture (After Refactor)

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Components → useSocket → Socket.IO Client → Zustand Stores     │
│                    ↓                              ↑              │
│              Socket Events                   State Updates       │
└─────────────────────────────────────────────────────────────────┘
                              ↕ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                           │
├─────────────────────────────────────────────────────────────────┤
│  Socket.IO Server → Handlers → Services → Engine → Repository   │
│       ↓                ↓           ↓          ↓          ↓       │
│  Rate Limiter    Validators   State     Actions   Persistence   │
│                              Machine                             │
│                                                                  │
│  PhaseTimer ────────────────────────────────────────────────────┤
│  (Auto-advance)                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  be/data/rooms.json (File-based storage)                        │
│  - Auto-save (1s debounce)                                      │
│  - Load on startup                                              │
│  - Cleanup (hourly)                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### Example: Player Gives Coin

```
┌──────────┐
│  Player  │ Clicks "Give Red Coin" button
└────┬─────┘
     │
     ↓
┌──────────────────┐
│  useSocket.ts    │ socket.emit('give_coin', { roomId, receiverSocketId, coinType })
└────┬─────────────┘
     │
     ↓ WebSocket
┌──────────────────────────────────────────────────────────────┐
│  gameHandlers.ts                                              │
│  1. Rate Limiter Check (1 per second)                        │
│     ├─ PASS → Continue                                       │
│     └─ FAIL → Return RATE_LIMITED error                      │
│                                                               │
│  2. Find Room & Players                                      │
│     ├─ Room exists? → Continue                               │
│     └─ Not found → Return ROOM_NOT_FOUND error               │
│                                                               │
│  3. Create GameAction                                        │
│     { type: 'GIVE_COIN', actorId, targetId, data }          │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  GameEngine.executeAction()                                   │
│  1. Validate via ActionValidator                             │
│     ├─ Phase check (must be day phase)                       │
│     ├─ Coin limit check (max 1 per type)                     │
│     └─ Target validation                                     │
│                                                               │
│  2. Execute via executeGiveCoin()                            │
│     ├─ Update coinsGiven tracking                            │
│     ├─ Update player coins                                   │
│     └─ Add to game log                                       │
│                                                               │
│  3. Return GameResult                                        │
│     { success: true, room: updatedRoom }                     │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  RoomRepository.save()                                        │
│  1. Update in-memory Map                                     │
│  2. Trigger autoSave() (debounced)                           │
│     └─ Write to be/data/rooms.json after 1s                  │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  Socket.IO Broadcast                                          │
│  io.to(roomId).emit('coin_given', {                          │
│    giver, receiver, coinType, room                           │
│  })                                                           │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓ WebSocket (to all clients in room)
┌──────────────────┐
│  useSocket.ts    │ socket.on('coin_given', ...)
│  1. Update roomState                                          │
│  2. Trigger React re-render                                  │
└──────────────────┘
```

---

## Phase Transition Flow

### Example: Narrator Advances Turn

```
┌──────────┐
│ Narrator │ Clicks "Next Turn" button
└────┬─────┘
     │
     ↓
┌──────────────────┐
│  useSocket.ts    │ socket.emit('next_turn', { roomId })
└────┬─────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  gameHandlers.ts                                              │
│  1. Validate narrator permission                             │
│  2. Call GameEngine.advanceTurn()                            │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  GameEngine.advanceTurn()                                     │
│  1. Check if game should end                                 │
│  2. Get next phase from TurnManager                          │
│     ├─ role-reveal → night                                   │
│     ├─ night → day-draw                                      │
│     ├─ day-draw → day-emotion                                │
│     ├─ ... (9 phases total)                                  │
│     └─ reward → role-reveal (new round)                      │
│                                                               │
│  3. Reset phase-specific state                               │
│     ├─ Entering night? Reset nightActions                    │
│     ├─ Entering guess-role? Reset votes                      │
│     └─ Entering day-draw? Reset coinsGiven                   │
│                                                               │
│  4. Handle round transitions                                 │
│     └─ After reward? Rotate roles, increment round           │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  RoomRepository.save() + Broadcast                            │
│  io.to(roomId).emit('turn_changed', room)                    │
└────┬─────────────────────────────────────────────────────────┘
     │
     ↓
┌──────────────────────────────────────────────────────────────┐
│  PhaseTimer.startTimer()                                      │
│  1. Clear existing timer                                     │
│  2. Check if phase has timeout                               │
│     ├─ night: 60s                                            │
│     ├─ guess-role: 120s                                      │
│     └─ reward: 90s                                           │
│                                                               │
│  3. Set timeout → Auto-advance when expires                  │
│     └─ Recursively call advanceTurn()                        │
└──────────────────────────────────────────────────────────────┘
     │
     ↓ WebSocket
┌──────────────────┐
│  useSocket.ts    │ socket.on('turn_changed', ...)
│  1. Update roomState                                          │
│  2. Sync gameStep from room.phase                            │
│  3. Trigger React re-render                                  │
└──────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER ACTION                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Component   │→ │  useSocket   │→ │ Socket.emit  │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
└─────────────────────────────────────────────┼──────────────┘
                                              │
                         ↓ WebSocket          │
┌─────────────────────────────────────────────┼──────────────┐
│                   MIDDLEWARE LAYER           │              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────▼──────┐       │
│  │ Rate Limiter │← │   Handler    │← │ Socket.on  │       │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘       │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
          ↓ PASS             ↓
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Validator   │← │    Engine    │← │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
└─────────┼──────────────────┼────────────────────────────────┘
          │                  │
          ↓ Valid            ↓ Execute
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Repository  │→ │  autoSave()  │→ │  rooms.json  │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
└─────────┼────────────────────────────────────────────────────┘
          │
          ↓ Updated Room
┌─────────────────────────────────────────────────────────────┐
│                    BROADCAST LAYER                           │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ PhaseTimer   │  │ Socket.emit  │→ All clients in room    │
│  │ (optional)   │  │ (broadcast)  │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management

### Backend State (Room)

```typescript
interface Room {
  // Core
  id: string
  host: string
  players: Player[]
  status: 'waiting' | 'playing' | 'ended'
  
  // Game Flow
  phase: GamePhase  // 9 phases
  turn: number
  currentRound: number
  totalRounds: number
  
  // Roles
  currentNTG: string | null
  currentNarrator: string | null
  
  // Night State
  mutedPlayer: string | null
  healedPlayer: string | null
  selectedCard: any | null
  nightActions: {
    silenced: boolean
    healed: boolean
    cardSelected: boolean
  }
  
  // Day State
  coinsGiven: Record<string, Record<string, { red, yellow, green }>>
  
  // Voting State
  votes: Record<string, string>
  
  // Audit
  gameLog: GameLogEntry[]
  lastActivity: number
}
```

### Frontend State (Zustand)

```typescript
// gameStore.ts
interface GameState {
  gameStep: GameStep  // Synced from server phase
  selectedCards: SelectedCards
  players: Player[]
  mySocketId: string
  myUserId: string
  expandedPlayer: Player | null
  showInventory: boolean
}

// socketStore (implicit in useSocket)
interface SocketState {
  socket: Socket | null
  isConnected: boolean
  roomState: RoomState | null
  availableRooms: RoomListItem[]
  error: string | null
}
```

---

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                         index.ts                             │
│  (Main server, cleanup scheduler)                           │
└────┬────────────────────────────────────────────────────────┘
     │
     ├─→ persistence.ts (load/save/cleanup)
     │
     ├─→ socket/handlers/
     │   ├─→ gameHandlers.ts
     │   │   ├─→ middleware/rateLimiter.ts
     │   │   ├─→ modules/game/PhaseTimer.ts
     │   │   └─→ modules/game/service/GameService.ts
     │   │       └─→ modules/game/engine/GameEngine.ts
     │   │           ├─→ ActionValidator.ts
     │   │           ├─→ StateMachine.ts
     │   │           ├─→ TurnManager.ts
     │   │           └─→ RoleManager.ts
     │   │
     │   └─→ roomHandlers.ts
     │       └─→ modules/room/service/RoomService.ts
     │           └─→ modules/room/repository/RoomRepository.ts
     │               └─→ persistence.ts
     │
     └─→ modules/game/types/index.ts (shared types)
```

---

## Key Design Patterns

### 1. Repository Pattern
```
Service → Repository → Persistence
- Abstracts data access
- Enables easy swap to Redis/DB
```

### 2. Strategy Pattern
```
GameEngine → ActionValidator → Specific Validators
- Each action type has own validation logic
- Easy to add new action types
```

### 3. State Machine Pattern
```
StateMachine → Transitions Map
- Enforces valid phase transitions
- Prevents invalid state changes
```

### 4. Observer Pattern
```
Socket.IO → Event Emitters → Listeners
- Decoupled communication
- Multiple clients sync automatically
```

### 5. Singleton Pattern
```
roomRepository, phaseTimer
- Single source of truth
- Shared across all handlers
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  1. Rate Limiter                                             │
│     └─ Prevents spam (1-2s between actions)                 │
├─────────────────────────────────────────────────────────────┤
│  2. Action Validator                                         │
│     ├─ Phase validation (right phase for action?)           │
│     ├─ Role validation (right role for action?)             │
│     ├─ Idempotency (action already done?)                   │
│     └─ Limit validation (coin limit reached?)               │
├─────────────────────────────────────────────────────────────┤
│  3. Permission Check                                         │
│     └─ Only narrator can advance turn                       │
├─────────────────────────────────────────────────────────────┤
│  4. State Machine                                            │
│     └─ Only valid phase transitions allowed                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Optimizations

### 1. Debounced Persistence
```
Room Update → autoSave() → Wait 1s → Write to disk
- Reduces disk I/O
- Batches multiple updates
```

### 2. In-Memory Storage
```
Map<roomId, Room> in RoomRepository
- Fast lookups (O(1))
- No database latency
```

### 3. Rate Limiter Cleanup
```
Every 5 minutes → Remove old timestamps
- Prevents memory leak
- Keeps Map size bounded
```

### 4. Room Cleanup
```
Every 1 hour → Remove old/empty rooms
- Frees memory
- Cleans disk storage
```

---

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│  Socket Handler (try-catch wrapper)                         │
│  ├─ Validation Error → Return error to client               │
│  ├─ Business Logic Error → Return error to client           │
│  └─ Unexpected Error → Log + return INTERNAL_ERROR          │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Client (useSocket)                                          │
│  ├─ socket.on('error', ...) → Show error message            │
│  └─ callback({ error, message }) → Handle inline            │
└─────────────────────────────────────────────────────────────┘
```

---

## Scalability Path

### Current (Single Instance)
```
Client ←→ Node.js Server ←→ File Storage
```

### Future (Multi-Instance)
```
Client ←→ Load Balancer ←→ Node.js Servers ←→ Redis
                              ↓
                        Socket.IO Redis Adapter
```

**Required Changes:**
1. Replace `RoomRepository` Map with Redis client
2. Add Socket.IO Redis Adapter
3. Update `persistence.ts` to use Redis
4. Deploy multiple instances behind load balancer

---

## Summary

The refactored architecture provides:
- ✅ **Separation of Concerns** — Clear layer boundaries
- ✅ **Single Source of Truth** — Server controls all state
- ✅ **Type Safety** — Full TypeScript coverage
- ✅ **Resilience** — Persistence, rate limiting, auto-advance
- ✅ **Maintainability** — Modular, testable, documented
- ✅ **Scalability** — Ready for Redis/multi-instance upgrade

The system is production-ready for the core game loop! 🚀
