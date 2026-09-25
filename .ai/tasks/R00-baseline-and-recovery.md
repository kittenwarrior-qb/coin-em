# R00 Baseline và Recovery Evidence

**Priority:** P0  
**Status:** qa  
**Owner khi implementation:** Codex Terra medium  
**Review:** Claude Sonnet ngắn, chỉ khi có thay đổi CI/deploy/backup  
**Nguồn:** `REFACTOR_MASTER_PLAN.md` §3, §4 Phase 0

## Implementation plan

- Mục tiêu: tạo bằng chứng baseline có thể tái lập và quy trình backup/restore cô lập trước các migration P0; không đổi gameplay, contract, asset hay production state.
- Đọc thêm trước khi sửa: `docker-compose.dev.yml`, `be/Dockerfile.prod`, `fe/Dockerfile.prod`, và Caddyfile chỉ để đối chiếu dependency/health path (không sửa Caddyfile).
- Xác nhận `git status`, commit SHA, Node/npm/Docker/Compose versions; ghi report đã redact, kèm scripts BE/FE/E2E và kết quả từng lệnh.
- Chốt với chủ dự án data authority và inventory: Redis AOF/volume, `backend-data` JSON, Umami/Postgres, compose metadata/env đã redact, nơi lưu, encryption, retention, checksum và owner restore.
- Thiết kế backup/restore chỉ với fixture đã khử dữ liệu cá nhân trong Docker/local isolated network; tuyệt đối không kết nối VPS, Redis production hay copy secret vào repo/artifact/log.
- Kiểm thử checksum trước/sau restore và chứng minh backend đọc được fixture room; ghi RPO/RTO thực tế, giới hạn và thao tác rollback trong runbook.
- File được phép sửa khi implement: `README.md`, `Makefile`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `be/package.json`, và tài liệu mới `docs/ops/` hoặc `.ai/baselines/`.
- Không được sửa: source gameplay, persistence/Redis schema, lockfile, Caddyfile, `docker-compose.prod.yml`, file VPS; không deploy, tag, hay backup production trong R00.
- Bổ sung lint BE thực hoặc waiver có lý do; CI phải chạy PR/push phù hợp, clean install Node 20, BE build/test/lint và FE lint/test/build.
- Chỉ ghi nhận gap deploy hiện tại trong baseline; việc đặt deploy sau CI xanh, bỏ debug role picker/fake-player và thêm health/smoke thuộc R02, không triển khai trong R00.
- Test commands dự kiến: `cd be; npm ci; npm run build; npm test; npm run lint`, `cd fe; npm ci; npm run lint; npm test; npm run build`, `cd e2e; npm ci; npx playwright test`.
- Test recovery dự kiến: lệnh backup/restore mới chỉ chạy fixture isolated, kiểm manifest/checksum, rồi gọi health/read-room test; không chạy `make clean`, `prod-*`, hoặc `make backup` trên VPS.
- Acceptance: baseline report đủ version/SHA/kết quả; backup inventory/retention/access rõ; restore drill fixture pass; CI gate pass; deploy không bật debug; ngoài scope không đổi.
- Cần quyền/chủ sở hữu: chủ dự án phê duyệt phạm vi, retention, RPO/RTO, nơi lưu và downtime; chỉ người được ủy quyền VPS/secret mới xem volume/env hoặc chạy backup/restore production sau task.
- Rủi ro: sửa CI/deploy có thể chặn hoặc gián đoạn phát hành; artifact có thể lộ dữ liệu/secrets; rollback bằng revert riêng commit R00 sau khi xác minh workflow/production, không `git reset --hard`.
- Thứ tự: inventory → chốt quyền/phạm vi → baseline report → backup/restore fixture → lint/CI baseline → clean CI + drill evidence → review/approve trước mọi thao tác production; R02 xử lý deploy guardrail sau đó.

## Implementation report

**Status:** implemented locally; production/VPS actions intentionally skipped.

### Files changed

- `README.md`
- `Makefile`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `be/package.json`
- New: `docs/ops/r00-baseline.md`
- New: `docs/ops/backup-restore-inventory.md`

Pre-existing untracked files were preserved. No Caddyfile, production compose,
gameplay source, persistence/Redis schema or lockfile was changed.

### Tests and evidence

| Check | Result |
|---|---|
| `git status`, SHA and runtime inventory | PASS; SHA `a6b57991a89f16bc77bf249c45c257de8de0444e`, Node 22.17.0, npm 10.9.2, Docker 29.5.2, Compose v5.1.4 |
| `cd be; npm run lint` | PASS (`tsc --noEmit`) |
| `cd be; npm run build` | PASS |
| `cd be; npm run test:unit` | PASS: 11 files, 205 tests |
| `cd be; npm test` | PASS: 17 files, 279 passed, 2 skipped of 281 |
| `cd fe; npm run lint` | PASS: 0 errors, 8 existing warnings |
| `cd fe; npm test -- --pool=threads --poolOptions.threads.singleThread` | PASS: 3 files, 31 tests |
| `cd fe; npm run build` | PASS; existing font/CSS warnings |
| `make backup-fixture` | PASS: checksum verified |
| `make restore-fixture` | PASS: checksum verified and `fixture-room` readable |
| `git diff --check` | PASS |
| Clean Node 20 CI / E2E | SKIPPED locally; configured in CI |
| Production backup/restore, deploy, tag | SKIPPED by scope |

The first parallel frontend local run hit a Windows worker/config temporary-file
collision; the sequential single-worker rerun passed. No source change was
needed for that environment issue.

### Risks and next step

CI/deploy workflow changes require a dry-run/review before merge. Production
backup inventory, encryption, retention, owner, data authority, RPO/RTO and
downtime remain open questions requiring project-owner/VPS authorization.
The production Compose debug flag remains unchanged and is deferred to R02.
Next step: owner approval and a separate authorized production restore drill;
then R02 release/debug/health guardrails.

## QA report

<!-- CI/Antigravity cập nhật sau khi test. -->

## Audit report

<!-- Claude cập nhật nếu task có thay đổi CI/deploy/backup. -->

## Goal

Tạo một mốc hiện trạng có thể khôi phục trước khi migration gameplay, persistence hoặc release. R00 không thay đổi luật game, socket contract, asset hay UI.

## Current evidence

- Git đang ở `main`, commit `a6b5799`; có các file untracked cần được giữ nguyên.
- CI chỉ chạy bằng `workflow_dispatch`, backend không có script lint, E2E có workflow riêng.
- Deploy chạy khi push `main`, dừng toàn stack và export `DEBUG_ROLE_PICKER=true` cùng `VITE_DEBUG_ROLE_PICKER=true`.
- `Makefile backup` mới sao chép backend data; chưa bao gồm Redis/Umami/config và chưa có restore drill.

## Scope

R00 chỉ tạo baseline, backup inventory, restore drill cô lập và bằng chứng CI/toolchain. Không triển khai thay đổi gameplay, contract, persistence schema, deploy guardrail hoặc production environment.

### Files explicitly out of scope

- `Caddyfile`
- file production trên VPS
- gameplay source, socket contract và Redis schema
- lockfile nếu chưa có task toolchain riêng

## Files to read

- `REFACTOR_MASTER_PLAN.md`
- `README.md`
- `Makefile`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `docker-compose.prod.yml`
- `docker-compose.dev.yml`
- `be/package.json`, `fe/package.json`, `e2e/package.json`
- `be/Dockerfile.prod`, `fe/Dockerfile.prod`, `Caddyfile`

## Files allowed to change

- `README.md`
- `Makefile`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `be/package.json`
- Tài liệu mới dưới `docs/ops/` hoặc `.ai/baselines/`

Không được sửa `Caddyfile`, file production trên VPS, gameplay source, Redis schema hoặc lockfile trong R00 nếu không có một task riêng được phê duyệt.

## State/event/data flow

R00 không thay đổi game state. Nó chỉ bảo vệ quy trình:

```text
source commit → CI evidence → backup artifact → restore drill → approved release candidate
```

Backup phải bao phủ đúng phạm vi được chủ sở hữu phê duyệt: Redis snapshot/AOF, JSON fallback nếu còn authority, Umami nếu cần, compose/env metadata đã redact và manifest checksum. Không đưa secret, token, room story hoặc dữ liệu trẻ em vào GitHub artifact/log.

## Acceptance criteria

- [ ] Có baseline report ghi commit SHA, Node/npm/Docker version, script test/build/lint và kết quả.
- [ ] Có inventory backup nêu rõ thành phần nào được backup, nơi lưu, retention và cách kiểm checksum.
- [ ] Restore drill chạy trên môi trường cô lập, không trỏ tới VPS/Redis production, và chứng minh đọc được một fixture room đã khử dữ liệu cá nhân.
- [ ] CI chạy trên pull request và push phù hợp; backend có lint thực hoặc bước lint bị bỏ có lý do được ghi rõ.
- [ ] Deploy không bật debug role picker/fake player trên production bằng default export trong workflow.
- [ ] Deploy chỉ được phép sau CI xanh; workflow không tự xóa volume hoặc dừng toàn stack khi chưa có gate/rollback note.
- [ ] Không tạo tag, backup production hoặc deploy thật nếu chưa có lệnh xác nhận riêng của chủ dự án.

## Test plan

- Clean install trên Linux runner: backend build/unit/lint; frontend lint/test/build.
- Cố tình làm CI fail ở branch thử nghiệm để xác nhận deploy không chạy.
- Chạy backup/restore bằng fixture cô lập; kiểm checksum trước và sau restore.
- Kiểm tra production environment default không lộ `DEBUG_ROLE_PICKER` hoặc bot mutation.
- Kiểm tra `git status` trước/sau để xác nhận R00 không làm thay đổi file ngoài scope.

## Risks and rollback

- Thay workflow deploy có thể làm deployment gián đoạn; chỉ merge sau khi có workflow test/dry run.
- Backup có thể chứa secrets hoặc dữ liệu người chơi; không commit artifact, phải đặt quyền truy cập và retention.
- Không rollback bằng `git reset --hard`; nếu workflow lỗi, revert riêng commit R00 sau khi xác minh branch/production state.

## Thứ tự implementation khi task được đưa cho Luna/Codex

1. Chụp inventory runtime và `git status` vào report không chứa secrets.
2. Chốt phạm vi backup và môi trường restore với chủ dự án.
3. Tạo script/tài liệu backup và restore cô lập, không chạy lên production.
4. Thêm backend lint script hoặc ghi rõ công cụ lint được chốt.
5. Sửa CI để PR/push có quality gate.
6. Sửa deploy để không tự bật debug và chỉ chạy sau gate.
7. Chạy clean CI, backup/restore drill, ghi kết quả và rollback note.

## Open questions chặn completion

- Backup hiện tại của Redis/Umami nằm ở đâu, retention bao lâu và ai có quyền khôi phục?
- Có cần giữ JSON fallback làm data authority trong beta không?
- Có chấp nhận downtime deploy hiện tại hay cần drain phòng đang chơi ngay từ R02/R37?
- Chủ dự án có đồng ý tạo Git tag và backup thật trên VPS sau khi restore drill cô lập pass không?

## Handoff prompt cho Codex Terra medium

```text
Đọc .ai/tasks/R00-baseline-and-recovery.md và đúng các file trong mục “File cần đọc”.

Chỉ lập implementation plan tối đa 20 dòng cho R00. Không sửa code hay workflow.
Xác nhận các acceptance criteria nào cần quyền VPS/secret/chủ dự án trước khi thực hiện.
Không suy đoán vị trí backup production. Kết thúc bằng file được phép sửa, test command và rollback note.
```
