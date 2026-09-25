# R00 baseline và recovery evidence

Ngày ghi nhận: 2026-09-09  
Commit/branch: `a6b57991a89f16bc77bf249c45c257de8de0444e` / `main`  
Workspace: `D:\Desktop\coinem`  
Production/VPS: không truy cập.

## Runtime baseline

| Công cụ | Kết quả |
|---|---|
| Node | `v22.17.0` |
| npm | `10.9.2` |
| Docker | `29.5.2` |
| Docker Compose | `v5.1.4` |
| Backend build | PASS (`npm run build`) |
| Backend unit | PASS: 11 files, 205 tests (`npm run test:unit`) |
| Backend lint/static check | PASS (`npm run lint`, TypeScript `--noEmit`) |
| Frontend lint | PASS, 8 warnings baseline |
| Frontend test | PASS: 3 files, 31 tests |
| Frontend build | PASS; có cảnh báo font/CSS đã biết |
| E2E | SKIPPED local: cần backend/frontend chạy riêng và Playwright browser |

Clean-install trên Node 20 và E2E được giao cho CI. Các suite integration,
advanced, persistence, load và reconnect chưa là release evidence vì storage
test hiện chưa inject root biệt lập. Không ghi secret, room story, token hoặc
dữ liệu cá nhân vào report/artifact.

## R00 changes and scope

- Backend thêm `npm run lint` dùng TypeScript static check; chưa thêm ESLint vì
  không được sửa lockfile trong R00.
- CI chạy trên pull request, push `main`, và manual dispatch; có backend
  build/lint/test, frontend lint/test/build và E2E sau quality job.
- Deploy chỉ chạy sau CI xanh trên `main` (hoặc manual dispatch), không export
  debug role picker, không `down`, không xóa volume. `docker-compose.prod.yml`
  vẫn có cấu hình debug hiện hữu và được ghi nhận là gap ngoài phạm vi R00,
  cần xử lý ở R02.
- `make backup` hiện vẫn là target production-facing cũ và không được chạy.
  Hai target `backup-fixture`/`restore-fixture` chỉ thao tác thư mục tạm.

## Open questions / approval required

Chưa thể chốt inventory production, retention, encryption, owner restore,
RPO/RTO hoặc data authority của Redis AOF, `backend-data` JSON và Umami mà
không có quyết định của chủ dự án/quyền VPS. Vì vậy R00 chỉ hoàn tất bằng
fixture cô lập; backup/restore production, downtime policy và tag đều deferred.

## Rollback

Nếu CI/deploy workflow lỗi, revert riêng commit R00 sau khi kiểm tra branch và
production state. Không dùng `git reset --hard`; không chạy `make clean`,
`make prod-*`, `docker compose down -v` hoặc thao tác VPS trong drill.

## Next step

Chủ dự án phê duyệt inventory/retention/RPO/RTO và thực hiện restore drill
production trong một task riêng có quyền phù hợp. R02 xử lý debug flag,
release guardrail còn thiếu trong Compose, smoke/health và drain policy.
