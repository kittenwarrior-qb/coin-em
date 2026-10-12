# R30 Load and SLO

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R27, R28, R35

## Goal

Real Redis/Caddy test load harness and p95/p99/loss/convergence report.

## Current evidence

Current protocol evidence includes a real loopback ten-seat/ten-round approved web-baseline fixture in R27, with controlled clock/mock Redis. This is not capacity, proxy, real-storage load or production-SLO proof. Concurrent-room capacity remains unverified.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R30)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R27, R28, R35.
- be/tests/advanced/load-stress.test.ts; be/tests/bot; be/tests/bot/bot-simulation.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`clients/rooms → proxy/backend/Redis → action/reconnect load → metrics → SLO report`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R30.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by OQ-06 for targets/VPS/region/SLO; report provisional results separately.

## Implementation plan

Plan revision2026-10-09 — owner replies “làm tiếp đi bro” after explicit request for host Docker startup repair preserving containers/volumes/no factory reset. Limit host recovery to gracefully/force stopping the already failed Desktop via its bounded CLI, inspect exact inaccessible runtime entries, and recoverably rename only verified zero-byte socket directories outside repo. No Docker data/WSL disks/volume/image pruning/upgrade/reset. Admit docs/ops/2026-10-09-docker-runtime-recovery.md for exact recovery receipt and limitations. Verify Linux engine/cached images, fresh closed short fixture, then restart fixed60minute workload from zero. Host recovery is not application or soak acceptance.

Plan revision2026-10-09 — instrumented D6vUeS fails PHASE_DRIFT during batch24 after23complete batches1848497ms; preserve report and all six successful owned-resource cleanup records. It observed two proven presence-only replay interleavings, not a full soak pass. Existing load client sends manual next after EVERY phase although production schedules1200ms after healer/silencer actions and2000/350/350ms after situation/emotion/selfcare selection. Depending on proxy/queue latency, a delayed manual next can advance the already automatically advanced phase. Original failure has no phase context, so this remains a source-supported hypothesis, not retrospective proof. Correct only fixture behavior: for those exact five action phases, wait for the existing scheduler's exact next registered phase/new instance/same round within original10s ACK/read deadline; reject skipped/backward/other-round states, never also send manual next. All other phases retain manual next with exact ACK phase checks. Add closed aggregate failure context (phase enums/round/revisions only, no IDs/content), pure strict transition regressions and a static guard; no production timer/engine/limit change or disabled scheduler. Fresh short run before restarting the full fixed60minute workload from zero.

Follow-up source audit: the same persisted presence lease can interleave the ten independently queued reward/terminal hydration reads or a terminal rejection/read. Use the existing bounded successful presence-only commit proof for the entire observed revision range, not blind equality or arbitrary newer-revision acceptance. Preserve all reward/history/balance/terminal phase/ledger checks and add separate aggregate hydration-presence count. This is a source-identified fixture assumption, not a failure observed in D6vUeS. Repeat the short fixture after this correction before full soak.

Plan revision2026-10-09 — actual soak lYErMd fails DUPLICATE_COMMIT in batch3 after2complete batches149034ms. Preserve failure/owned cleanup; do not waive revision check or call this a60minute pass. Source review finds60second presence lease saves legitimately increment room revision but lastSeenAt is intentionally absent from public projections. Add fixture-only bounded commit-kind trace around the existing awaited repository method, classify ONLY full-state-equivalent presence lease updates, and expose aggregate proof for an exact synthetic room/revision range. Replay must still preserve entire projected domain/Coin ledger/log, while any revision delta must be accounted for exclusively by recorded successful presence-only commits; duplicate/other writes fail. Add deterministic real-handler regression with an intervening persisted lease and assert replay itself makes no primary write/broadcast, plus pure negative classifier tests. No production source/schema/presence interval change. Root cause of original failure remains unverified until instrumented reproduction; restart soak from zero only after checks pass.

Plan revision2026-10-09 — add one closed --soak mode to the owned local runner, never arbitrary URL/duration/capacity. Fixed60minute measured workload window after setup/single-room gate, max120complete batches and unchanged300s stage deadlines; finish the last batch within bounded overrun, preserve every original integrity/rate-limit assertion. Each batch uses unique allowlisted synthetic IDs; fixture-only DELETE route derives those exact IDs from owned namespace/count/cycle, serializes against real room queues, refuses nonterminal or connected rooms, invokes awaited production deletion and verifies absence before another batch. No FLUSH/shared deletion/production route/runtime change. Copy the pure policy into the private worker context, retain capped per-batch quantiles (not merge quantiles into false global percentiles), monotonic elapsed time/progress checkpoints, separate completed-content cleanup vs final six-resource ownership cleanup. Test closed CLI/clock/ID/capacity/terminal cleanup bounds and run fresh short fixture before claiming any soak execution. No60minute PASS until actual full duration completes; prior short report remains historical.

### Plan revision 2026-10-04 — bounded owned real-proxy exploratory fixture

Interrupted-run recovery: admit `be/scripts/recover-real-load.mjs` to verify an exact allocated TEMP evidence directory, extract its UUID from that fixture's Caddy config, verify each exact container/network/image label, and remove only those disposable resources. Retain context/evidence and record interrupted-not-passed, never resume from unverifiable partial metrics. Persist initial/running aggregate report before long work to make interruption traceable. No broad label sweep, shared resource deletion or filesystem cleanup. This responds to mD5lF6 ending without a final report/process and three exited255 owned containers; cause of interruption is not inferred.

Fixture correction: Docker internal-only networking does not publish a usable host binding. Keep Redis/backend solely internal, give ONLY Caddy a second labelled owned ingress bridge with random127.0.0.1 publication, and validate its actual binding before any client request. Initial p26M7B failed preflight on untagged-but-BuildKit-cached Node base; build resolves the exact pinned base and verifies actual container Node. GnHHWd rejected missing proxy binding and removed all five owned resources; no result is counted as load success. This is test-topology correction, not a production/configuration change or relaxed backend exposure.

Admit only `be/scripts/test-real-load.mjs`, `load-fixture-worker.cjs`, `load-protocol.mjs`, `load-policy.mjs`, adjacent pure/static tests and this brief/QA/index records. Build an allowlisted copied backend context (package/lock/tsconfig/src plus fixture worker, no .env/data/user mounts). Allocate labelled internal Docker network and private Redis/backend/Caddy containers; publish Caddy only on a random loopback port. Redis uses AOF appendfsync=always; current compiled production handlers/Redis adapter run with real clock, mandatory real primary, debug disabled and rate limits enabled. No shared config/source Dockerfile/package/lock/workflow changes or external target argument. Hard limit ten rooms/100 simultaneous seats, bounded samples, setup/command/action deadlines and ownership checks before cleanup. Run one full ten-seat game before ten concurrent full games, with exact receipt retry, checkpoint rejection, session replacement burst and terminal projection convergence. Report only aggregate latency/integrity metadata; no session/story/role/seat/room identifiers in report. A short run is exploratory, NOT the required60minute soak, physical-network result or approved production SLO. Owner-directed sizing still needs operator/hardware/region review.

1. Get OQ-06 approval for isolated capacity environment, region, target room count and provisional SLO; otherwise label all results exploratory.
2. Build a harness on R27 fixtures and R28 real Redis through a test Caddy/backend topology, with run IDs and bounded cleanup.
3. Measure one full 10-player room before ramping to concurrent rooms; inject reconnect bursts and collect latency, error, receipt, loss and convergence metrics.
4. Define admission/abort limits that protect the test host; never point the harness at VPS production.
5. Validate no duplicate/lost committed action and all client projections converge before interpreting throughput numbers.
6. Publish p50/p95/p99, setup SHA/config, data scope and known bottlenecks; do not turn provisional results into release capacity claims.

## Implementation report

2026-10-09 — fixture now follows the existing five delayed action transitions rather than racing them with manual next. Bounded hydration polling accepts only same-instance waiting or exact next-phase/new-instance/same-round progression; manual phases validate next ACK phase and round. Per-room failure context is restricted to step/phase enums and numeric round/revision, with runner-side allowlist scrubbing. Observed revision ranges at reward/terminal/rejection hydration require the same successful presence-only raw-commit proof as Coin replay; no arbitrary newer revision accepted. Added aggregate automatic/manual transition and hydration-presence counters, no private data. Production code/limits/timers/cards remain unchanged.

2026-10-09 — added closed `--soak` mode, fixed3600000ms workload window after single-room gate,120batch cap/300s stage limits/10s cleanup/60s progress-gap refusal. Default remains short1room→10rooms. Per-batch latency samples remain capped50000 and reports retain individual quantiles, never average percentiles into a global SLO. Unique synthetic batch IDs derive only from owned run namespace, count1/10 and bounded cycle; no URL/duration/capacity option. Private fixture worker imports copied pure policy and exposes only exact fixture-completed DELETE paths, checks terminal+all disconnected+no socket membership inside production room queue, calls awaited production repository deletion and verifies absence. Actual protocol probes live cleanup and requires409 before continuing each game. Abort listener removed per stage. Existing production src/rules/assets/locks unchanged. Source tests add5cases (12LoadPolicy total); final soak-only timing guards also cover cleanup/report-write gaps between batches. No60minute run has completed or started in this continuation; short proof below is not soak approval.

2026-10-04 — Corrected ACK-based pacing passes actual allocated Redis7+AOFalways/Caddy2/compiled production handlers+Redis adapter, pinned container/hostNode22.23.3, real clock and rate limits enabled. Dedicated internal backend/Redis network plus loopback-only Caddy ingress; no .env/admin credentials/user data/remote target, fake seats or shared service changes. Report dfb321: first1room10seats completes160phase visits/10rounds/10receipt replays/11expected rejections/1resume/10converged seats in34.452s; subsequent10rooms100seats completes1600phase visits/100rounds/100receipt replays/110expected rejections/10resumes/100converged seats in96.400s,0unexpected ACK errors. ACK p95/p99=49.948/79.144ms first stage,274.682/384.610ms concurrent stage; authenticated hydration p95/p99=666.605/939.742ms concurrent stage. Each reward and terminal verifies committed history/finite collection/receipt/revision convergence. This is hydrated integrity evidence, not measured zero broadcast delivery loss or60minute soak/capacity/SLO/device/host-loss acceptance. Exact helpers/lock/copied backend source SHA and cached image IDs captured; all six labelled owned resources removed, context/report retained.

2026-10-04 — Exploratory fixture runs7wudDg/G5olxr completed the single-room160phase/10round scenario but FAILED concurrent-room admission; G5olxr records exact fixed metadata UNEXPECTED_SELECT_CARD_RATE_LIMITED. Cause: pacing from send time does not preserve server admission spacing when proxy/queue latency varies. Correct the fixture ONLY: measure the next minimum interval from successful ACK, preserving real clocks and enabled server limits. Add pure changed-latency regression and strict finite-clock bounds; do not loosen limits, retry rejected actions invisibly, alter game rules or count failed stages as success. Failed evidence retained and all six owned resources removed.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-09 final recovered-host fixed60minute soak **vgiaBk PASS**, process exit0, real-load/v2 mode=soak/completed=true/31complete batches/3679225ms measured workload (61m19.225s, bounded last-batch overrun). Single-room gate78391ms plus31×10room×10seat full ten-round batches. Every batch satisfies1600phase visits/100rounds/100receipt replays/500automatic+1100manual transitions/10resumes/100converged seats/10terminal rooms removed/0unexpectedACKs; no invalid batches. Totals including gate3110rounds/49760phase visits/3110replays/15550automatic+34210manual transitions/3110converged seats/311finished synthetic rooms removed. Two replay and two hydration presence-only interleavings proved by actual successful raw-state commit trace, not arbitrary newer revisions. All6exact owned resources removed; report/context retained at tmp/qa-642988e27c6c48068406edd3bd04cc49/emcoin-real-load-vgiaBk/report.json. Per-concurrent-batch ACKp95 range153.480–211.930ms/p99 188.419–459.438ms; hydrationp95 330.988–430.029ms/p99 498.337–699.840ms. These are ranges of individual quantiles, NOT pooled percentiles/production SLO. Five helper/lock hashes match final source; fixed real clocks/rate limits/phase/ledger/terminal checks retained. Earlier failed/interrupted runs preserved. No device/WAN/host-loss/two-backend failover/broadcast-zero-loss/capacity/release or41task completion claim.

2026-10-09 recovered-host continuation — exact runtime socket directories preserved by rename, no reset/container/volume/image/data deletion; local Linux API restored and cached images inspect successfully. Recovery receipt: docs/ops/2026-10-09-docker-runtime-recovery.md. Fresh final-refinement short **ScAbgu PASS**:1room77898ms/10rounds/160phases/50automatic+110manual transitions,10rooms109760ms/100rounds/1600phases/500automatic+1100manual transitions.110receipt replays/0unexpectedACKs/110converged seats; all11finished rooms removed through awaited production deletion and final6owned resources removed. Concurrent ACKp95/p99=137.322/179.264ms, hydration319.193/459.072ms. Per-stage caps/rate limits/real clock/full conservation and strict phase/round checks retained. Current fixed60minute soak restarted from zero after this pass; running report is not acceptance. Source/assets/locks unchanged during execution. Earlier failures remain evidence, not retroactively green.

2026-10-09 resumed continuation — final-refinement short F7sCV5 FAILED HYDRATION_TIMEOUT in the concurrent stage; single-room gate completed77461ms/160phases/10rounds/50automatic+110manual transitions. All six owned resources removed. The tool wait was interrupted/returned after a long wall-clock gap, but that does not establish a runtime root cause or permit counting a timeout as PASS. Fresh O5i3eZ FAILED Docker preflight with OWNED_DOCKER_COMMAND_FAILED, no stage/resources allocated. Read-only diagnostics: Docker Linux API initially absent, then unresponsive; WSL lists docker-desktop stopped. Existing Docker host startup log reports Inference manager unable to remove/listen on local dockerInference reparse-point socket. Standard docker desktop start did not produce ready primary. No factory reset/socket deletion/volume removal/WSL shutdown/service reset performed; repairing host Docker is outside repo and owner authorization was requested. Full60minute rerun remains pending, not blocked by an invented application success.

2026-10-09 — D6vUeS FAILED PHASE_DRIFT in batch24,23completed batches/1848497ms; all six owned resources removed, failure/context retained. Two replay revision deltas had actual successful presence-only proof; this does not prove the first lYErMd cause or waive the new phase failure. Original failed report has no phase context, so the automatic/manual race is a source-supported hypothesis, not proven retrospective diagnosis. Corrected automatic-flow short fixture BE2DsL PASS:1room78189ms/160phases/10rounds,10rooms112896ms/1600phases/100rounds,110receipt replays,0unexpected errors, all six resources removed. It predates final hydration-presence proof/counters. After that final refinement, current54files601tests PASS25.94s + TypeScript build; report r30-auto-transition-backend.json. LoadPolicy15tests include strict automatic-transition rejection and diagnostic/manual-branch guards. Final short repeat and full60minute rerun still pending; no soak/capacity/SLO acceptance.

2026-10-09 — first actual soak lYErMd FAILED in batch3 with DUPLICATE_COMMIT,2completed batches/149034ms workload, not60minute PASS. All six owned resources removed, context/report retained. Original artifact lacks commit-kind observation, so cause is not retrospectively proven. Read-only source shows periodic60s presence saves increment revision while public projection omits lease timestamps. Added deterministic real-handler intervening persisted lease regression: replay returns current revision/unchanged Coin, no extra primary eval/broadcast/state write; original exact-revision no-intervening case retained. Pure classifier rejects revision-only duplicate writes, revision jumps, Coin/log/phase/activity edits or backward leases. Focused34PASS4.84s, full54files599tests PASS25.59s + TypeScript build; JSON r30-presence-replay-backend.json. Fixture-only recorder tracks max1000revision kinds per active synthetic room, removes traces after terminal deletion; new proof endpoint exposes only aggregate presence-only/count for exact bounded IDs/ranges, never room content. Load replay still compares full projected domain/ledger and requires every extra revision accounted for by successful presence-only commits. New soak starts from zero; running report is not success. No production source, timers, limits, rules, art or credentials changed.

2026-10-09 — new fixture short run **hJgEte PASS**, Redis7/AOFalways+Caddy2+production compiled handlers/adapter, real clock/rate limits enabled/pinned22.23.3, isolated internal network+random loopback proxy. Single room31.723s:10rounds/160phase visits/10receipt replays/10converged seats;10rooms80.892s:100rounds/1600visits/100replays/100converged seats. Both zero unexpected ACK errors. Concurrent ACK p95/p99=205.946/267.370ms, hydration p95/p99=495.373/651.161ms, exploratory local-only. All11actual live-room cleanup probes return409, games retain exact history/finite Coin and terminal convergence. After disconnection,1+10terminal rooms removed through awaited production delete; final six exact owned Docker resources removed, copied context/report retained at `D:/Desktop/coinem/tmp/qa-642988e27c6c48068406edd3bd04cc49/emcoin-real-load-hJgEte/report.json`. Only synthetic content removed, not user rooms/shared resources; finished room data is not retained as backup. This run predates final soak-only between-batch/cleanup gap guards, no change to executed short-path/worker/protocol. Current full backend54files/597tests PASS27.11s + TypeScript build, JSON `r30-soak-policy-backend.json`, focused LoadPolicy12PASS and Node syntax checks PASS. No timeout/limit/assertion waiver. Actual60minute soak remains **not run**, no production capacity/SLO/broadcast-zero-loss/host durability/device/release claim.

2026-10-04 — Pure/static LoadPolicy7testsPASS (closed loopback URL, nearest-rank nonmutating bounded finite/sparse sample rejection, fixed capacity, exact ownership, changing proxy latency and ACK-based pacing, private topology, actual handlers/registry/adapter/no mocks). Full current backend/browser matrix follows separately. Initial wrong-cwd Vitest invocation cannot resolve setup and was corrected to be/; one static test incorrectly matched the word dotenv in a safety comment and was corrected to inspect require calls, not suppressed. Failed exploratory p26M7B/GnHHWd/7wudDg/G5olxr and interrupted mD5lF6 evidence retained; only dfb321 is full short-load PASS. mD5lF6 recovery verified ALL six exact ownership labels and stopped containers before any removal; no running/shared resource touched. Opt-in command: pinned Node `be/scripts/test-real-load.mjs` with no arguments; recovery only exact allocated TEMP evidence path. No production-SLO or task-done approval.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

Codex self-review2026-10-09 final soak receipt: measured workload exceeds3600000ms and remains below3900000ms;31reported concurrent batches all satisfy exact phase/round/receipt/transition/convergence/cleanup counts,6final ownership cleanups succeed and process exits0. Last whole batch is completed, not truncated. Presence traces authorize only successful strictly presence-only revision deltas; Coin/history/phase/round checks remain intact. Quantiles remain per batch; source instrumentation/closed local topology limit interpretation. This accepts the local fixed-duration fixture, not the whole R30 SLO/production sizing task or release.

Codex self-review2026-10-09 (owner-approved, not independent): original replay revision equality was invalid when a separate successful presence lease commit interleaves. The corrected fixture does not accept arbitrary newer revision: entire projected domain/ledger must match and every intervening revision must have an observed successful presence-only raw-state commit, with backward lease/domain/revision-only writes rejected. Memory trace caps1000entries per active synthetic room, clears after exact terminal cleanup, unknown ranges fail closed. Proof/cleanup endpoints exist only in the generated private fixture worker/image, never production index/router; no user-data mounts/env-file/remote target. Original lYErMd failure retained, not retroactively waived; current instrumented soak remains pending until full duration/cleanup. Instrumentation adds local observer overhead, so measurements are exploratory rather than production capacity/SLO. Native/device/WebKit/host-loss/broadcast delivery and release gates remain separate.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
