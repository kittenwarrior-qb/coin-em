# Refactor: Dùng userId thay vì socketId

## Vấn đề
- `socket.id` thay đổi mỗi khi reconnect
- Gây ra lỗi sai role, sai host, sai narrator
- Không thể track đúng người chơi khi reload trang

## Giải pháp
Dùng **userId ổn định** thay vì socketId cho tất cả logic game:
- `userId` được tạo 1 lần và lưu vào localStorage
- Backend track cả `userId` (ổn định) và `socketId` (thay đổi)
- Tất cả logic game dùng `userId` để identify người chơi
- Khi reconnect, chỉ cần update `socketId` mới

## Thay đổi

### Frontend

#### 1. `fe/src/utils/userId.ts` (NEW)
- Tạo và lưu `userId` vào localStorage
- `getUserId()`: Lấy hoặc tạo userId mới

#### 2. `fe/src/hooks/useSocket.ts`
- Import `getUserId()`
- Gửi `userId` khi join_room và reconnect_room
- Lưu `userId` vào session

#### 3. `fe/src/pages/GameBoard.tsx`
- Nhận prop `myUserId`
- Match player bằng `userId` thay vì `socketId`
- Log để debug

#### 4. `fe/src/pages/GameContainer.tsx`
- Lấy `myUserId` từ `getUserId()`
- Truyền `myUserId` vào GameBoard và WaitingRoom

#### 5. `fe/src/pages/WaitingRoom.tsx`
- Nhận prop `myUserId`
- So sánh host bằng `userId` thay vì `socketId`

### Backend

#### 1. `be/src/rooms.js`
- Update comment: `host` là `userId` (không phải socketId)
- `createRoom()`: Dùng `host.userId`
- `startGame()`: Match host bằng `userId`
- `removePlayer()`: Update host bằng `userId`
- `addFakePlayers()`: Fake players có cả `userId` và `socketId` giống nhau

#### 2. `be/src/gamePhases.js`
- `nextTurn()`: Match narrator bằng `userId`
- `rotateRoles()`: Update `currentNarrator` và `currentNTG` bằng `userId`
- `nightAction()`: Lưu `mutedPlayer` và `healedPlayer` bằng `userId`

#### 3. `be/src/gameActions.js`
- `healerAction()`: Lưu `healedPlayer` bằng `userId`
- `silencerAction()`: Lưu `mutedPlayer` bằng `userId`, log bằng `userId`
- `giveCoin()`: Match player bằng `userId`, log bằng `userId`
- `submitVote()`: Lưu vote bằng `userId`
- `calculateScores()`: Return cả `userId` và `socketId`

#### 4. `be/src/socket.js`
- `join_room`: Nhận `userId`, check duplicate bằng `userId`
- `reconnect_room`: Đơn giản hóa - chỉ update `socketId`, không update host/narrator/NTG (vì đã dùng userId)

## Lợi ích
✅ Không bao giờ bị sai role sau reconnect  
✅ Host luôn đúng người  
✅ Narrator luôn đúng người  
✅ Reload trang vẫn giữ đúng identity  
✅ Logic đơn giản hơn, ít bug hơn  

## Test
1. Xóa `be/data/rooms.json`
2. Tạo phòng mới
3. Thêm bot
4. Bắt đầu game
5. Kiểm tra host là Quản trò
6. Reload trang → Vẫn đúng role
7. Click vào card → Mở đúng vai trò của mình
