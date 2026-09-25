# R09 Resume và session

**Priority:** P0  
**Status:** planned  
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

Blocked bởi OQ-07: guest/account, multi-tab/device và waiting auto-resume policy.

## Implementation plan

1. Document current join/reconnect/cold-refresh paths and every client-provided identity fallback.
2. Hold guest/account, multi-tab/device and waiting-room auto-resume choices for OQ-07; write them as decision inputs, not defaults.
3. Design server-issued opaque session tokens, generation replacement/revocation, expiry/grace and recipient-specific resume snapshot tied to R05 guards/R08 durability.
4. Migrate issuance, socket authentication and reconnect for one room lifecycle; invalidate the former socket/generation before projecting state.
5. Add refresh per phase, stale/forged/expired/revoked token, two-tab takeover and cold-resume tests using R03 isolation.
6. Do not persist token secrets in logs or report a resume guarantee before R08/R28 evidence.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
