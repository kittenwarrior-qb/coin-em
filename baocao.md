# Project EmCoin

## 1. Tổng quan app

### 1.1 Techstack

| Layer | Tech | Dùng để làm gì |
|---|---|---|
| Backend | Node.js + Express | HTTP server, REST API, Socket.IO server |
| Realtime | Socket.IO | Đồng bộ trạng thái game giữa các client |
| Frontend | React + Vite | SPA, Socket.IO client |
| State FE | Zustand | Quản lý global state phía client |
| Unit test | Vitest | Kiểm thử logic nghiệp vụ backend |
| Integration test | Vitest + socket.io-client | Kiểm thử luồng socket trong process: join room → start game → phase transitions |
| E2E test | Playwright | Kiểm thử giao diện đa người dùng, kiểm tra sync realtime |
| Container | Docker | Đóng gói project, orchestrate môi trường dev/prod |
| Network | Caddy | Reverse proxy, tự động HTTPS |
| Storage | Redis + JSON file (backup) | Redis là primary store; JSON file là fallback khi restart |
| Pub/Sub | Redis Adapter (Socket.IO) | Đồng bộ Socket.IO events giữa nhiều container backend |
| CI/CD | GitHub Actions | Build, test, deploy GitHub → VPS |

### 1.2 Tradeoff

- Node.js chạy single-thread → dùng Redis Adapter + nhiều container để tận dụng nhiều core
- Redis là in-memory → bật AOF persistence để tránh mất data khi restart
- JSON file vẫn giữ lại làm backup layer (ghi per-room, debounce 3s)

---

## 2. Các luồng chính

### 2.1 Nhận diện user

- Frontend kết nối Socket.IO, gửi `join_room` kèm `{ userId, name, roomId }`
- Server lưu player vào room với cả `socketId` và `userId`
- Mất kết nối: nếu game đang chạy thì giữ nguyên player trong room
- Reconnect: gửi `reconnect_room` với `userId` cũ → server cập nhật `socketId` mới, tiếp tục session

### 2.2 Tạo, lưu, xóa room data

- Client gửi `join_room` với `createIfMissing: true` để server tạo room mới
- Mỗi thay đổi → ghi ngay vào Redis (`room:{roomId}`) + debounce 3s ghi file `data/rooms/{roomId}.json`
- Server restart → load toàn bộ room từ Redis (AOF đảm bảo data còn đó); JSON file là fallback thủ công nếu cần
- Mỗi 1 giờ → dọn room rỗng hoặc không hoạt động quá 24 giờ (xóa cả Redis key lẫn file)
- Người cuối rời phòng (lúc đang chờ) → room bị xóa ngay

### 2.3 Tính coin

- Khởi tạo: mỗi người nhận vàng = số người trong phòng, đỏ = 3, xanh = 0
- Cơ chế thưởng coin vàng:
  - NTG chia sẻ phản tư (`reflection-sharing`): NTG +5 vàng
  - NTG vote người phản hồi hay nhất (`group-response`): người được vote +5 vàng
  - Người Kết Nối / Người Gợi Mở: phản hồi + được NTG vote → +5 vàng; chỉ phản hồi → +2 vàng
  - Người Dẫn Lối: hoàn thành role + phản hồi + được NTG vote → +5 vàng; chỉ phản hồi → +2 vàng
  - Người Im Lặng: không bị đoán ra → +7 vàng; bị đoán ra → +2 vàng
  - NTG: nhóm đoán đúng Người Im Lặng → +N xanh; đoán sai → +(N-3) xanh (N = số người chơi)
- Nếu Người Kết Nối / Người Gợi Mở / Người Dẫn Lối bị mute thì không được vàng

### 2.4 Logic gameplay theo từng phase

| Phase | Mô tả |
|---|---|
| `role-reveal` | Mỗi người chơi được phân role và hiện vai trò round này |
| `night` | Đêm bắt đầu (logic frontend) |
| `healer-turn` | Người Chữa Lành hành động |
| `silencer-turn` | Người Im Lặng hành động |
| `situation-card` | NTG rút thẻ tình huống |
| `emotion-card` | NTG rút thẻ cảm xúc |
| `story-telling` | NTG kể chuyện |
| `group-response` | Cả nhóm phản hồi, NTG vote người phản hồi hay nhất (+5 vàng) |
| `reflection-card` | Rút thẻ phản tư |
| `reflection-sharing` | NTG chia sẻ phản tư |
| `selfcare-card` | Quản trò hoặc Người Dẫn Lối rút thẻ bí kíp tự ôm (tránh lộ role) |
| `hug-action` | Hành động kết nối |
| `guess-silencer` | Vote đoán Người Im Lặng |
| `reveal-silencer` | Công bố kết quả và toàn bộ role |
| `give-coins` | Các người chơi tặng coin vàng và đỏ |
| `reward` | Tổng kết lượt, thống kê coin → lặp lại từ đầu hoặc kết thúc game |

---

## 3. Kiến trúc hệ thống

```
[Client Browser]
      │ Socket.IO / HTTPS
      ▼
[Caddy] ── reverse proxy, TLS termination
      │
      ├── /api/*  ──────────────► [Backend container(s)]
      └── /socket.io/*  ────────► [Backend container(s)]  ← ip_hash (sticky session)
                                        │
                                   [Redis container]
                                   - Primary store (room state)
                                   - Socket.IO pub/sub adapter
                                   - AOF persistence
```

---

## 4. Plan tối ưu hiệu năng

### Giai đoạn 1 — Đã hoàn thành ✅

| Thay đổi | Chi tiết |
|---|---|
| Tách file JSON per-room | `data/rooms/{roomId}.json` thay vì 1 file duy nhất |
| Tăng debounce lên 3s | Giảm số lần ghi disk |
| Atomic write | Ghi `.tmp` rồi `rename` để tránh corrupt |
| Build TypeScript | Dockerfile dùng `tsc` + `node dist/index.js` thay vì `tsx` |

### Giai đoạn 2 — Đã hoàn thành ✅

| Thay đổi | Chi tiết |
|---|---|
| Redis làm primary store | `RoomRepository` ghi/đọc Redis, in-memory Map làm cache |
| Socket.IO Redis Adapter | `@socket.io/redis-adapter` — nhiều container share events |
| Redis container | `redis:7-alpine` với AOF, healthcheck, volume persistent |
| `/metrics` endpoint | rooms, uptime, memory, pid |

### Giai đoạn 3 — Sẵn sàng scale

Sau khi có Redis, scale backend lên nhiều container chỉ cần:

```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 3
```

Cập nhật Caddyfile thêm `lb_policy`:

```
handle /api/* {
    reverse_proxy backend:3001 {
        lb_policy round_robin
    }
}
handle /socket.io/* {
    reverse_proxy backend:3001 {
        lb_policy ip_hash
    }
}
```

| Config | Trước | Sau giai đoạn 2 | Sau giai đoạn 3 |
|---|---|---|---|
| 3 core / 3GB RAM | ~100–150 users | ~150–200 users | ~300–600 users |
