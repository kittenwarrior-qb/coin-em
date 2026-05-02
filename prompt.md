Tôi đang xây dựng một game realtime nhiều người (10 players/room) giống Ma Sói, sử dụng:

* Frontend: ReactJS (Vite + Zustand + Socket.IO client)
* Backend: NodeJS (Express + Socket.IO)

Hiện tại kiến trúc đã tách rõ:
Socket Handler → Service → GameEngine → Repository

Tuy nhiên tôi muốn thiết kế lại hệ thống theo hướng:

* Production-ready
* Không mất data
* Realtime ổn định
* Có thể scale nhiều room
* Logic game không bị bug (đặc biệt là turn/phase)

---

# I. Yêu cầu QUAN TRỌNG NHẤT

Hãy thiết kế hệ thống với các nguyên tắc:

1. Server là single source of truth
2. Client chỉ render UI (không chứa game logic)
3. Game loop phải chạy hoàn toàn server-side
4. Tránh race condition trong realtime
5. Có lifecycle rõ ràng cho:

   * Room
   * Player
   * Game

---

# II. Thiết kế USER IDENTITY (không login)

Tôi KHÔNG muốn dùng:

* IP
* browser fingerprint

Hãy thiết kế:

* userId (UUID)
* lưu ở client (localStorage)
* reconnect flow khi reload page
* mapping userId ↔ socketId

---

# III. ROOM & DATA STORAGE DESIGN

Hãy đề xuất:

1. Data structure cho Room:

* id
* players
* phase
* roles
* actions
* timestamps

2. So sánh:

* In-memory
* File persistence
* Redis

3. Đề xuất giải pháp phù hợp:

* dev
* production

4. Thiết kế schema Redis:

* key structure
* TTL (auto cleanup)
* cách lưu room state

---

# IV. GAME ENGINE DESIGN (QUAN TRỌNG NHẤT)

Hãy thiết kế chi tiết:

1. Game State:

* phases: waiting → night → day → voting → end
* player state: alive, dead, role

2. State Machine:

* chuyển phase như thế nào
* điều kiện chuyển phase

3. Game Loop (server controlled):

* không phụ thuộc client
* có timeout (ví dụ: night 30s)

4. Action system:

* validate action
* xử lý action
* resolve conflict (nhiều action cùng lúc)

5. Output:

* trả về state mới
* emit event

---

# V. SOCKET EVENT ARCHITECTURE

Thiết kế lại event system:

1. Client → Server:

* join_room
* perform_action
* vote

2. Server → Client:

* game_update (single source)
* phase_changed

3. Nguyên tắc:

* không spam nhiều event nhỏ
* ưu tiên 1 event = full state sync

---

# VI. RECONNECT SYSTEM

Thiết kế:

* user reload page
* reconnect vào room
* restore state

Edge cases:

* đang giữa turn
* player đã chết
* game đã end

---

# VII. ROOM LIFECYCLE & CLEANUP

Thiết kế hệ thống:

1. Room lifecycle:

* waiting → playing → idle → expired → deleted

2. Player lifecycle:

* connected
* disconnected
* timeout

3. Cleanup rules:

* room không có người → xoá
* player inactive → remove
* TTL cho room

4. Cron job cleanup

---

# VIII. ERROR HANDLING & SAFETY

Thiết kế:

* try-catch toàn bộ game engine
* validation layer
* anti-spam
* anti-invalid action

---

# IX. SCALING STRATEGY

Hãy giải thích:

* Khi nào cần Redis
* Khi nào cần Socket.IO Redis Adapter
* Cách scale nhiều server

---

# X. OUTPUT MONG MUỐN

Hãy trả lời với:

1. Kiến trúc tổng thể (diagram text)
2. Game Engine design chi tiết (quan trọng nhất)
3. Redis schema
4. Room lifecycle flow
5. Reconnect flow
6. Ví dụ code:

   * Game loop
   * Action handler
   * Cleanup job
7. Best practices từ các game/app lớn

---

# XI. CONTEXT HIỆN TẠI

Đây là kiến trúc hiện tại của tôi:
[paste kiến trúc ở đây]

---

# XII. MỤC TIÊU CUỐI

Tôi muốn:

* hệ thống ổn định khi có nhiều người chơi
* không mất dữ liệu khi restart
* không bug logic game
* dễ mở rộng thêm game mode khác
