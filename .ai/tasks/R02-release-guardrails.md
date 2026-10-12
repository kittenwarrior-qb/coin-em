# R02 Release guardrail

**Priority:** P0  
**Status:** qa
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

Plan revision 2026-10-01: chủ dự án yêu cầu tiếp tục thực hiện toàn backlog. Thực hiện thay đổi cục bộ R02, giữ gate CI/E2E đầy đủ; quyền VPS/drain chỉ chặn rollout thật. Mở rộng file sát task: `GameEngine.ts` và `RoomService.ts` để tắt cả debug preference lưu từ phiên cũ trong production; regression tests và `docs/ops/r02-release-guardrails.md`. Không gọi deploy hoặc sửa cài đặt GitHub environment.

1. Audit CI, deploy workflow, Make targets, production compose and debug/bot entry points; map every path that can release or mutate a room.
2. Specify required PR checks, immutable build identity, deploy concurrency/cancellation, debug/bot production deny policy and a fail-closed smoke gate.
3. Implement the smallest guarded workflow/config and server-side production guard locally; release owner must confirm VPS/drain authority before rollout.
4. Add a non-production test proving debug/bot is rejected in production mode and workflow/static checks proving deploy requires green CI.
5. Exercise the release path only in approved isolated/staging environment; record artifact SHA, smoke evidence and a targeted rollback procedure.
6. Do not deploy or alter production while OQ-06/OQ-10 authority and drain policy are unresolved.

## Implementation report

2026-10-01 — Implemented locally, awaiting external CI/review and rollout policy.

- Production Compose pins NODE_ENV=production, BE/FE debug=false. Socket handlers deny bot/debug in production; non-production bot calls require connected host and bounded integer count. GameEngine ignores persisted debug choices in production; RoomService does not create debug-enabled production rooms.
- Deploy requires successful CI for same-repository push main, uses exact tested SHA, rejects dirty checkout, serializes production runs, names the production environment, recreates only backend/frontend with --no-deps, and checks backend health plus frontend index presence.
- E2E remains a release gate. CI failures are not bypassed. Rollback runbook records compatibility review and previous SHA; no automatic data rollback.
- Files: deploy workflow, prod Compose, roomHandlers/GameEngine/RoomService, focused tests and `docs/ops/r02-release-guardrails.md`.

## QA report

2026-10-01 — Local Windows: BE lint/build PASS; full backend 21 files, 292 passed and 2 legacy skipped (294 total). Nine focused production/host/count/persisted-debug tests passed. Workflow and Compose parsed with js-yaml; assertions for CI source/branch/repository, tested SHA, concurrency, deployment service scope and fixed production flags PASS.
GitHub CI/E2E, environment required-reviewer settings, VPS smoke/drain/rollback have not been exercised. Status remains qa, not done.
Final regression sau khi R03 sửa hai test skip: full backend PASS **294/294 tests** (21 files); không bỏ qua test để làm gate xanh.

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
