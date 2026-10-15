# R28 Real Redis persistence suite

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R03, R08, R09, R10, R11

## Goal

Dedicated real-Redis crash/fault/TTL/two-process suite.

## Current evidence

2026-10-16 current integrated source rerun PASS:100sockets/10rooms/two compiled
backends,100committed load messages/1000unique recipient deltas, SIGKILL/retry,
two-writer CAS, primary failure, actual AOF restart and7day selected-report bounds.
Owned fixture cleanup passed. Report emcoin-chat-check-3o9VM0; source/dist digests
are in docs/qa/integrated-readiness-20261016/summary.json. Earlier38IyWT/Lpg6oF
attempts failed before assertions because local Docker runtime was unavailable;
retained, not counted as passed. No new production or separate-host/SQLite cold
bootstrap certification; see R30 for bounded host recovery.

### Plan revision / implementation — 2026-10-14, owned chat durability

Extend fixture scope to `be/scripts/test-real-chat.mjs` and
`chat-fixture-worker.cjs`, using compiled current production modules, no dotenv
or external target. The owner requested continuing chat release readiness.
The runner builds pinned source and records source/dist/protocol hashes before
allocating a labelled loopback-only Redis container and two local backends with
real Redis adapter and same-host SQLite. No production/package/catalog changes.

Real execution passed 100 actual sockets/10 rooms, committed message retry after
backend SIGKILL on the other backend, preserved receipt/history/block/mute state,
two-writer chat CAS (exactly one accepted candidate), primary outage read/write
rejection, actual AOF kill/restart with fresh process, no deletion chat archive,
and separately retained/pruned selected reports. Reads/replays do not refresh
room activity. This is short fixture evidence, not a production RPO or soak.

Retained startup failure: simultaneous empty SQLite bootstrap can lock. Earlier
busy_timeout setting did not resolve it and was reverted; no backend source fix
is falsely certified. The final runner initializes schema once before parallel
backend startup. Separate-host reports/automatic startup scaling remain open.
Owned processes/container are removed with label checks; synthetic files stay in
the allocated temp root only. Details and remaining gates are in
docs/ops/chat-foundation.md and chat-safety-operations.md. R28 stays in progress.

Final current protocol run PASS: nine runtime assertions,516 real ACK samples,
1000 load deliveries converged. Evidence/source hashes are versioned in
docs/qa/chat-runtime-20261014/report.json. Syntax checks and pinned TypeScript
build PASS. Backend runtime source was not changed by this slice; earlier regular
BE787/FE790 results are not presented as newly rerun here. No production deployment.

Global mock cannot prove durability, receipts, restore or race behavior.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R28)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R03, R08, R09, R10, R11.
- be/tests/advanced/reconnect-network.test.ts; be/tests/advanced/persistence-failure.test.ts; be/tests/advanced/concurrent-actions.test.ts; be/tests/integration; be/vitest.config.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`isolated Redis/process → command commit/session/deadline → crash/restart/fault → compare receipt/revision/balance`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R28.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Need isolated Redis infrastructure and OQ-06 durability/RPO target; never flush shared Redis.

## Implementation plan

1. Provision a dedicated disposable Redis namespace/container and two isolated backend processes through R03; verify target is never shared/production.
2. Define fault injection points around commit, receipt, index/delete, session expiry and scheduled deadline with R08–R11 contracts.
3. Run crash/restart immediately before commit, after commit before ACK, during delete and during deadline recovery; compare receipts/revision/balances after recovery.
4. Run concurrent requests through two processes and assert CAS/serialization convergence without relying on mock Redis.
5. Test TTL/revocation/tombstone and corrupted/legacy migration fixtures; collect Redis config/version and teardown evidence.
6. Report achieved durability scope separately from OQ-06 RPO/RTO; do not flush or restore shared Redis.

## Implementation report

2026-10-02 — Extended dedicated fixture with actual Redis atomic deletion: fresh activity prevents expiry-only delete; stale revision prevents erasing newer state; wrong index type fails before snapshot/marker changes. Successful delete removes snapshot/index and creates seven-day TTL marker. A second kill/start retains the marker; new worker with different empty ROOM_DATA_DIR rejects recreation through Redis marker (not local JSON), leaving snapshot/index absent. Allocated labelled loopback container and validated temporary root removed; no shared/production storage touched.

2026-10-02 — Latest dedicated AOF kill/restart run also recovered persisted session hash in a fresh worker, accepted correct token and rejected forgery; no plaintext credential in snapshot or hash in recipient projection. No fixture credential printed. This remains repository/domain-worker evidence, not full backend adapter takeover or production RPO proof.

Plan revision 2026-10-02: thêm be/scripts/test-real-redis.mjs và redis-fixture-worker.cjs; chạy dist production domain/repository trong worker độc lập, không dùng global Redis mock. Dedicated redis:7-alpine container loopback/random port, label/run ID xác minh trước cleanup; no shared Redis/volume/FLUSH. PASS: snapshot+receipt, hai process cùng revision chỉ một commit, stale compatibility write không overwrite gameplay, primary-down fail-closed, Redis SIGKILL/start với AOF appendfsync=always, new-process reload/retry, corrupt index preflight không đổi snapshot. Container và allocated temp root đã dọn. Chưa có hai full backend socket processes, session TTL/revocation/tombstone hoặc host-loss backup proof; không suy fixture always thành production RPO=0.

QA evidence: `docs/qa/2026-10-02-p0-progress.md`.

## QA report

Fresh rerun2026-10-03 PASSED after the Docker daemon became externally available (no agent service start). Exact portable Node22.23.3, current BE TypeScript build passed before running existing `test-real-redis.mjs`. Dedicated actual Redis: snapshot/receipt, two domain/repository worker CAS convergence, offline fail-closed, SIGKILL/start AOF recovery, fresh-worker idempotent retry/index checks, persisted session hash/correct-token/forged-token rejection, atomic expiry/revision/corrupt-index delete guards and seven-day tombstone surviving another restart/different empty local data directory all passed. Fixture verified its label/owned temp containment and removed only the disposable container/synthetic files; no shared Redis/volume/FLUSH or existing QA report deletion. This is not two full Socket.IO backend adapters, host-loss backup, production RPO/RTO or independent acceptance evidence.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
