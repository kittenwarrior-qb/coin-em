# R02 Release guardrail

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R00

## Goal

CI/PR gate, production debug/bot guard và deployment concurrency.

## Current evidence

Deploy hiện bỏ qua CI, có debug role picker và có thể dừng toàn stack.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R02)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R00.
- .github/workflows/ci.yml; .github/workflows/deploy.yml; docker-compose.prod.yml; be/src/socket/handlers/roomHandlers.ts; Makefile

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`commit đã kiểm → CI pass → artifact/release gate → deploy có kiểm soát → smoke/rollback`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R02.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Quyền VPS, downtime/drain policy và release owner (OQ-06/OQ-10) cần chốt trước rollout thật.

## Implementation plan

1. Audit CI, deploy workflow, Make targets, production compose and debug/bot entry points; map every path that can release or mutate a room.
2. Specify required PR checks, immutable build identity, deploy concurrency/cancellation, debug/bot production deny policy and a fail-closed smoke gate.
3. Implement the smallest guarded workflow/config and server-side production guard only after release owner confirms VPS/drain authority.
4. Add a non-production test proving debug/bot is rejected in production mode and workflow/static checks proving deploy requires green CI.
5. Exercise the release path only in approved isolated/staging environment; record artifact SHA, smoke evidence and a targeted rollback procedure.
6. Do not deploy or alter production while OQ-06/OQ-10 authority and drain policy are unresolved.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
