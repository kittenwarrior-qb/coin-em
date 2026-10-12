# R34 Store release

**Priority:** P2  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R32, R33, R35, R37

## Goal

Signed AAB/IPA, disclosures/rating, reviewer guide and tested deep links.

## Current evidence

No native build/signing/store review or privacy form evidence.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R34)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R32, R33, R35, R37.
- capacitor/android modules; capacitor/ios modules; Caddyfile; fe/src/Router.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`release build/signing → privacy/rating metadata → internal track/reviewer flow → monitored rollout`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R34.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by OQ-08/OQ-10 and current official-store verification; no submission/signing without owner.

## Implementation plan

1. Wait for R32/R33/R35/R37 completion plus OQ-08/OQ-10 approval; verify current store requirements from official sources at execution time.
2. Prepare a release checklist covering owner-controlled signing, build provenance, privacy/data disclosure, age rating, support, reviewer access and rollback/contact.
3. Create internal-test builds only through approved signing authority; attach exact artifact digest, source SHA and native lifecycle/deep-link evidence.
4. Run reviewer-style install, first launch, permissions, offline/reconnect, account/deletion/support and deep-link flows on named devices.
5. Submit only after release owner signs metadata and legal/privacy evidence; preserve rejected-review feedback as task evidence.
6. Do not claim approval, purchase accounts, sign, submit or expose secrets from this task plan.

## Implementation report

### Plan revision 2026-10-12 — hướng dẫn enrollment và store gates

Owner chưa có tài khoản Google Play Console/Apple Developer hoặc iOS build environment và yêu cầu hướng dẫn. `docs/ops/mobile-release-roadmap.md` ghi setup theo nguồn chính thức, Android trước/iOS sau, testing/account/signing/privacy/UGC/Families gates. Voice scope mới đã chốt nhưng chưa implement; TestFlight không thay App Review. Status vẫn planned, không tạo tài khoản/thanh toán/ký/submit hay khẳng định đã được duyệt.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
