# Capacity và ranh giới media — 2026-10-12

## Không đánh đồng “test qua” với “scale vô hạn”

Gameplay có Redis atomic revision commit, per-room serialization và Socket.IO Redis adapter. Tuy nhiên `roomQueue.ts`, RoomRepository cache, timer/presence và admin auth/analytics vẫn có state trong tiến trình. Redis adapter phát sự kiện không tạo distributed room ownership hoặc toàn bộ scheduler coordination. Không tự nhân Compose/PM2 backend replicas để tăng tải.

Phát hành đầu dùng một backend writer/process cùng Redis primary. Khi cần nhiều instance, phải bổ sung distributed room ownership/lease/fencing, routing/sticky connection phù hợp, timer single owner, cache invalidation, shared session/moderation control và restart/failover tests trước rollout. Giữ game engine authoritative; media provider không được giữ authority Coin/role.

## Bằng chứng và gate cần đo

- Có historical real-Redis/Caddy isolated soak 10 phòng × 10 người trên source ghi trong R30; không là SLO của VPS hay tải voice mới.
- Mỗi lần thay gameplay/communication phải rerun focused concurrency/reconnect/revision/expiry suites, sau đó staging load với rate limit thật và source/artifact fingerprint.
- Khởi đầu qualification ở 10 phòng × 10 seats, tăng từng mức đo thay vì công bố capacity trước. Ghi p95/p99 ACK, unexpected ACK, lost/doubled Coin, reconnect recovery, CPU/RSS, event-loop delay, Redis latency, bandwidth. Chốt SLO/peak target từ kết quả staging.
- Khi chưa có SLO/thiết bị/network/staging evidence, không ghi “production scale passed”. Không chạy tải vào người chơi thật.
- Cần giới hạn admission tổng phòng/socket, bounded queue/backpressure, bounded message history/report volume và abuse-rate limits trước public traffic; room max seats không tự giới hạn tổng tải. Hiện communication history đề xuất tối đa 100 message/phòng, text 500 ký tự.

## Media placement

| Dữ liệu | Hướng triển khai | Ranh giới |
| --- | --- | --- |
| Art công khai của theme/avatar/icon | WebP/SVG nhỏ, static cache/CDN; Cloudinary là ứng viên khi cần remote delivery | Không upload trong bước này; public art không chứa room/session; versioned URLs và fallback có kiểm chứng |
| Card art | Tiếp tục catalog/CDN hiện có và transform delivery sẵn có | Không đổi nội dung, ID/pair hay public hóa dữ liệu riêng |
| Chat/phản hồi | Backend phòng authoritative + retention hiện có | Không đưa nội dung chat lên analytics/CDN; report tối thiểu riêng tối đa 7 ngày, admin-only |
| Voice | WebRTC SFU + TURN ngoài backend gameplay | Audio-only, opt-in, no recording/transcription; bounded room membership, moderation/revoke, provider outage không làm hỏng Coin |

Web đã có Cloudinary card transforms `f_auto,q_auto,w_400` và back `w_600`. Việc chuyển toàn art sang CDN cần owner-controlled account, region/privacy/cost review và traffic proof; không nhúng upload secret hoặc dùng unsigned arbitrary uploads. [Cloudinary image optimization](https://cloudinary.com/documentation/image_optimization).

LiveKit Cloud/self-host là ứng viên, chưa phải provider được chọn. Phải kiểm đặc biệt revoke: docs hiện mô tả revoke token chỉ có trên Cloud; với self-host, remove/update permission không tự vô hiệu hóa token đã cấp. Token ngắn hạn một mình không chứng minh kick/expiry tức thời an toàn. Không bật cho trẻ em trước khi ngăn rejoin/publish sau silence/kick/expiry với provider thực. [LiveKit token grants](https://docs.livekit.io/frontends/reference/tokens-grants/).

Chủ dự án cho phép cân nhắc bên thứ ba, không đồng nghĩa đồng ý gói phí, vùng xử lý dữ liệu, upload/chuyển dữ liệu người chơi hoặc publish. Cần lựa chọn provider/terms phù hợp đối tượng 6–18, privacy disclosure thực tế và responsible moderation operator. Không hứa Google Play/App Store approval vì dùng CDN/SFU.

## Trạng thái triển khai hiện tại

Ảnh UI được encode WebP, không resize/crop, alpha exact; source PNG giữ trong repo, bản build bỏ 17 bản PNG superseded có replacement hash đã kiểm. Không xoá source hoặc bản lưu icon cũ. Startup chỉ preload 4 ảnh theme đang chọn, không warm toàn bộ 106 Friends assets. RGB nén không pixel-identical; báo cáo sai số/cỡ ảnh ở `docs/design/brand-optimization.json`.

`be/src/communication/policy.ts` là foundation tested, chưa có chat transport, report storage/admin UI, SFU integration, microphone adapter hay native distributable. Không hiển thị nút “voice đã sẵn sàng” khi feature chưa hoàn thiện. Người vận hành xử lý report, lifecycle report TTL, invite admission và provider budget vẫn là implementation/release gates.
