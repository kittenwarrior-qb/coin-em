# CoinEm — Bộ thẻ giáo dục cảm xúc

CoinEm là trò chơi thẻ bài kết hợp nhập vai giúp học sinh 10–19 tuổi học cách nhận diện, gọi tên và chia sẻ cảm xúc trong một môi trường an toàn. Dự án thuộc chương trình **UPSHIFT** do AIESEC Việt Nam phối hợp UNICEF tổ chức.

---

## Tech stack

| Layer | Công nghệ |
|---|---|
| Backend | Node.js + Express + Socket.IO |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Animation | Framer Motion |
| State FE | Zustand |
| Storage | Redis (primary) + JSON file (fallback) |
| Pub/Sub | Socket.IO Redis Adapter |
| Reverse proxy | Caddy (tự động HTTPS) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions → VPS |
| Unit test | Vitest |
| E2E test | Playwright |

---

## Cấu trúc project

```
coinem/
├── be/               # Backend Node.js
│   ├── src/
│   │   ├── modules/game/   # Game engine, phases, roles, coin logic
│   │   └── socket/         # Socket.IO handlers
│   └── tests/
├── fe/               # Frontend React
│   ├── src/
│   │   ├── components/     # UI components (cartoon, game, lobby)
│   │   ├── hooks/          # useSocket, useAssetPreloader, ...
│   │   └── pages/          # Lobby, GameBoard, GameContainer
│   └── public/
│       └── guide/          # Ảnh hướng dẫn (slide-01.png → slide-14.png)
├── e2e/              # Playwright tests
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Caddyfile
└── Makefile
```

---

## Chạy local (dev)

```bash
# Khởi động toàn bộ stack
docker compose -f docker-compose.dev.yml up

# Hoặc chạy riêng lẻ
cd be && npm install && npm run dev   # backend :3001
cd fe && npm install && npm run dev   # frontend :5173
```

---

## Deploy production

```bash
# Build + push lên VPS qua CI/CD
git push origin main

# Hoặc chạy tay trên VPS
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy tự xử lý TLS. Đảm bảo domain đã trỏ về IP VPS trước khi deploy.

---

## Gameplay

Mỗi **lượt chơi** gồm 16 phase theo thứ tự:

| Phase | Mô tả |
|---|---|
| `role-reveal` | Mỗi người được phân vai và xem bí mật role của mình |
| `night` | Đêm bắt đầu |
| `healer-turn` | Người Chữa Lành chọn 1 người để bảo vệ |
| `silencer-turn` | Người Im Lặng chọn 1 người để im lặng vòng này |
| `situation-card` | Người Trao Gửi rút thẻ tình huống |
| `emotion-card` | Người Trao Gửi rút thẻ cảm xúc |
| `story-telling` | Người Trao Gửi kể câu chuyện (60 giây) |
| `group-response` | Nhóm phản hồi; NTG vote người phản hồi hay nhất |
| `reflection-card` | NTG rút thẻ phản tư |
| `reflection-sharing` | NTG chia sẻ phản tư |
| `selfcare-card` | Người Dẫn Lối (hoặc NTG) rút thẻ bí kíp ôm |
| `hug-action` | Cả nhóm thực hiện hành động kết nối |
| `guess-silencer` | Mọi người vote đoán ai là Người Im Lặng |
| `reveal-silencer` | Tiết lộ kết quả + toàn bộ role |
| `give-coins` | Người chơi tặng coin cho nhau |
| `reward` | Tổng kết lượt, thống kê coin → lặp lại hoặc kết thúc |

### Các vai trò

| Vai | Nhiệm vụ |
|---|---|
| 🎭 Quản Trò | Điều hành, đọc hướng dẫn, không bị phân role đặc biệt |
| 💌 Người Trao Gửi | Chia sẻ câu chuyện cảm xúc thật |
| 💚 Người Chữa Lành | Mỗi đêm bảo vệ 1 người khỏi bị im lặng |
| 🤐 Người Im Lặng | Mỗi đêm chọn 1 người không thể phát biểu |
| 🔗 Người Kết Nối | Phản hồi gắn kết câu chuyện với nhóm |
| ✨ Người Gợi Mở | Đặt câu hỏi chạm sâu vào cảm xúc |
| 🗺️ Người Dẫn Lối | Hướng dẫn phần chăm sóc bản thân |

### Hệ thống coin

| Coin | Ý nghĩa |
|---|---|
| 🔴 Đỏ | Nhận 3 coin mỗi vòng, có thể tặng cho người khác |
| 💛 Vàng | Tích lũy; nhận khi hoàn thành vai trò xuất sắc |
| 💚 Xanh | Nhận được khi người khác tặng coin cho bạn |

**Cơ chế thưởng vàng:**
- NTG hoàn thành chia sẻ phản tư → **+5 💛**
- Người được NTG vote phản hồi hay nhất → **+5 💛**
- Người Kết Nối / Gợi Mở / Dẫn Lối chỉ phản hồi → **+2 💛**
- Người Im Lặng không bị đoán ra → **+7 💛**; bị đoán ra → **+2 💛**
- Người Im Lặng bị mute không được thưởng vàng

---

## Kiến trúc hệ thống

```
[Browser]
    │ Socket.IO + HTTPS
    ▼
[Caddy]  ── reverse proxy, TLS
    ├── /api/*      → [Backend]
    └── /socket.io/* → [Backend]  (ip_hash sticky session)
                          │
                      [Redis]
                      - Room state (primary store)
                      - Socket.IO pub/sub adapter
                      - AOF persistence
```

Để scale ngang: tăng `replicas` trong `docker-compose.prod.yml` — Redis Adapter tự đồng bộ events giữa các container.

---

## Thêm ảnh hướng dẫn

Ảnh slideshow hướng dẫn được đặt tại `fe/public/guide/`. Đặt tên file theo định dạng:

```
fe/public/guide/slide-01.png
fe/public/guide/slide-02.png
...
fe/public/guide/slide-14.png
```

Kích thước đề xuất: **1080 × 1920 px** (portrait). App tự nhận, không cần thay đổi code.

---

## Liên hệ

- Email: emcoin.nnn@gmail.com
- Dự án: Đồng Tiền Tử Tế — UPSHIFT / AIESEC × UNICEF Việt Nam
