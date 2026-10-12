# Số lượt chọn trong phòng chờ

Ngày: 2026-10-12. Owner đã yêu cầu “triển khai đi bro”; implementation local đang kiểm chứng. Không deploy/store trong task này.

## Yêu cầu đã chốt

- Quản trò chọn số lượt ở phòng chờ để ván 10 người không bắt buộc dài10lượt.
- Khoảng chọn1đến số người chơi hiện có, tối đa10. Với5người:1–5; với10người:1–10.
- Giữ xoay Người Trao Gửi theo thứ tự đã duyệt. Đây là số **lượt/vòng chơi**, không phải số người hoặc vòng phase; mỗi lượt vẫn đủ toàn bộ phase và60Coin reset.

## Đề xuất mặc định và xử lý roster

- Mặc định “Mỗi người một lượt” = số người hiện có; chế độ tự động cập nhật theo roster tới khi bắt đầu. Giá trị server mới tạo room có thể chưa đủ số người để start; giữ min-player gate hiện tại, không cho chơi1người chỉ vì chọn1lượt.
- Khi quản trò chọn tay, lưu lựa chọn rõ ràng; người mới vào không tự tăng số lượt. Nếu roster giảm dưới số đã chọn, đánh dấu cấu hình không hợp lệ và yêu cầu quản trò chọn lại/xác nhận trước start, không âm thầm sửa một intent đang chờ ACK.
- UI note: “Ván ngắn: không phải tất cả người chơi đều có lượt làm Người Trao Gửi.” Giữ số lượt, giới hạn và lựa chọn đã xác nhận đồng bộ mọi client.
- Đóng băng tổng số lượt ở start_game; không đổi giữa ván, không tăng/giảm khi disconnect/reconnect. Ván1lượt đi tới ended sau đầy đủ end-of-round ledger; totalRounds phải được phục hồi sau reload/restart.
- Thứ tự người làm NTG cho ván rút gọn giữ thuật toán hiện tại; không ngẫu nhiên hóa/chọn host mới hoặc hứa công bằng qua nhiều ván khi chưa có cơ chế đó.

## Implementation plan

1. R01/R04: thêm contract setting có phân biệt auto/custom và số nguyên, không float/string/NaN/out-of-range. Không nhận totalRounds tùy ý từ client start_game. Derive nSeats từ roster server.
2. R05/R07: update_room_settings chỉ host của phòng waiting, revision/session/auth đúng, serialization tới durable commit. Config ACK/broadcast cùng confirmed revision; duplicate/late/error không start ngầm.
3. R06/R16: `GameEngine` start-game path hiện gán `totalRounds: room.players.length`; đổi sang snapshot số lượt đã validate. next_turn/terminal dùng giới hạn snapshot, không tính lại theo players.length. Room cũ thiếu setting giữ default lịch sử, không rút ngắn ván đang chơi.
4. R18/R21/R23: WaitingRoom control rõ1–N, auto default, disabled cho non-host/pending; live note và validation khi roster đổi. Keyboard/touch, small viewport320px, cả hai theme; Back/Esc không làm mất mutation đang chờ.
5. R27/R28/R29: regression dưới đây trên actual server/browser rồi realRedis persistence; update hướng dẫn/quy tắc các ngoại lệ PDF trước phát hành.

## Acceptance / tests

-5người×1/3/5lượt,10người×1/5/10lượt: đúng số lượt, từng lượt Coin20Đỏ+20Xanh+20Vàng, ledger/reset/remainder không thay.
- Default auto theo roster; chọn tay không tăng khi join; leave làm lựa chọn vượt max phải block start và nêu lý do. Không chặn reconnect của seat đang trong ván.
- Non-host, sairoom, stale session/revision, duplicate, invalid0/11/float/string, setting mutation trong playing/ended đều reject.
- Race join/leave/settings/start: không start với snapshot ngoài giới hạn; server là nguồn authority, UI optimistic không quyết định số vòng.
- Mất ACK/reload/resume/server restart giữ tổng đã chốt, không Coin hai lần; cuối ván1lượt và10lượt hydration/summary/exit đúng.
- Ván rút gọn không ép tất cả người chơi làm NTG; không bỏ phase/giảm Coin để đạt tổng nhanh hơn.

## Câu hỏi không chặn ghi plan

Owner yêu cầu triển khai theo plan này. Default auto/custom và chặn start khi roster giảm được thực hiện; không thay min5players/role rotation/60Coin hoặc các ngoại lệ PDF đã duyệt.

## Contract implementation

`set_round_limit {roomId,limit:null|integer,expectedRevision,requestId:UUID4}` chỉ host/waiting qua existing seat/session/room queue và primary storage guard.500msaction pacing;20receipt cuối lưu trong room, replay đúng intent không ghi thêm revision. Receipt không phát cho client. ACK có recipient-safe RoomView và confirmed revision. Thêm `roundLimit` vào snapshot; room cũ thiếu field =auto. `start_game` mới gửi expectedRevision; server check nếu có, giữ tương thích client cũ không gửi nhưng vẫn validate limit khi start.

GameEngine snapshot `totalRounds` một lần ở start; terminal/round-ledger dùng số đã đóng băng. FE giữ cùng round-limit intent/requestId khi ACK timeout và không chấp nhận thành công thiếu snapshot. Control trong waiting chỉ host sửa, dirty/pending/invalid chặn start; pending chặn leave vàBack/Esc. Join không tăng custom count; giảm roster không clamp ngầm. No auto start/offline mutation.

## QA result

Local implementation verified: FE722/BE647regular tests, TypeScript/build/lint pass;90UI matrix pass; two actual browser5/10guest flows pass with custom1/3counts; isolated realRedis AOF kill/restart confirms roundLimit/frozen total recovered. Rollover tests cover1/3/5/10rounds and ledger collection; no production/native/device/store claim. Evidence and failure history: `../qa/2026-10-12-round-limit.md`.
