# EmCoin — từ web đến Android/iOS, chat và voice

Ngày: 2026-10-12. Trạng thái: kế hoạch triển khai; không phải bằng chứng phát hành.

## Trạng thái tiếp tục — 2026-10-16

This section supersedes historical implementation-status statements below, not
the owner decisions or release gates. The41 task briefs remain the source of task
acceptance; having tests or a scaffold does not mark them all complete.

- Room text chat, invitation/admission, blocks/host mute, selected reports/admin
  triage and local contact/link/bilingual seed checks now exist in source. Chat
  remains off on production; no deployed-chat or contextual-moderation claim.
- Admin selected reports now have a strict authenticated POST search and50-row
  pages across retained evidence, rather than only the newest50. No new whole-room
  history reader, provider, retention or data export is introduced. R36 records QA.
- Native Android/iOS source and exact native-origin staging checks exist. The
  owner downloaded the CLI tools and personally accepted SDK licenses. Dedicated
  SDK/API36, Build Tools/ADB and the EmCoin_API36 emulator are installed on D.
  A debug APK was built and installed; a separate staging APK passed bounded
  native HTTPS admission, five-seat room/start and foreground hydration checks.
  See `../qa/android-native-origin-20261015/summary.json` for exact evidence and
  retained failures. No global Java change, automatic license acceptance or
  release-signing claim. The2026-10-16 debug candidate includes the viewport/chat/
  admin integration, verifies its debug signature and passes packaged browser
  smoke. It has not yet repeated actual WebView/physical-device gameplay QA;
  earlier native-room screenshots belong to the older staging artifact.
- No voice provider/microphone implementation is enabled. Owner currently prefers
  text chat first; contextual moderation is deferred, not declared unnecessary.
- No Mac/Xcode, store enrollment/signing or actual device evidence is available
  in this continuation. No IPA/TestFlight/Play/App Store approval is claimed.

Integrated web checks now pass:898BE+804FE tests,7short browser cases, canonical
PDF5/10-seat full games and463synthetic layout cases. These are local evidence,
not a store or production certificate. Next execution order: repeat current-APK
WebView and named physical-device QA, then complete invited staging and manual
release gates. Keep invited
staging configuration/release approval separate from production and store upload.
Legal/guardian notices and moderation operator coverage remain release gates.

## Quyết định và bằng chứng hiện tại

**Cập nhật 2026-10-13:** Native foundation Android/iOS source + bundled frontend/checks đã có; chưa APK/IPA/device/store evidence. Chi tiết và gates: `native-foundation.md`. Owner chốt `cloud.emcoin.app`; chat/micro do quản trò quản lý riêng, không bị khóa/mở theo vai trò gameplay. Đây là quyết định mới thay ghi chú game-role communication ngày 2026-10-12 bên dưới. Native-origin staging/CORS cần kiểm trước beta; chưa chọn/kích hoạt voice provider. Những số liệu/trạng thái ngày 2026-10-12 bên dưới là lịch sử, không phủ nhận scaffold mới và không trở thành chứng nhận phát hành.

- Chủ dự án yêu cầu hoàn thiện web và lên Android/iOS; Android trước.
- Chủ dự án đồng ý scope voice: phòng mời có quản trò, tự bật micro, tắt tiếng/chặn/báo cáo, không ghi âm và không ghép người lạ. Quyết định này thay phần “không micro” trong ADR ngày 2026-10-03; camera/location/contacts vẫn không được mở rộng.
- Chưa có Google Play Console, Apple Developer hoặc Mac/dịch vụ build iOS. Không tạo tài khoản, thanh toán, ký, upload hay deploy trong bước lập kế hoạch này.
- Gameplay realtime có Socket.IO và gửi phản hồi trong phase: `send_response`/`response_received`, `share_reflection`. `ChatMessage` trong `fe/src/types/game.ts` chỉ là type, không chứng minh chat phòng hoạt động.
- Chưa có chat phòng hoàn chỉnh, WebRTC/media server, quyền micro hay native Android/iOS project.
- Avatar 46 WebP tổng 367,912 byte. Bốn startup PNG Orbit tổng 4,561,375 byte; ảnh theme còn nặng. Chưa đạt gate tải web mạng yếu.
- Bằng chứng local browser/load trước đây không thay QA trên thiết bị thật, staging hoặc chứng nhận store.

## Thứ tự và điều kiện hoàn thành

| Mốc | Công việc | Gate bắt buộc | Task hiện có |
| --- | --- | --- | --- |
| 1. Web release candidate | Nén/resize ảnh UI theo kích thước hiển thị, đổi manifest/consumer đồng bộ; tải theo màn hình; không prefetch mọi asset ngay đầu | Đo production build trên cold cache/slow network, lưu waterfall/LCP/byte count, ảnh so sánh hai theme; mọi phase/card identity/coin test qua | R24/R29/R30/R40 |
| 2. Chat và an toàn | Chat phòng có auth theo seat, ACK/retry/dedup, giới hạn nội dung/rate, report/block, quy trình xử lý báo cáo; áp dụng cả phản hồi game hiện có | Không gửi/đọc chéo phòng, không lộ role/token, không XSS, không nhân đôi sau reconnect; kiểm tra moderation/retention | R04/R05/R09/R17/R33/R36 |
| 3. Voice opt-in | Media adapter, quyền micro theo thao tác, room token ngắn hạn, mute/block/report, cleanup | 5/10 người trên máy thật, WiFi↔4G, denied/revoked permission, bluetooth/tai nghe, background/process kill; không ghi âm | R17/R21/R29/R32/R33/R35 |
| 4. Android beta | Capacitor bundled FE, lifecycle/network/back/safe area; API HTTPS/WSS allowlist; test APK trước, AAB có ký sau | Cài mới/cập nhật/cold launch/resume/keyboard/exit-pending/expiry hoạt động trên thiết bị mục tiêu; artifact hash + source/version | R32/R37 |
| 5. Google Play | Tài khoản chủ sở hữu, signing, listing/privacy/Data safety/audience/rating, hướng dẫn reviewer, internal/closed testing | Release owner duyệt, các yêu cầu test hiện hành của tài khoản đạt; production rollout có monitoring | R33/R34/R35/R37/R38 |
| 6. iOS beta | Mac/Xcode hoặc macOS runner, bundle ID/certificate/profile, WebKit + audio session/lifecycle | iPhone/iPad mục tiêu thực tế qua toàn flow; build upload, TestFlight internal/external phù hợp | R32/R34 |
| 7. App Store | App Privacy/rating/listing/reviewer access, submission riêng sau TestFlight | Có kết quả App Review và trạng thái phát hành thực tế; không coi TestFlight là App Store approval | R34/R37/R38 |

Không đặt thời hạn “chắc chắn duyệt”; mốc phụ thuộc gate, tài khoản, thiết bị và phản hồi store. Không đánh dấu 41 task done bằng việc có roadmap.

## Module communication — ranh giới kiến trúc đề xuất

Tách khỏi game engine và Coin ledger; không coi tin nhắn/âm thanh là lệnh next-turn, vote hay trao Coin.

### Chat chữ

- FE `features/communication`: room chat drawer, unread, gửi/pending/retry, report/block; giữ mobile-first và hai theme đã duyệt. Không thay card art.
- BE `communication`: xác thực seat/session từ server, kiểm room/expiry/membership; không tin senderName/userId client. Dùng room queue và durable commit cho sự kiện cần lưu, không tạo storage writer song song bỏ qua retention.
- Contract/version riêng: message ID và client request ID để dedup, server ordering, giới hạn đề xuất 500 ký tự và 1 lần/giây có burst nhỏ. Chốt event/schema/limit bằng contract test trước implementation, không tái sử dụng `send_response` để gửi chat tự do.
- Không DM, file/photo/video upload, URL preview hoặc chat công khai trong MVP. Phòng mời là scope communication được duyệt; cơ chế admission/invite riêng cần thiết kế, vì biết room ID không tự chứng minh quyền tham gia.
- Nội dung chỉ trong lifetime phòng; xóa sau 1h không hoạt động theo policy hiện tại, không archive phòng đã xóa. Chính sách hoạt động chat có gia hạn phòng hay không phải chốt; voice heartbeat/media traffic không tự kéo dài lifetime.
- Báo cáo vi phạm có thể cần lưu tối thiểu ngoài lifetime phòng. Phải được chủ dự án chốt thời hạn, người xử lý và quyền truy cập trước code; không âm thầm lưu toàn bộ story/chat vào admin hoặc log.
- Không chỉ thêm blacklist rồi coi moderation hoàn tất. Có nội quy, lọc trước phát, report/block, quản trò xử lý phòng, escalation tới người vận hành và quy trình phản hồi; rà soát SDK/chính sách tuổi.

### Voice

- Đề xuất WebRTC qua SFU cho 5–10 người; không full-mesh 10 người, không truyền audio qua Socket.IO. Socket chỉ mang metadata trạng thái được phép; gameplay tiếp tục chạy độc lập khi voice lỗi.
- Chưa chọn nhà cung cấp/SDK hay hosting. So sánh self-hosted/managed theo hỗ trợ web+native, dữ liệu trẻ em, vùng lưu/chuyển dữ liệu, TURN, bandwidth và chi phí trước tích hợp; không mua subscription hoặc mở port VPS tại bước này.
- Server cấp media token ngắn hạn, scoped room/seat/publish/subscribe sau xác thực membership. Kick/expiry/leave phải revoke quyền và disconnect participant; reconnect không cấp lại quyền cho room đã xóa.
- Micro mặc định tắt; xin quyền khi người chơi bấm tham gia/bật micro. Mute của host chỉ tắt quyền phát, không được bật micro từ xa. Chỉ báo đang phát/đang nghe rõ ràng; deny/revoke vẫn chơi được bằng chữ.
- Local block phải ngừng nhận/nghe người bị block; server moderation có thể cấm publish/kick. Phân biệt safety mute với trạng thái khóa tiếng theo vai trò.
- Không recording/transcription/audio analytics. Kiểm thực tế cấu hình provider/egress và SDK; “không ghi âm” không có nghĩa không xử lý/chuyển audio.
- Dừng track, unsubscribe và dispose khi leave/expiry/logout/background theo policy; native call interruption phải xử lý. Không nền/CallKit/foreground microphone service trong MVP nếu chưa chốt riêng.

### Quyết định communication 2026-10-12

Owner trả lời “ok hãy làm” sau hai đề xuất: khóa tiếng theo vai trò chặn chat chữ/voice, heal mở lại; báo cáo vi phạm giữ tối đa 7 ngày, chỉ admin xử lý. Safety mute/block không được heal mở lại. `communication/policy.ts` là policy foundation có unit test, chưa được nối vào chat/voice runtime hoặc thay luật phản hồi phase hiện có. Chốt contract tích hợp và ngăn bypass trước khi bật transport. Nội dung báo cáo cần storage/TTL/admin boundary riêng, không phải backup toàn phòng; không tự thêm admin đọc toàn bộ nội dung game.

## Native shell và QA

- Web bundle đặt trong native app, không chỉ mở một URL site remote. Tách PlatformAdapter cho lifecycle, network, session storage, back, safe area, links và media permissions.
- Native foreground phải xác thực/resume seat và lấy confirmed projection; không tin socket cũ còn sống. Tránh tạo socket/listener/track đôi sau resume.
- Android Back và iOS navigation giữ R23: đóng overlay trên cùng, restore focus; pending server mutation không bị đóng/rời phòng. Kiểm cả native callback và WebView.
- Cho HTTPS/WSS tới backend đã được duyệt; không nhúng localhost, secret/admin credential, debug fixture, broad cleartext permission hay private-room PWA cache vào release.
- Test ít nhất thiết bị Android RAM thấp và hiện đại; iPhone màn hình nhỏ và mẫu hiện đại, iPad nếu hỗ trợ. Chốt OS/device matrix lúc pin Capacitor, không hứa hỗ trợ mọi phiên bản.
- QA: 5/10 seats, toàn phase/ván kết thúc; mạng chập chờn/reconnect/lost ACK, sleep/process kill, invite lạnh/ấm, room expiry, game-role communication policy, report/block, microphone revoke, keyboard/scroll, hai theme, server/media outage.
- Lưu evidence môi trường, source SHA hoặc source fingerprint khi dirty, artifact hash, logs đã scrub và failures. Mocks không thay hardware QA.

## Hướng dẫn chủ dự án chuẩn bị tài khoản

1. Google: dùng Google account do bạn/tổ chức sở hữu, bật 2FA, đăng ký Play Console; chọn Personal hoặc Organization theo tư cách thật. Không lập Organization giả để tránh testing. Phí đăng ký hiện công bố US$25 một lần; xác minh identity/contact theo Console. [Google hướng dẫn](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
2. Tài khoản Personal mới thuộc diện yêu cầu testing phải hoàn thành closed test tối thiểu 12 người opt-in liên tục 14 ngày và xin production access; internal test không thay closed test. Kiểm yêu cầu thực tế khi tài khoản được tạo. [Google testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
3. Apple: Apple Account do bạn/tổ chức sở hữu + 2FA, đăng ký Apple Developer Program. Phí hiện US$99/năm (có thể tính nội tệ); Organization cần pháp nhân/D-U-N-S và người có thẩm quyền. Chọn theo chủ sở hữu thật, không dùng tên nhà tài trợ khi chưa có quyền. [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment/).
4. Chuẩn bị Mac có Xcode tương thích hoặc macOS build runner do bạn quản lý; cần iPhone thật cho audio/lifecycle QA. Windows hiện tại không thay việc build/test iOS với toolchain Apple. [Capacitor setup](https://capacitorjs.com/docs/getting-started/environment-setup).
5. Chốt package/bundle ID, tên publisher, domain/API HTTPS, privacy URL và quyền signing. Thông tin thanh toán/xác minh thực hiện trực tiếp trên official console; không gửi mật khẩu, OTP, private key trong chat/repo.
6. Sau build/test: Android internal → closed khi áp dụng → production; iOS upload → TestFlight → App Review riêng. External TestFlight có thể yêu cầu beta review. [Apple TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

## An toàn và phát hành

Đối tượng 6–18 đã chốt, không thu hẹp tuổi để né điều kiện. Chat/voice và phản hồi game là nội dung người dùng; phải rà soát riêng quyền riêng tư, sự an toàn và vận hành cho trẻ em, không coi phòng mời/không ghi âm là bảo đảm được duyệt.

- Apple §1.2 yêu cầu cơ chế lọc/báo cáo/chặn và contact; random/anonymous chat là rủi ro review quan trọng. [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Google có UGC và Families requirements, gồm dữ liệu microphone và SDK phù hợp. [Google UGC](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en-GB), [Families](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en).
- Existing runtime vendor icon/avatar pack đã được thay; các font/GUI fallback/photo/model còn cần kiểm quyền. Không tự chứng nhận quyền cho toàn project.
- Các việc cần con người: store enrollment/payment/identity, privacy review, moderation operator, signing ownership, staging/deployment approval, reviewer access và release approval.

## Bước bắt đầu

Triển khai gate 1 trước, song song chuẩn bị tài khoản bằng hướng dẫn trên. Chỉ code chat/voice sau chốt contract/game-role policy và moderation retention; chưa deploy, ký hoặc submit. R32/R34 vẫn planned cho tới khi có implementation/evidence thật.
