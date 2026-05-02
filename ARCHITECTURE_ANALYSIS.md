# 🏗️ PHÂN TÍCH KIẾN TRÚC EMCOIN - FRONTEND ↔ BACKEND

## 📊 TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  GameBoard   │  │  useSocket   │  │ Zustand Store│          │
│  │  Component   │→ │    Hook      │→ │  (State)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                  ↓                                     │
│    UI Events          Socket.IO Client                          │
└─────────────────────────────────────────────────────────────────┘
                              ↕ WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Socket Handler│→ │ RoomService  │→ │ GameEngine   │          │
│  │   (Events)   │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                  ↓                  ↓                  │
│    Validation      Room Management    Game Logic                │
│         ↓                  ↓                  ↓                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         RoomRepository (In-Memory Map)            │          │
│  │              rooms: Map<string, Room>             │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 KẾT NỐI SOCKET.IO

### **1. Khởi tạo Connection**

**Frontend (`fe/src/hooks/useSocket.ts`):**
```typescript
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],  // Fallback mechanism
  reconnection: true,                     // Auto-reconnect
  reconnectionDelay: 1000,                // 1s delay
  reconnectionAttempts: 5,                // Max 5 attempts
})
```

**Backend (`be/src/index.ts`):**
```typescript
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`)
  // Attach userId to socket
  socket.userId = socket.handshake.auth?.userId || socket.id
  
  // Register handlers
  registerRoomHandlers(io, socket)
  registerGameHandlers(io, socket)
  registerPlayerHandlers(io, socket)
})
```

**Đặc điểm:**
- ✅ **Dual Transport**: WebSocket ưu tiên, fallback sang polling
- ✅ **Auto-reconnect**: Tự động kết nối lại khi mất kết nối
- ✅ **CORS**: Cho phép cross-origin từ frontend
- ✅ **User Tracking**: Mỗi socket có `userId` để track player

---

### **2. Socket Events Flow**

#### **A. Room Management**

```
CLIENT                          SERVER
  │                               │
  ├─ emit: join_room ────────────>│
  │  { roomId, name, userId }     │
  │                               ├─ RoomService.addPlayer()
  │                               ├─ roomRepository.save()
  │<──── on: room_state ──────────┤
  │  { id, players, status }      │
  │                               │
  ├─ emit: start_game ───────────>│
  │  { roomId }                   │
  │                               ├─ GameEngine.startGame()
  │                               ├─ RoleManager.assignRoles()
  │<──── on: game_started ────────┤
  │  { room with roles }          │
```

#### **B. Game Actions**

```
CLIENT                          SERVER
  │                               │
  ├─ emit: night_action ─────────>│
  │  { roomId, action, target }   │
  │                               ├─ GameEngine.executeAction()
  │                               ├─ ActionValidator.validate()
  │<──── on: night_action_completed ┤
  │  { action, room }             │
  │                               │
  ├─ emit: give_coin ────────────>│
  │  { roomId, receiver, type }   │
  │                               ├─ GameEngine.executeGiveCoin()
  │<──── on: coin_given ──────────┤
  │  { giver, receiver, room }    │
```

#### **C. Phase Transitions**

```
CLIENT                          SERVER
  │                               │
  ├─ emit: next_phase ───────────>│
  │  { roomId }                   │
  │                               ├─ GameEngine.advanceTurn()
  │                               ├─ TurnManager.getNextTurn()
  │<──── on: phase_changed ───────┤
  │  { phase, turn, room }        │
  │                               │
  │<──── broadcast to all ────────┤
  │  io.to(roomId).emit()         │
```

---

## 💾 DATA PERSISTENCE STRATEGY

### **Hiện tại: In-Memory Storage**

**Location:** `be/src/modules/room/repository/RoomRepository.ts`

```typescript
export class RoomRepository {
  private rooms: Map<string, Room> = new Map()
  
  save(room: Room): void {
    this.rooms.set(room.id, room)
  }
  
  findById(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }
}
```

**Đặc điểm:**
- ✅ **Nhanh**: O(1) read/write
- ✅ **Đơn giản**: Không cần database setup
- ❌ **Mất data khi restart**: Server restart = mất tất cả rooms
- ❌ **Không scale**: Chỉ chạy trên 1 server instance
- ❌ **Không backup**: Không có disaster recovery

---

### **Session Management (Client-side)**

**Location:** `fe/src/hooks/useSocket.ts`

```typescript
// Save to localStorage
function saveSession(session: Session) {
  localStorage.setItem('emcoin_session', JSON.stringify({
    roomId,
    userName,
    userId,
    oldSocketId
  }))
}

// Auto-reconnect on page reload
socket.on('connect', () => {
  const session = loadSession()
  if (session) {
    socket.emit('reconnect_room', {
      roomId: session.roomId,
      userId: session.userId,
      oldSocketId: session.oldSocketId,
      name: session.userName
    })
  }
})
```

**Đặc điểm:**
- ✅ **Survive page reload**: User không mất room khi F5
- ✅ **User tracking**: Dùng `userId` thay vì `socketId`
- ⚠️ **Phụ thuộc server**: Nếu server restart, room vẫn mất

---

## 🔍 ĐÁNH GIÁ TỔNG THỂ

### ✅ **ĐIỂM MẠNH**

#### 1. **Kiến trúc rõ ràng, tách biệt**
```
Frontend: UI ← Zustand ← useSocket ← Socket.IO Client
Backend:  Socket Handler → Service → Engine → Repository
```
- Separation of concerns tốt
- Dễ maintain và test
- Scalable về mặt code structure

#### 2. **Real-time sync tốt**
- Socket.IO đảm bảo real-time updates
- Broadcast events đến tất cả players trong room
- Auto-reconnect khi mất kết nối

#### 3. **State Management chặt chẽ**
- **Frontend**: Zustand store với clear actions
- **Backend**: GameEngine với StateMachine pattern
- Validation ở cả 2 layers

#### 4. **User Experience tốt**
- Session persistence (localStorage)
- Auto-reconnect với userId
- Fake players cho testing

---

### ❌ **ĐIỂM YẾU & RỦI RO**

#### 1. **🔴 CRITICAL: Data Loss khi Server Restart**

**Vấn đề:**
```typescript
// In-memory storage
private rooms: Map<string, Room> = new Map()
```
- Server restart → Mất tất cả rooms
- Deploy mới → Tất cả players bị disconnect
- Crash → Không recovery được

**Impact:**
- 🔴 **HIGH**: Production không thể dùng được
- 🔴 **HIGH**: User experience rất tệ
- 🔴 **HIGH**: Không có data backup

**Solution cần implement:**
```typescript
// Option 1: File-based persistence
import fs from 'fs'

class RoomRepository {
  private SAVE_FILE = './data/rooms.json'
  
  save(room: Room): void {
    this.rooms.set(room.id, room)
    this.persistToDisk()  // Save to file
  }
  
  private persistToDisk(): void {
    const data = Array.from(this.rooms.entries())
    fs.writeFileSync(this.SAVE_FILE, JSON.stringify(data))
  }
  
  loadFromDisk(): void {
    if (fs.existsSync(this.SAVE_FILE)) {
      const data = JSON.parse(fs.readFileSync(this.SAVE_FILE, 'utf-8'))
      this.rooms = new Map(data)
    }
  }
}

// Option 2: Redis (recommended for production)
import Redis from 'ioredis'

class RoomRepository {
  private redis = new Redis()
  
  async save(room: Room): Promise<void> {
    await this.redis.set(`room:${room.id}`, JSON.stringify(room))
  }
  
  async findById(roomId: string): Promise<Room | null> {
    const data = await this.redis.get(`room:${roomId}`)
    return data ? JSON.parse(data) : null
  }
}
```

---

#### 2. **⚠️ MEDIUM: Không có Horizontal Scaling**

**Vấn đề:**
- In-memory Map chỉ tồn tại trên 1 server instance
- Không thể chạy multiple servers (load balancing)
- Socket.IO rooms không sync giữa các instances

**Impact:**
- ⚠️ **MEDIUM**: Giới hạn số lượng concurrent users
- ⚠️ **MEDIUM**: Single point of failure

**Solution:**
```typescript
// Use Redis Adapter for Socket.IO
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: 'redis://localhost:6379' })
const subClient = pubClient.duplicate()

await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))
```

---

#### 3. **⚠️ MEDIUM: Thiếu Error Handling**

**Vấn đề:**
```typescript
// Frontend: Không handle socket errors đầy đủ
socket.on('error', (err) => {
  console.error('[Socket] Error:', err)
  setError(err.message)  // Chỉ log, không retry
})

// Backend: Không có try-catch ở nhiều nơi
executeAction(room: Room, action: GameAction): GameResult {
  // No try-catch, có thể crash server
  const validation = this.actionValidator.validate(room, action)
  // ...
}
```

**Impact:**
- ⚠️ **MEDIUM**: Server có thể crash
- ⚠️ **MEDIUM**: Client không biết lỗi gì

**Solution:**
```typescript
// Add global error handler
io.on('connection', (socket) => {
  socket.on('error', (error) => {
    logger.error('Socket error:', error)
    socket.emit('error', { code: 'SOCKET_ERROR', message: error.message })
  })
})

// Wrap all handlers with try-catch
socket.on('join_room', async (data) => {
  try {
    // ... logic
  } catch (error) {
    socket.emit('error', { code: 'JOIN_FAILED', message: error.message })
  }
})
```

---

#### 4. **⚠️ LOW: Thiếu Authentication & Authorization**

**Vấn đề:**
```typescript
// Không có auth
socket.userId = socket.handshake.auth?.userId || socket.id

// Bất kỳ ai cũng có thể:
- Join bất kỳ room nào
- Start game (nếu biết roomId)
- Execute actions
```

**Impact:**
- ⚠️ **LOW**: Có thể bị abuse (hiện tại chỉ local)
- ⚠️ **LOW**: Không có user management

**Solution:**
```typescript
// Add JWT authentication
import jwt from 'jsonwebtoken'

io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) return next(new Error('Authentication error'))
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    socket.userId = decoded.userId
    next()
  } catch (err) {
    next(new Error('Invalid token'))
  }
})
```

---

#### 5. **⚠️ LOW: Không có Rate Limiting**

**Vấn đề:**
- Client có thể spam events
- Không có throttle cho actions

**Solution:**
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10 // max 10 requests per second
})

socket.use((packet, next) => {
  limiter(socket, next)
})
```

---

## 📋 PRIORITY FIXES

### **🔴 CRITICAL (Phải fix trước khi production)**

1. **Implement Persistent Storage**
   - [ ] File-based persistence (quick fix)
   - [ ] Redis integration (recommended)
   - [ ] Auto-save on every state change
   - [ ] Load on server startup

2. **Add Error Recovery**
   - [ ] Try-catch wrappers
   - [ ] Graceful error handling
   - [ ] Client retry logic
   - [ ] Error logging

### **⚠️ HIGH (Nên fix sớm)**

3. **Horizontal Scaling Support**
   - [ ] Redis Adapter for Socket.IO
   - [ ] Shared state across instances
   - [ ] Load balancer ready

4. **Better Session Management**
   - [ ] Server-side session store
   - [ ] Session expiry
   - [ ] Cleanup inactive rooms

### **✅ MEDIUM (Có thể làm sau)**

5. **Authentication & Authorization**
   - [ ] JWT tokens
   - [ ] User roles
   - [ ] Permission checks

6. **Monitoring & Logging**
   - [ ] Winston logger
   - [ ] Metrics (Prometheus)
   - [ ] Health checks

---

## 🎯 RECOMMENDED ARCHITECTURE (Production-Ready)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  GameBoard   │  │  useSocket   │  │ Zustand Store│          │
│  │  Component   │→ │  + Retry     │→ │  (State)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                  ↓                                     │
│    UI Events          Socket.IO Client + JWT                    │
└─────────────────────────────────────────────────────────────────┘
                              ↕ WebSocket (with auth)
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js Cluster)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Socket Handler│→ │ RoomService  │→ │ GameEngine   │          │
│  │ + Auth       │  │ + Validation │  │ + Try-Catch  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                  ↓                  ↓                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Redis (Persistent + Pub/Sub)              │          │
│  │  - Room data storage                              │          │
│  │  - Socket.IO adapter (multi-instance)             │          │
│  │  - Session store                                  │          │
│  └──────────────────────────────────────────────────┘          │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │         PostgreSQL (Optional - User data)         │          │
│  │  - User accounts                                  │          │
│  │  - Game history                                   │          │
│  │  - Statistics                                     │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 SUMMARY

| Aspect | Current | Recommended | Priority |
|--------|---------|-------------|----------|
| **Data Storage** | In-Memory Map | Redis | 🔴 CRITICAL |
| **Persistence** | None | File/Redis | 🔴 CRITICAL |
| **Scaling** | Single instance | Multi-instance + Redis Adapter | ⚠️ HIGH |
| **Error Handling** | Basic | Comprehensive try-catch | ⚠️ HIGH |
| **Authentication** | None | JWT | ✅ MEDIUM |
| **Rate Limiting** | None | Express rate limit | ✅ MEDIUM |
| **Monitoring** | Console logs | Winston + Prometheus | ✅ LOW |

---

**Kết luận:** 
- ✅ Kiến trúc code tốt, dễ maintain
- ✅ Real-time sync hoạt động tốt
- ❌ **CRITICAL**: Cần implement persistent storage ngay
- ⚠️ Cần thêm error handling và scaling support

**Next Steps:**
1. Implement Redis persistence (1-2 days)
2. Add comprehensive error handling (1 day)
3. Setup Redis Adapter for scaling (1 day)
4. Add authentication (2-3 days)
