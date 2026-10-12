# R04 Socket contract

2026-10-03 additive leave contract: optional leave_room callback returns success only after committed waiting-seat removal/strict last-room deletion or playing/ended disconnected-seat save, subscription/auth unbinding and recipient notifications. Existing no-callback clients remain compatible; failed primary commit returns the existing guarded failure without success. Bare success ACK is sufficient for leave (the last waiting room may no longer exist); it is not a generic durable operation receipt or proof of every downstream broadcast delivery. Sixteen socket-boundary regressions pass, including five added leave cases. New client waits 5s and preserves uncertain intent instead of clearing the session on emit; deploy additive backend before/matched with any eventual new-client rollout.

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01

## Goal

Contract runtime/type, ACK/version và legacy mapping có thời hạn.

## Current evidence

Event/payload/error/ACK đang không đồng nhất; FE có event không thấy handler đăng ký.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R04)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01.
- be/src/modules/game/types/index.ts; be/src/socket/handlers; fe/src/hooks/useSocket.ts; fe/src/stores; fe/src/components/game/types.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`client payload → runtime decode → auth/domain command → versioned ACK/projected event → FE decode`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R04.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked bởi R01 cho luật/phase/capability; không tự đổi wire semantics hoặc bịa event.

## Implementation plan

Plan revision 2026-10-03 — lifecycle ACK projection: start_game/end_game success adds the already-used optional data field containing roomView for the authenticated actor/legacy member, after saveAndWait and recipient broadcast. Preserve existing success/error events and payload fields; no raw room/secret expansion or new generic envelope. Corresponding R17 caller requires the newer committed playing/ended projection. Add boundary regressions for projected commit and failed-primary no success/broadcast. This additive server change preserves old callers; new callers intentionally fail closed against a bare legacy success ACK, so matched server/client rollout is required before release.

Plan revision 2026-10-02: `join_room` accepts optional initial `settings` using the existing situation/emotion group fields only for creation of an absent room. Validate/copy them before the same awaited admission commit; existing rooms cannot be overwritten by a new creator. Existing join without settings stays compatible. This closes R17's create/settings race without a new event or catalog/rule decision.

1. Inventory registered server events, emitted events, ACK shapes and FE listeners from the listed handlers/hooks; mark dead or ambiguous names without deleting them.
2. Wait for R01 to approve phase/capability semantics; define a versioned envelope, success/error ACK and projection schemas only for observed, approved behavior.
3. Create shared runtime schemas/types and an event matrix; bind actor identity to auth context rather than payload identity.
4. Migrate one complete command and its FE caller end-to-end behind a compatibility adapter, with a removal date/owner for legacy mapping.
5. Add encode/decode, malformed/unknown-field, ACK-version and legacy-compatibility tests; verify recipient projection is never widened.
6. Do not rename wire events or invent phase/rule payload fields while R01 remains unresolved.

## Implementation report

### Plan revision 2026-10-12 — communication foundation

Owner accepts room text/voice scope, gameplay silence/heal publishing behavior and admin-only report max7days; see `docs/ops/mobile-release-roadmap.md`. New `be/src/communication/policy.ts` bounds text500characters/recent history100, rejects foreign/disconnected/fixture sockets and ended rooms, separates gameplay mute from safety mute. Pure policy unit coverage passes; it does not issue media tokens or register chat events, does not implement report storage/TTL or alter existing response phase rules. Next transport integration must be versioned, authenticated, rate/queue/dedup bounded and invite-admission restricted; no claim chat/voice ready. Scope expansion to communication module/tests is recorded here, no deploy/signing/provider data upload.

2026-10-03 settings callback: existing update_room_settings accepts an optional callback, rejects invalid/unauthorized/non-waiting input without success, and returns existing recipient roomView data only after committed saveAndWait/broadcast. No-callback clients retain legacy error/notification behavior. Focused integration tests assert exact settings/revision/private recipient projection, malformed-group rejection and failed-primary no publication. New bounded client needs this additive server capability before/matched rollout; old bare or absent ACK remains uncertain. Admission still uses its existing private session ACK followed by room_state; no new wire fields or generic durable command schema.

2026-10-03 — start_game/end_game success ACK now includes the same recipient roomView used by navigation, only after awaited commit/broadcast. Existing legacy payload/event/success shapes remain compatible; data is additive, not a new envelope. Real-loopback boundary tests compare exact committed projector output, check absence of device/credential fields, verify playing→ended newer revisions/collected round, and fail primary eval before either transition confirmation/broadcast. Full backend 41 files/482 tests/build passes. Session fixture tests still cover secret/generation projection independently; lifecycle boundary fixture is legacy-member/mock Redis, not real Redis/authenticated browser end-game proof. Universal versioned schemas, durable non-Coin receipts and independent audit remain.

2026-10-02 — Latest continuation: initial settings use the existing join_room event's optional settings field; only absent-room creation can apply them. Runtime parsing bounds both arrays, allowlists current groups, rejects empty/duplicate/unknown groups and copies values. Existing-room code collision cannot overwrite another room's settings. Authenticated resume of an existing seat retains its committed settings. Settings update uses the same parser and awaited revisioned primary commit. Legacy admission without settings retains defaults. Shared versioned schemas/ACK envelopes for all other events remain.

2026-10-01 — Socket boundary kiểm payload roomId/name; give_coin hỗ trợ requestId/round và ACK awaited. Chưa có shared runtime schemas/envelope cho mọi event; R01 chưa được chốt toàn bộ.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
