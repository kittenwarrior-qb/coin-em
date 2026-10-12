# R05 Quyền, input và role secrecy

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R04

## Goal

Auth context, membership/role guard, recipient projector và input bounds.

## Current evidence

Client có thể đưa userId/deviceId; public snapshot/log hiện có nguy cơ lộ originalRole và dữ liệu nhạy cảm.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R05)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R04.
- be/src/socket/handlers/index.ts; be/src/socket/handlers/roomHandlers.ts; be/src/socket/handlers/gameHandlers.ts; be/src/modules/room/services/RoomService.ts; be/src/modules/game/services/GameService.ts; be/src/modules/game/engine/GameEngine.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`socket identity → membership/capability guard → validated command → recipient-specific projection`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R05.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Session policy OQ-07 ảnh hưởng token UX, nhưng guard không được chờ policy đó.

## Implementation plan

Plan revision2026-10-04 — wire exception redaction: source review finds12 game-handler catch branches returning arbitrary error.message in INTERNAL_ERROR ACK/error events, despite closed diagnostic logs. Replace only that free-form message with one fixed Vietnamese uncertainty/status-check message; retain success:false/error code, callback versus event compatibility, business validation messages, queue/commit/receipt/state behavior. Adjacent actual loopback failed-primary ACK and no-callback event regressions assert no synthetic private exception fragment or provisional state/broadcast; static source guard covers all12 branches. No retry, error suppression, new event/schema, frontend/rule/privacy/retention/art/host change. This is transport privacy hardening, not complete runtime-contract/capability acceptance.

Plan revision 2026-10-02: shared `RoomView.ts`, `SeatSession.ts`, `emitRoomView.ts` and player/scheduler emission paths are included so no partial player list bypasses projection. Session policy is now owner-approved in the R09 ADR; no broader disclosure or privacy policy is approved.

1. Trace every room/game/player/relay read and mutation entry point and identify the identity source, membership check, capability check and data projection.
2. Define one authenticated socket/session context and reusable room membership/capability guards; remove reliance on client userId/deviceId/socketId for authorization.
3. Build allowlisted public/private projectors that exclude originalRole and private logs unless the approved recipient may view them.
4. Validate room/name/card/relay payload limits at transport boundaries and make rejected errors contract-compatible with R04.
5. Add a negative matrix: outsider read/mutate, forged identity, stale socket, unauthorized relay and secret-field serialization; redact captured evidence.
6. Proceed with guards now, but leave guest/multi-device token UX decisions to R09/OQ-07.

## Implementation report

2026-10-04 — All12 game-handler exception catch branches now return one fixed Vietnamese INTERNAL_ERROR message, never arbitrary exception.message. Error code, ACK versus error-event compatibility, validation messages and queue/commit/receipt behavior remain unchanged. Actual isolated loopback regressions cover callback and no-callback failed-primary paths without private exception fragments, provisional state or success broadcasts; storage is mocked in these tests.

2026-10-02 — Secure reclaim uses a server-issued token, not public identity. Fresh membership/generation guards precede handlers; removed next/previous-turn identity rebind. Profile and settings check the connected actor. One allowlisted recipient projector excludes session/device fields, other players' originalRole, private night logs, and night event actor/target identity from unrelated recipients. Narrator's existing role visibility is preserved. Shared public snapshot never contains originalRole; Silencer reveal follows the existing reveal phase. Complete input/capability matrix and browser/adapter evidence still remain.

2026-10-01 — Production registration kiểm membership theo socket hiện tại, chặn outsider read/mutate và relay sai actor/phase, chặn mutation ở ended. Regression socket-boundaries qua. Đây chưa phải auth hoàn chỉnh: join/reconnect còn tin userId/deviceId client và public projector còn lộ role/private fields; không công bố R05 xong.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

2026-10-04 — Focused socket/error-boundary21 tests PASS7.57s; full current backend51files/555tests PASS19.21s, build/typecheck PASS. Clean copied Windows Node22.23.3/npm10.9.9 matrix eXWZwK passes all9install/lint/build/test steps with BE555/FE570, before the subsequent Makefile-only no-backup guard. These are local regression results, not a completed authorization matrix or native/production acceptance.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
