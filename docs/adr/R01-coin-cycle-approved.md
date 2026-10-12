# R01 — Quyết định vòng đời coin

Ngày: 2026-10-01. Nguồn quyết định: chỉ dẫn trực tiếp của chủ dự án trong task này.
Trạng thái: quy tắc coin đã xác nhận; toàn bộ ruleset R01 vẫn chờ các quyết định khác.
Mã tài liệu: `coin-cycle-60/v1`; đây chưa phải runtime rulesVersion hay schema migration.

## Quy tắc đã xác nhận

- Mỗi lượt có 60 coin: 20 đỏ, 20 xanh, 20 vàng.
- Đầu lượt Người Trao Gửi nhận 20 đỏ; mỗi người còn lại nhận `floor(20 / (N - 1))` xanh và cùng số vàng. Phần dư mỗi màu không sử dụng.
- Đỏ: người kể trao cho người phản hồi khiến mình cảm thấy được an ủi, thấu hiểu.
- Xanh: người chơi trao cho người kể.
- Vàng: người chơi trao cho nhau để ghi nhận, khích lệ.
- Coin được trao theo cảm nhận; có thể giữ lại coin chưa trao, không yêu cầu dùng hết.
- Cuối lượt ghi số coin mỗi người nhận được, thu hồi toàn bộ coin và chia lại ở lượt tiếp theo.

## Ràng buộc triển khai

Giữ nguyên màu của coin nhận; không chuyển mọi coin nhận thành xanh như source cũ.
Phân biệt coin có thể trao trong lượt với coin đã nhận và sổ ghi nhận cuối lượt;
coin đã nhận không được tự đưa vào số dư có thể trao. Đây là cách biểu diễn đề xuất,
cần ghi trong contract R04 trước khi nối vào runtime.
Không mang số dư vật lý sang lượt kế tiếp. Mọi thay đổi phải bảo toàn 20 coin mỗi màu,
bao gồm coin chưa dùng, coin đã trao/nhận và phần dư không cấp phát.
Không cộng thêm coin từ vote, reflection, role reward hoặc đoán Người Im Lặng vào pool 60.
Những đường tự cộng thưởng hiện tại cần được loại khỏi phiên bản coin mới khi tích hợp R14.
Tên “Lòng tốt vô hạn” là ý nghĩa của coin đỏ, không phải quyền tạo thêm coin ngoài pool.

## Golden examples cho phân phối

N là tổng số người có seat trong lượt; một seat là Người Trao Gửi, mọi seat còn lại chia xanh/vàng.

| N | Người chia xanh/vàng | Xanh/người | Vàng/người | Dư xanh | Dư vàng |
| --- | --- | --- | --- | --- | --- |
| 5 | 4 | 5 | 5 | 0 | 0 |
| 6 | 5 | 4 | 4 | 0 | 0 |
| 7 | 6 | 3 | 3 | 2 | 2 |
| 8 | 7 | 2 | 2 | 6 | 6 |
| 9 | 8 | 2 | 2 | 4 | 4 |
| 10 | 9 | 2 | 2 | 2 | 2 |

Ca cần test: trao đỏ đúng người; xanh chỉ tới người kể; vàng không tự trao;
sai màu, amount không nguyên/dương, thiếu coin; không đổi màu;
retry không ghi hai lần; ghi nhận cuối lượt đúng một lần; coin chưa trao được thu hồi;
lượt mới cấp lại 20/20/20, lịch sử lượt cũ còn nguyên; rollback không tạo/huỷ coin.

## Quyết định còn thiếu

Luật phase, quyền EMPASS, role rotation, hai Người Im Lặng và giới hạn rollback vẫn chưa được xác nhận.
Không suy diễn việc chốt coin thành chấp thuận toàn bộ README/source hay game.md.
Tổng số coin nhận được được ghi theo từng màu và theo lượt; cách hiển thị tổng điểm/xếp hạng
và việc người bị mute được trao/nhận cần chốt trước UI và golden gameplay test.

## Implementation note — 2026-10-01

Luật phân phối/trao/thu hồi đã có runtime và golden/socket regression. `coin-cycle-60/v1` không tự thưởng thêm Coin; receipts tách khỏi allocation. Owner đã xác nhận số đã nhận không tái trao và khóa previous-phase sau gift/collect, đồng thời giữ non-coin web baseline hiện tại. Approval: `R01-web-coin60-baseline-approved.md`. Implementation/QA mới: `docs/qa/2026-10-02-p0-progress.md`; các giới hạn session/privacy/catalog vẫn được ghi riêng.

## Thứ tự thực hiện

R03 isolation → R04 contract số dư có thể trao/đã nhận → R07 receipt/atomicity
→ R14 phân phối, trao và chốt sổ → FE transport/UI → R27 regression → reskin R40.
