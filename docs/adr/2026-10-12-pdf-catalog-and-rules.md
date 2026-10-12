# Catalog PDF và ngoại lệ luật được chủ dự án chốt

Ngày2026-10-12. Owner yêu cầu triển khai database/catalog/admin trước, test kỹ rồi mới xét Android/iOS/store. Việc đóng băng bộ web cũ chỉ còn bảo vệ phòng cũ; owner đã cho thay bộ thẻ cho phiên bản mới sau kiểm chứng.

## Quyết định

- SQLite lưu metadata/URL, ảnh ở media storage; Cloudinary là hướng delivery, chưa có tài khoản/upload secret hoặc upload thực tế.
- Các cảm xúc phối hợp cùng tên/hai nội dung trong PDF là hai mặt cùng thẻ, không phải hai thẻ riêng.
- PDF là nguồn luật, nhưng phải duyệt khác biệt trước khi đổi gameplay.
- Owner giữ thời điểm chọn Bí kíp tự ôm hiện tại, không đưa lên đầu lượt.
- Owner giữ cơ chế Phản tư hiện tại, không chuyển sang mỗi người chọn riêng1–3.
- Owner giữ xoay Người Trao Gửi theo thứ tự hiện tại.
-60Coin:20Đỏ cho NgườiTraoGửi,20Xanh+20Vàng chia người khác; dư không dùng, trao tùy cảm nhận, ghi ledger và thu/reset mỗi lượt. PDF trang3/4 phù hợp baseline đã duyệt, không bật lại legacy +5 thưởng.
- Chọn số lượt ở phòng chờ là task **plan-only** theo request bổ sung, xem `2026-10-12-configurable-round-count.md`; chưa gộp mutation này vào catalog implementation.

## Mapping bản nháp

Nguồn145trang, SHA256 `8dee0c19bc1572e9fa4cd252597b0de82fd79b227de8c6e815fdc285f91c19db`.

-1–6: hướng dẫn/luật, không đưa vào logical game card deck.
-7: mặt sau vai trò;8–17: vai trò in, canonical front8/9/10/12/14/16/17 thành7logical role. Trang11/13/15 là duplicate/variant print instances, giữ ảnh nguồn; không tự tạo role mechanic mới hoặc bỏ ảnh gốc. Cần kiểm physical copies/variant trước activation.
-18: mặt sau Tìnhhuống;19–50:32fronts, light13/medium11/sensitive8 theo số in trên trang.
-51–66:8basic emotion pairs;67–114:24pairs, trong mỗi family một light/một strong/một combination. Combined pages71/72,...113/114 giữ paired content.
-115: mặt sau Phản tư;116–129:14fronts (self8/others4/change2).
-130: mặt sau Bí kíp tự ôm;131–145:15fronts (calm5/connection6/emotion4).

Các tên “Tình huống N”/“Phản tư N” là label editor dựa trên index, không phải tên được in trong PDF. Definition/prompt chưa transcription nên seed **reviewed=false**; không tự chứng nhận content đầy đủ. Admin cho sửa tên/mã/order/nội dung/cặp mặt và archival flag, không hard-delete source.

## Implementation và gate

Follow-up: `../qa/2026-10-12-published-pdf-catalog.md` supersedes the draft-only notes below. Text, role binding, activation/rollback, room-version pinning, public read/hash hydration and new-deck local regressions are implemented. Earlier notes are preserved as historical checkpoints, not current release claims.

Real SQLite store dùng WAL/FULL/busy_timeout, transactions, unique code/ID, global optimistic draft revision, durable UUID4 operation receipts, immutable **prepared** snapshots. `node:sqlite` ở Node22.23.3 hiện báo experimental; pin/runtime QA cần giữ, không gọi API stable trên mọi Nodeversion.

Authenticated catalog GET/save đi qua existing admin session/origin/header guard. Login limit4KB không đổi; catalog save limit32KB. Response no-store, không mở public draft endpoint. FE editor freeze pending/unknown intent và retry cùng requestId; known conflict giữ local edit; confirm-save/refetch failure không gửi lại mutation. Preview media allowlist local card paths/Cloudinary HTTPS.

Chưa activation: active-game resolver/catalog vẫn frozen legacy, không có publish/activate API. Snapshot preparation không đổi phòng hoặc rules. Cần metadata/pair review, explicit role semantic binding, room-version pinning, published-only read endpoint +FE catalog hydration và regression mới trước cutover. Không được gắn “pass luật mới” cho tests chạy legacy deck.

Catalog file nằm `be/data/catalog.sqlite` mặc định, dùng existing backend persistent data volume; không có DB container mới. Database không chứa image binaries, room/session/coin/player content. Runtime DB không commit vào source. Catalog backups/export lâu dài cần approval/config riêng với policy không backup room.
