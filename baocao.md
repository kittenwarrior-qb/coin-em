## 3. Plan tối ưu hiệu năng

### Bối cảnh hiện tại

Stack hiện tại: Node.js + Express + Socket.IO, lưu trữ bằng `rooms.json` (1 file duy nhất), chạy trong Docker với Caddy làm reverse proxy, pm2 để monitor.

Bottleneck chính:
- Node.js chạy 1 process → chỉ dùng 1 core, lãng phí 2 core còn lại
- Mỗi lần có action (vote, give_coin, next_turn...) → ghi toàn bộ `rooms.json` dù chỉ 1 room thay đổi
- pm2 thừa khi đã có Docker (`restart: always` đã lo việc recover)

Giới hạn thực tế hiện tại: ~100–150 concurrent users ổn định.

---

### Giai đoạn 1 — Dọn dẹp + tách file JSON (không đổi kiến trúc)

**Mục tiêu:** giảm I/O bottleneck, bỏ layer thừa

#### 1.1 Bỏ pm2, chạy Node trực tiếp trong Docker

pm2 thừa khi đã có Docker. `restart: always` trong compose đã xử lý crash recovery.

Sửa Dockerfile.prod: thay `CMD ["pm2-runtime", ...]` thành `CMD ["node", "dist/index.js"]`

Lợi ích: bỏ 1 layer, giảm memory overhead ~20–30MB, log đơn giản hơn.

#### 1.2 Tách `rooms.json` thành file riêng theo room

Hiện tại: mỗi action → ghi toàn bộ `rooms.json` (tất cả room).
Sau: mỗi room lưu `data/rooms/{roomId}.json` → chỉ ghi file của room đang thay đổi.

File cần sửa: `be/src/persistence.ts`, `be/src/modules/room/repository/RoomRepository.ts`

#### 1.3 Tăng debounce từ 1s lên 3s

Game có nhiều event liên tiếp (vote → give_coin → next_turn trong vài giây). Debounce 1s vẫn trigger nhiều lần không cần thiết.

File cần sửa: `be/src/persistence.ts` — đổi `1000` thành `3000`

---

### Giai đoạn 2 — Redis (thay storage, bước quan trọng nhất)

**Mục tiêu:** loại bỏ file I/O hoàn toàn, cho phép scale nhiều container

#### 2.1 Thêm Redis vào docker-compose.prod.yml

```yaml
redis:
  image: redis:7-alpine
  container_name: emcoin-redis
  restart: always
  volumes:
    - redis-data:/data
  networks:
    - emcoin-network
```

#### 2.2 Thay RoomRepository dùng Redis thay vì Map in-memory

`RoomRepository` hiện dùng `Map<string, Room>` → thay bằng Redis (`ioredis`).
- `findById` → `redis.get(roomId)` + JSON.parse
- `save` → `redis.set(roomId, JSON.stringify(room))`
- `delete` → `redis.del(roomId)`

Packages cần thêm: `ioredis`

#### 2.3 Thêm Socket.IO Redis Adapter

Cần thiết để nhiều container backend share cùng Socket.IO rooms/events.

Package: `@socket.io/redis-adapter`

Sửa `be/src/index.ts`:
```ts
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'ioredis'

const pubClient = createClient({ host: 'redis', port: 6379 })
const subClient = pubClient.duplicate()
io.adapter(createAdapter(pubClient, subClient))
```

#### 2.4 Giữ file JSON làm snapshot backup

Redis mất data khi restart nếu không config persistence. Giải pháp:
- Bật Redis AOF persistence trong config (`appendonly yes`)
- Hoặc giữ job snapshot mỗi 5 phút ra file JSON (không phải mỗi action)

---

### Giai đoạn 3 — Scale nhiều container (sau khi có Redis)

**Mục tiêu:** tận dụng 3 core VPS, tăng concurrent users lên 300–600

#### 3.1 Scale backend lên 3 container

```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 3
```

Hoặc dùng: `docker compose up --scale backend=3`

#### 3.2 Cập nhật Caddyfile để load balance

```
handle /api/* {
    reverse_proxy backend:3001 {
        lb_policy round_robin
    }
}
handle /socket.io/* {
    reverse_proxy backend:3001 {
        lb_policy ip_hash   # sticky session cho WebSocket
    }
}
```

`ip_hash` quan trọng cho Socket.IO — đảm bảo cùng 1 client luôn vào cùng 1 container (dù đã có Redis adapter, sticky session vẫn giảm overhead).

#### 3.3 Thêm metrics endpoint để monitor

```ts
app.get('/metrics', (_, res) => res.json({
  rooms: roomRepository.count(),
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  pid: process.pid,
}))
```

---

### Thứ tự thực hiện

| Bước | Effort | Impact | Rủi ro |
|---|---|---|---|
| 1.1 Bỏ pm2 | rất thấp | nhỏ | không |
| 1.3 Tăng debounce | rất thấp | nhỏ | không |
| 1.2 Tách file JSON | thấp | trung bình | thấp |
| 2.1–2.3 Redis | trung bình | rất cao | trung bình |
| 3.1–3.2 Scale + Caddy LB | thấp (sau Redis) | cao | thấp |

**Kết quả kỳ vọng sau tối ưu:**

| Config | Trước | Sau |
|---|---|---|
| 3 core / 3GB RAM | ~100–150 users | ~300–600 users |

---
