# EmCoin Game - Hướng dẫn triển khai

## Tổng quan
Game EmCoin đã được triển khai với các tính năng cơ bản:

### Đã hoàn thành
1. ✅ Giao diện Lobby (tạo/tham gia phòng)
2. ✅ Waiting Room (chờ người chơi)
3. ✅ GamePlay với các component:
   - Top bar hiển thị coins của user
   - Player grid hiển thị danh sách người chơi
   - Card decks với hiệu ứng xòe ra
   - Chat box realtime
4. ✅ Các loại thẻ bài: Vai trò, Tình huống, Cảm xúc, Phản tư, Bí kíp tự ôm
5. ✅ Hệ thống coins (Đỏ, Vàng, Xanh)

### Cần bổ sung
1. ⏳ Socket events cho game logic:
   - Rút thẻ bài
   - Chọn vai trò
   - Gửi/nhận chat messages
   - Trao coins cho người chơi
   - Cập nhật trạng thái game phases

2. ⏳ Backend game logic:
   - Quản lý các phase của game
   - Phân phối vai trò
   - Xử lý logic "Người Im Lặng", "Người Chữa Lành"
   - Lưu trữ state của game

3. ⏳ Các tính năng nâng cao:
   - Animation khi rút thẻ
   - Sound effects
   - Timer cho mỗi phase
   - Voting system
   - End game summary

## Cấu trúc file

### Frontend
```
fe/src/
├── types/
│   └── game.ts              # Game types & interfaces
├── data/
│   └── cards.ts             # Card data (role, situation, emotion, etc.)
├── components/game/
│   ├── CoinDisplay.tsx      # Hiển thị coins
│   ├── CardDeck.tsx         # Bộ thẻ bài với hiệu ứng xòe
│   ├── ChatBox.tsx          # Chat realtime
│   └── PlayerGrid.tsx       # Grid người chơi
└── pages/
    ├── Lobby.tsx            # Màn hình lobby
    ├── WaitingRoom.tsx      # Phòng chờ
    ├── GamePlay.tsx         # Màn hình chơi game
    └── GameContainer.tsx    # Container quản lý state

### Backend
```
backend/src/
├── socket.js                # Socket handlers
├── rooms.js                 # Room management
└── persistence.js           # Data persistence
```

## Hướng dẫn chạy

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd fe
npm install
npm run dev
```

## Các bước tiếp theo

1. Thêm socket events cho game logic trong `backend/src/socket.js`
2. Cập nhật room state để lưu game state trong `backend/src/rooms.js`
3. Thêm handlers trong `fe/src/hooks/useSocket.ts` cho các events mới
4. Implement game phases logic
5. Thêm animations và transitions
6. Testing và bug fixes

## Game Flow

1. **Lobby** → Tạo/tham gia phòng
2. **Waiting Room** → Chờ đủ người (2-8 người)
3. **Game Start** → Host bấm "Bắt đầu"
4. **Phase 1: Vai trò bí ẩn** → Rút thẻ vai trò
5. **Phase 2: Mở câu chuyện** → NTG kể chuyện, chọn cảm xúc
6. **Phase 3: Khám phá** → Rút thẻ phản tư
7. **Phase 4: Ôm tất cả** → Thực hiện bí kíp tự ôm
8. **Phase 5: Đoán vai** → Bình chọn "Người Im Lặng"
9. **Phase 6: Khép lại** → Trao coins, chia sẻ
10. **Repeat** → Chọn NTG mới, bắt đầu vòng mới

## Notes

- Theme đã được chuyển sang light mode only
- Sử dụng Framer Motion cho animations
- Socket.io cho realtime communication
- Tailwind CSS cho styling
