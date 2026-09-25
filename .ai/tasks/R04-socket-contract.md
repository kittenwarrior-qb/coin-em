# R04 Socket contract

**Priority:** P0  
**Status:** planned  
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

1. Inventory registered server events, emitted events, ACK shapes and FE listeners from the listed handlers/hooks; mark dead or ambiguous names without deleting them.
2. Wait for R01 to approve phase/capability semantics; define a versioned envelope, success/error ACK and projection schemas only for observed, approved behavior.
3. Create shared runtime schemas/types and an event matrix; bind actor identity to auth context rather than payload identity.
4. Migrate one complete command and its FE caller end-to-end behind a compatibility adapter, with a removal date/owner for legacy mapping.
5. Add encode/decode, malformed/unknown-field, ACK-version and legacy-compatibility tests; verify recipient projection is never widened.
6. Do not rename wire events or invent phase/rule payload fields while R01 remains unresolved.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
