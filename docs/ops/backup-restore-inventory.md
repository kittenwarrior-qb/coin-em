# Backup inventory và isolated restore drill

Đây là runbook R00 cho fixture local đã khử dữ liệu. Không dùng với VPS,
Redis production, volume production hoặc secret thật.

## Inventory cần chủ dự án chốt

| Thành phần | R00 evidence | Quyết định còn thiếu |
|---|---|---|
| Redis AOF/volume | Chưa truy cập | nơi lưu, encryption, retention, owner, RPO/RTO |
| `backend-data` JSON | Được nhận diện là fallback | còn là authority trong beta hay không |
| Umami/Postgres | Được nhận diện, chưa backup | cần backup/retention/privacy nào |
| Compose/env metadata | Chỉ được phép redact | nơi lưu và người được đọc |
| Manifest/checksum | Có trong fixture drill | format/lưu trữ chính thức |

Không backup room story, token, secret hay dữ liệu trẻ em vào Git/artifact/log.

## Isolated drill

Trên máy có GNU Make, chạy tại root repo:

```text
make backup-fixture
make restore-fixture
```

Hai target chạy cùng regression drill `be/tests/integration/recovery-fixture.test.ts`
sau khi cài dependencies backend. Drill tạo thư mục tạm riêng, ghi fixture room
đúng shape backend, kiểm SHA-256 của bản backup và bản restored, load qua
`loadRooms`/`RoomRepository`, rồi đọc qua `get_room_state` bằng socket loopback thật.
Teardown đóng server/socket, huỷ timer và dọn đúng root tạm đã cấp.
Trên Windows không có Make có thể chạy `cd be; npx vitest run tests/integration/recovery-fixture.test.ts`.

Evidence local 2026-10-01: checksum và read-room qua handler PASS. Redis được mock
trong suite này: đây là bằng chứng JSON fixture/backend read, không phải Redis crash
recovery, production backup hay RPO/RTO. R28 vẫn phải kiểm Redis thật.

## Production procedure (deferred)

Chỉ người được ủy quyền mới lập kế hoạch snapshot Redis AOF/volume, JSON,
Umami/Postgres và metadata đã redact; sau đó kiểm checksum, restore sang
network/volume cô lập, xác minh health và đọc room fixture trước khi có bất kỳ
rollback nào. Cần phê duyệt riêng về downtime, retention, encryption, access
owner và dữ liệu được phép phục hồi. Không thực hiện trong R00.
