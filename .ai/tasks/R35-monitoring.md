# R35 Monitoring

**Priority:** P1  
**Status:** in progress
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

Plan revision2026-10-03 — admitted backend diagnostic redaction: extend be/src/telemetry/operationalDiagnostics.ts, safeHttpErrors.ts, existing persistence.ts, socket handlers/middleware/schedulers/PhaseTimer/RoomService and adjacent synthetic tests. Replace console interpolation/raw error-object dumping with closed event/outcome-only JSON records, no IDs/names/roles/story/votes/session/password/paths/IP/card objects or free-form error strings. Fixed120records/minute process-local sampling, bounded dropped counter, no timer/SDK/network/disk buffer; diagnostic sink/clock failures must never reject a domain operation. Preserve commits, thrown business errors, ACK envelopes and queue/timer rules. Generic non-admin Express parser errors use shared fixed no-store400/413/500 registrar rather than finalhandler raw parse diagnostics; admin's existing4KB guarded registrar stays first and unchanged. Malformed admin origin configuration also throws a fixed code without URL input. Existing log-format assertions migrate to exact redacted records PLUS no-private-message assertions while retaining all commit/cache/retention assertions. This is diagnostic sampling, not a durable business audit, exactly-once tracing, action/reconnect counters or alerting completion. Actual authenticated audit receipts remain the R36 primary marker.

Plan revision2026-10-03 — frontend privacy audit finds current useSocket console logs expose entire recipient snapshots, names, responses/reflections, rewards/votes/socket IDs; userId helper logs stable identifiers. Extend scope to fe/src/features/transport/socketDiagnostics.ts, existing fe/src/utils/userId.ts and adjacent synthetic transport/utility tests. Replace only diagnostic logging with closed allowlisted event/severity JSON metadata; no room/seat/user/device/token/card/role/message/error-object arguments, unknown values fail closed, info diagnostics DEV-only and fixed warnings/errors remain content-free. Remove userId log calls without changing identity generation/storage. Preserve exact socket event handlers/projection/ACK/control flow and public cards/game content; unused destructuring only is removed. No collector, SDK, network request, persistent log buffer, extra identifiers or privacy/compliance claim. Verify synthetic private snapshot/text/error fields never reach console while admitted canonical state still updates; later backend log redaction remains separately admitted work.

Plan revision2026-10-03 — owner explicitly disables Umami; complete LOCAL composition cleanup in already-listed docker-compose.prod.yml/Caddyfile: remove Umami/Postgres services, Caddy dependency and mandatory Umami secrets from future default stack; remove obsolete volume declaration WITHOUT touching/deleting any existing volume/container/database. Existing admin.emcoin.cloud source block becomes a redirect to the existing same-origin emcoin.cloud/admin page, not an Umami proxy. Add optional backend admin hash/origin environment injection defaulting empty/disabled; never embed actual credentials or default password. Preserve shared ocr2 routes byte-for-byte and all active room/storage services. Validate only copied configs under owned ignored QA root with Compose no-interpolation and network-none disposable labelled Caddy validation; never read .env, start/reload/deploy/stop existing services or contact VPS/real domains. This supersedes earlier source-block preservation notes ONLY for checked-in future composition, not authorization for shared-host mutations.

Plan revision2026-10-03 — owner explicitly disables Umami and requests lightweight admin analytics. Remove only the tracking script from fe/index.html; do not stop/delete shared Umami services or volumes. Add adjacent FE static regression rejecting external analytics tracking injection while retaining existing root/module/manifest. Add pure be/src/admin/operationalAnalytics.ts with fixed allowlisted outcome counters, bounded duration buckets, volatile in-process lifetime/reset metadata and detached snapshots. No IP, email, device/session/room ID, raw path, body/story/role/URL, visitor identity, cookie, persistent store or third-party SDK; no client analytics collector/public endpoint until admin authentication is established. This operational aggregate foundation is not unique-visitor/pageview analytics, production alerting or a complete admin dashboard. Tests cover arbitrary metric rejection, invalid timings, bounded space, immutability/reset and no private input retention. Owner decisions: docs/adr/2026-10-03-owner-admin-and-release-direction.md.

### Plan revision 2026-10-02 — public diagnostics minimization

Scope thêm `be/src/publicDiagnostics.ts` và test unit/HTTP loopback cho cùng registrar dùng ở production. Giữ URL `/health` và `/metrics` hiện tại, không thêm endpoint/admin/session policy. `/metrics` bỏ roomDetails (room ID, timestamps), pid và memory internals; chỉ allowlist room count, player count, counts theo status, uptime và Redis boolean. Search hiện tại không thấy consumer của roomDetails trong FE/tests/docs; ghi rõ thay đổi contract vận hành, không coi đây là full telemetry/SLO hay privacy compliance.

1. Inventory health endpoints, logs, errors and current identifiers; classify fields that must never enter telemetry.
2. With OQ-06/OQ-08/OQ-10, set approved SLO, retention, alert owner and crash-reporting consent boundaries; document unresolved values.
3. Define structured event schema around request/room revision/commit result without story, role, token or child data; add correlation IDs only after privacy review.
4. Implement liveness/readiness separately and collect action, persistence, reconnect and scheduler outcome metrics from committed boundaries.
5. Build dashboards/alerts/runbook only for approved signals; test unavailable dependency, alert dedupe and redaction with synthetic events.
6. Verify telemetry does not become an authority or leak through admin/public endpoints; record sampling and retention limits.

## Implementation report

2026-10-03 — production TypeScript backend diagnostics now use closed operation/outcome JSON only, replacing raw Room/session/action interpolation, paths and thrown-object dumps in Redis, persistence/repository, handlers, schedulers, presence, delivery and phase timers. Output is bounded to120attempts/minute/process with a saturating dropped counter; sink/clock faults do not throw into domain actions. Original ACK/queue/commit/timer behavior is retained. The compiled TypeScript entry mounts fixed no-store HTTP parse/error responses; malformed admin origin throws only INVALID_ADMIN_ORIGIN_CONFIG. The unused legacy src/index.js is deliberately not retired without usage evidence. No crash SDK, collector, persistent trace, action/reconnect dashboard or production alerting was introduced.

Added synthetic pure logger and real loopback HTTP regressions, fixed-code origin test, and exact redacted commit/delete/notification assertions retaining primary state behavior and asserting no private errors/room IDs. A static production-TS guard prevents new direct console dumps. Initial fixture failures were not waived: closed-server teardown now checks listening state, and each HTTP test restores its own console spy; interrupted GET uses one native HTTP request to avoid implicit fetch retries. Prior copied clean run gRZ4E0 contained the pre-fix spy fixture and failed; it is retained as failed evidence, never counted current success.

2026-10-03 — default LOCAL production composition now removes Umami/Postgres services/Caddy dependency/mandatory analytics secrets/obsolete volume declaration, adds optional disabled admin hash/origin injection, and redirects existing admin.emcoin.cloud source host to same-origin /admin. No existing container/database/volume/data was stopped, deleted or reconfigured; shared ocr2 source route unchanged. Owned copied Compose no-interpolation validation and disposable labelled network-none Caddy binary validation PASS, artifacts r35-config-qa-52ef76a88a314e5f94b8267694ef1808. Existing Caddy unformatted/redundant forwarding-header warnings retained, not fixed by touching shared host.

Frontend socket diagnostics now accept only closed event/severity fields, DEV-only info and content-free production warning/error JSON; no snapshots, response/reflection text, nicknames, roles/rewards/votes or identity/token values are printed. userId stable generation/storage remains exact but log calls removed. New helper/private-payload transport regressions plus existing169 boundary tests pass176 focused tests; TypeScript/targeted lint pass. This slice introduces no collector, disk queue, SDK or network analytics. Full latest source verification and backend structured/action/reconnect/scrubbed log work remain separate; no privacy-compliance/full-monitoring claim.

2026-10-03 — Removed Umami script only from fe/index.html, retained app/PWA entries and all art. Existing shared Umami service/database/host untouched. Added fixed-space in-process HTTP outcome/timing counters and finish-only production middleware, no visitor identifier/path/IP/content collection or new persistent telemetry store. Authenticated R36 overview consumes detached aggregates; public diagnostics unchanged. This is not historical pageview/unique visitor analytics or game-action metrics. Owner's direction/remaining privacy gates in new ADR.

2026-10-02 — Public diagnostics now use one registrar shared by production and isolated HTTP tests. `/metrics` allowlists total room/player counts, counts by status, uptime and Redis boolean; removes roomDetails/IDs/activity timestamps/pid/memory. `/health` retains startup/live-primary readiness behavior. Both responses have no-store headers. Search found no repository consumer of removed roomDetails; external operator consumers must migrate as documented in `docs/ops/r35-public-diagnostics.md`. No new endpoint, analytics SDK, retention policy, SLO or compliance claim. Structured/action/reconnect telemetry, alerts and crash-consent work still remain.

Plan revision 2026-10-02: thêm readiness.ts và Readiness.test.ts. /health phản ánh startup completion và live Redis availability khi production/redis-required; Redis close cập nhật availability. Production từ chối startup/command khi primary unavailable; lỗi hoặc incomplete recovery không bị coi ready, không tự restore JSON vào Redis rỗng. Chưa có structured/redacted telemetry, aggregate-only metrics, alerts/dashboard/crash consent hay SLO; task chưa hoàn tất.

QA evidence: `docs/qa/2026-10-02-p0-progress.md`.

## QA report

2026-10-03 diagnostic revision: original BE48files542PASS18.72s plus subsequent static log-boundary1PASS853ms; compiled realRedis owned fixture PASS CAS/outage/AOF restart/session/deletion/admin exact-receipt replay. FE51files539PASS24.16s. Corrected owned copy djpkq0 includes BE543/FE539 and passes all9commands;957copied files compare0mismatch before later linter-only promotion. Linux Docker wH4spA passes that exact pre-ESLint10 snapshot. Initial genericHTTP console-spy/teardown fixture failures and copied gRZ4E0 FAIL are retained, not waived. Commit/delete/notification invariants and no-private-field assertions remain. No production proxy-log retention/alert delivery/crash-consent/action-reconnect metrics/device/legal/full-monitoring approval claimed. Boundary runbook: docs/ops/r35-operational-logging.md.

Final verification2026-10-03: FE full ESLint0errors/0warnings, TypeScript and Vite32.15sPASS after tracker removal; generated index.html0.88KB retains PWA/module entries without Umami. Current BE519/FE503=1022regular testsPASS; realRedis marker-only fixture and strict573images/hash/200faces/0reskinsPASS, diff whitespacePASS and original3lock hashes unchanged. No owned QA process left running. No full admin UI/close-room/production/SLO/privacy approval inferred.

2026-10-03 — OperationalAnalytics10tests pass fixed bucket boundaries/status errors/invalid timing/restart/nonmutation;6 actual R36HTTP fixtures exercise finish middleware and authenticated allowlisted aggregates. New FE tracker-removal static1test passes, app/manifest retained. Final original full BE45files519PASS31.02s + FE48files503PASS44.06s=1022tests, zero skips. BE typecheck/buildPASS; final FE lint/build and realRedis new-marker-only verification separately pending. Existing candidate5 dependency proof remains preceding-source/copied-only, not an integrated upgrade. No performance/device/production/legal approval.

2026-10-02 — 2 pure allowlist/nonmutation/redaction tests and 4 actual loopback HTTP tests pass. Shared production registrar returns exact aggregate shape; health 503 during startup or required primary failure, 200 only when ready, no room code in public response. Backend full 34 files / 422 tests, build/typecheck pass. Redis availability is injected for HTTP failure cases, not a production outage drill.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
