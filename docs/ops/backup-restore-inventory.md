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

Hai target tạo thư mục tạm, ghi một room fixture tối giản với `roomId`
`fixture-room`, tính SHA-256, copy backup/restore, xác minh checksum và đọc
được fixture sau restore. Chúng không khởi động Docker, không đụng volume,
Redis hay network production.

Evidence R00: backup checksum PASS; restore checksum PASS; fixture room đọc
được PASS. RPO/RTO thực tế của production chưa được đo và không được suy ra
từ drill này.

## Production procedure (deferred)

Chỉ người được ủy quyền mới lập kế hoạch snapshot Redis AOF/volume, JSON,
Umami/Postgres và metadata đã redact; sau đó kiểm checksum, restore sang
network/volume cô lập, xác minh health và đọc room fixture trước khi có bất kỳ
rollback nào. Cần phê duyệt riêng về downtime, retention, encryption, access
owner và dữ liệu được phép phục hồi. Không thực hiện trong R00.
