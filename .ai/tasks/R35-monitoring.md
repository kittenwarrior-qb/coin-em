# R35 Monitoring

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R08, R17

## Goal

Liveness/readiness, structured scrubbed logs, action/reconnect metrics and crash reporting.

## Current evidence

Health/readiness/metrics do not yet establish operational action tracing or safe alerts.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R35)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R08, R17.
- be/src/index.ts; be/src/redis.ts; be/src/modules/room/repository/RoomRepository.ts; fe/src/hooks/useSocket.ts; fe/index.html; Caddyfile; docker-compose.prod.yml

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`request/action → revision/commit telemetry → scrubbed logs/metrics → readiness/alert/runbook`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R35.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

OQ-06/OQ-08/OQ-10 decide SLO, retention, alert owner, crash reporting consent.

## Implementation plan

1. Inventory health endpoints, logs, errors and current identifiers; classify fields that must never enter telemetry.
2. With OQ-06/OQ-08/OQ-10, set approved SLO, retention, alert owner and crash-reporting consent boundaries; document unresolved values.
3. Define structured event schema around request/room revision/commit result without story, role, token or child data; add correlation IDs only after privacy review.
4. Implement liveness/readiness separately and collect action, persistence, reconnect and scheduler outcome metrics from committed boundaries.
5. Build dashboards/alerts/runbook only for approved signals; test unavailable dependency, alert dedupe and redaction with synthetic events.
6. Verify telemetry does not become an authority or leak through admin/public endpoints; record sampling and retention limits.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
