# R09 Resume và session

2026-10-03 intentional-exit correction: after confirmed leave, Container retains existing local recovery storage only for playing status and clears the mounted view. A hook-local detach ref prevents that connection refresh immediately auto-admitting the saved playing seat. Explicit recovery still uses the saved secret; successful admission clears detachment. Cold-mount recovery, waiting/ended storage behavior, one-active-generation authorization and 1h inactivity/7d backup policy are unchanged. This fixes a local navigation bug, not a new persistent session policy. Mock transport and Container regressions pass; authenticated-browser evidence is recorded in R29/progress after completion.

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R05, R08

## Goal

Server-issued session token, single active generation, full resume snapshot và TTL/grace.

## Current evidence

Reconnect tin identity client và có thể rebind nhiều record; refresh/cold resume chưa đầy đủ.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R09)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R05, R08.
- be/src/socket/handlers/roomHandlers.ts; be/src/socket/handlers/playerHandlers.ts; be/src/modules/room/services/RoomService.ts; fe/src/hooks/useSocket.ts; fe/src/utils/userId.ts; fe/src/pages/Lobby.tsx; fe/src/pages/GameContainer.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`issued token → socket auth → generation/presence bind → recipient snapshot → revoke/expiry`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R09.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Owner đã duyệt guest không tài khoản, secret do server cấp, một socket/generation active và tab mới thay tab cũ, giữ grace gameplay 2 giờ. Waiting auto-resume chưa được mở rộng; giữ behavior hiện tại.

## Implementation plan

Plan revision 2026-10-02: scope thêm `be/src/socket/SeatSession.ts`, `SeatPresence.ts`, `emitRoomView.ts`, `modules/game/types/index.ts`, `modules/game/services/RoomView.ts`, auth boundary và các projector/service phụ thuộc, cùng unit/integration/hook tests và Redis fixture hiện có. Policy/contract: `docs/adr/R09-guest-seat-session-approved.md`. Không deploy hoặc thay retention/privacy policy.

1. Document current join/reconnect/cold-refresh paths and every client-provided identity fallback.
2. Hold guest/account, multi-tab/device and waiting-room auto-resume choices for OQ-07; write them as decision inputs, not defaults.
3. Design server-issued opaque session tokens, generation replacement/revocation, expiry/grace and recipient-specific resume snapshot tied to R05 guards/R08 durability.
4. Migrate issuance, socket authentication and reconnect for one room lifecycle; invalidate the former socket/generation before projecting state.
5. Add refresh per phase, stale/forged/expired/revoked token, two-tab takeover and cold-resume tests using R03 isolation.
6. Do not persist token secrets in logs or report a resume guarantee before R08/R28 evidence.

## Implementation report

2026-10-03 admission ownership: bounded join/reconnect validates private room/actor/token/generation proof and captured socket/credential ownership. Old connection/unmounted completion cannot write credentials or unlock another request. One same-connection slot blocks concurrent create/join/resume; timeout/malformed success is uncertain without automatic resend. Genuine new-connection cold playing/ended recovery remains existing policy; waiting auto-resume is not expanded. Create/join/recovery UI retains intent pending/rejected, manual recovery candidate deletion is disabled pending. Storage failure remains visible after room hydration and does not fabricate a secret. This is memory-only admission uncertainty, not durable recovery of a newly issued token lost with its first ACK. Mock transport/jsdom tests are not multi-backend/production/device evidence.

2026-10-02 — Latest continuation: the existing guest session carries one versioned pending Coin fingerprint, not another bearer credential. Same-secret admission preserves it; a replaced credential does not inherit it. Late ACK clearing compares token, room, actor and operation ID, so an old hook/tab cannot erase a different pending request. Storage failures are surfaced without unmounting a confirmed board. Hook remount/localStorage evidence is not real two-tab/browser/device or adapter-backed takeover evidence.

2026-10-02 — Owner trả lời “ok làm đi”. Implemented opaque server token/private admission ACK, hash-only persistence, active generation, replacement notification/disconnect, frontend token storage/cold reconnect for playing/ended and old-tab auto-reconnect stop. Reclaim rejects public ID/device-only, forged/expired token and legacy no-hash seats; admission awaits primary CAS before publication. Recipient snapshot is shared with join/gameplay/hydration. Waiting policy unchanged. Current local generations persist a 60-second presence lease; dead-socket recovery expires by last-seen, with bounded crash-time precision. Full two-backend adapter takeover, per-phase browser refresh, explicit revoke/delete and restore markers remain; not acceptance/done.

QA evidence: `docs/qa/2026-10-02-p0-progress.md`.

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
