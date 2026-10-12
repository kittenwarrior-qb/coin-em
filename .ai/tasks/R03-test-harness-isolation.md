# R03 Test harness isolation

**Priority:** P0  
**Status:** qa
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R00

## Goal

Fixture inject được storage root, clock, Redis namespace và server factory thật.

## Current evidence

Test hiện có thể dùng JSON data chung và Redis mock, nên không chứng minh isolation.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R03)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R00.
- be/tests/setup.ts; be/vitest.config.ts; be/src/persistence.ts; be/tests/integration; be/tests/advanced; be/src/index.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`test run ID → temp storage/namespace/clock → full handler server → teardown không leak`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R03.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Không có; vẫn phải giữ dữ liệu working tree ngoài test root an toàn.

## Implementation plan

Plan revision 2026-10-01: bổ sung `storageKeys.ts`, RoomRepository và socket handler/rate-limit lifecycle vào scope để test dùng cùng namespace và teardown của registration production. Không đổi schema hay key production khi env namespace trống. Unit/legacy suites vẫn mock Redis; chưa nhận đó là bằng chứng Redis thật.
E2E helper PlayerContext được phép nhận BASE_URL thay hardcode localhost:5173 để chạy trên port local riêng, tránh backend đang có ở port 3001; chỉ sửa plumbing test, không thay luật/assertion để che lỗi.

1. Map all current filesystem, clock, Redis and process globals touched by setup, persistence and integration/advanced tests.
2. Introduce a per-run test context that supplies an explicit temporary storage root, Redis namespace, clock and handler server factory; reject production-like roots.
3. Migrate one representative unit, integration and advanced test to the context before moving the remaining suites.
4. Add teardown that closes sockets/timers/clients and removes only the verified per-run temporary root; assert no writes to be/data or shared Redis.
5. Run tests concurrently twice with distinct IDs and prove fixture, timer, socket and namespace isolation in reports.
6. Keep real-Redis fault claims for R28; this task only creates the safe harness.

## Implementation report

2026-10-01 — Implemented locally.

- Setup cấp root tạm duy nhất mỗi test file và Redis key namespace trước khi import persistence; cleanup xác minh root, restore mocks/clock và huỷ debounce trước khi dọn.
- Persistence nhận ROOM_DATA_DIR; storageKeys dùng namespace env, mặc định production giữ `room:`/`rooms:index`.
- Factory loopback/random-port đăng ký đầy đủ production room/game/player handlers. Integration/socket-game, reconnect/network và load/stress đã chuyển sang factory; close chờ server shutdown và huỷ disconnect/cleanup/game timers.
- Rate limiter có teardown theo socket; fake-clock regression bật rate limit thật. Persistence crash test gọi actual loadRooms thay vì tự dựng loader trong test; toàn bộ filesystem test dùng root cấp bởi setup.
- Regression mới kiểm root/namespace, cancel debounce và JSON fixture restore/checksum → repository → get_room_state socket thật. R28 vẫn phụ trách Redis thật và lỗi storage/crash nhiều process.
- Bật lại hai integration test từng skip: join vào phòng đang chơi và start khi thiếu người. Listener đăng ký trước emit, chờ room_state thay sleep; cả hai PASS qua full-handler factory.

## QA report

2026-10-01 — BE lint/build PASS. Full suite sau migration full-handler factory: 21 files PASS, 292 passed, 2 legacy skipped (294 total); recovery/storage regression PASS. Hai full-suite run đồng thời PASS cùng kết quả (19.31s/19.13s); aggregate SHA-256 trên 364 file `be/data` trước/sau không đổi: `4252b1c2b4e2e87563cccc781767d52fe54bdc2ab2b5146044eabaf373c682fe`. Cần independent review; không tuyên bố E2E/Redis thật đã pass.

Sau khi bật lại test skip, riêng socket integration PASS 9/9. Browser E2E chưa chạy: lệnh khởi động backend test riêng bị automatic approval review từ chối với thông báo `blocked by policy`, không có lý do chi tiết. Frontend thử nghiệm đã được dừng. Không dùng backend có sẵn ở port 3001 hoặc dữ liệu thật để thay thế.

Final regression 2026-10-01: full backend PASS 21 files, **294/294 tests**, không còn skipped; thời gian 14.65s. `git diff --check` PASS.

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
