# R33 Privacy và deletion

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R05, R09, R11

## Goal

Data map, policy/routes, authenticated deletion/revocation, retention and log scrubbing.

## Current evidence

Guest IDs, sessions, rooms, logs, analytics, images and backups lack documented lifecycle.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R33)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R05, R09, R11.
- game.md; fe/index.html; fe/src/utils/userId.ts; be/src/persistence.ts; be/src/modules/room; be/src/modules/game; fe/src/components/site/SiteHeader.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`data inventory → consent/purpose/retention → authenticated delete/revoke → tombstone/backup-safe enforcement`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R33.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Current owner direction2026-10-03 supersedes the historical retention/backup questions below: one-hour room inactivity expiry; NO new deleted-room content archives or external VPS backups. Existing archives are preserved, minimal seven-day anti-resurrection/audited-close markers remain. Audience6–18/Vietnam/support/admin mechanism already approved, not reopened. Owner requests no consent prompt/individual-data deletion feature; this is product scope, not legal clearance for minors. Responsible operator/legal/device/release review remains separate.

Latest 2026-10-02 — Retention đã chốt **1h inactivity / 7d backup**; supersedes unresolved retention notes below. Audience/support/card IP cũng đã xác nhận. Consent/guardian/legal review, external backup enforcement và authenticated individual-data deletion/revocation vẫn chưa hoàn tất. Không cần hỏi lại owner về hai mốc retention.

2026-10-02 — Owner đã xác nhận audience 6–18 tuổi, email hỗ trợ emcoincloud@gmail.com và quyền sở hữu trí tuệ bộ thẻ. ADR `docs/adr/2026-10-02-owner-scope-and-audience.md`. Retention phòng/backup, consent/guardian, deletion authority và legal review vẫn mở; không lấy cleanup 24h làm policy tự động.

Blocked by OQ-08/OQ-10: audience, consent, contact, retention, owner; no legal conclusion without approval.

## Implementation plan

### Plan revision 2026-10-13 — communication domain and current analytics map

Owner prioritizes text chat and defers voice. Admit the unregistered immutable
`communication/RoomChat.ts` contract/projection module, owner-approved independent
mute policy and nearest tests. Host invitation is required; no DM/stranger chat,
no report/voice transport or production data collection is enabled at this step.
History/receipts/identity maps are bounded and belong to the future room snapshot;
read/retry does not extend inactivity. Document the existing newly deployed
analytics store accurately, including2day salted visitor hashes and400day daily
aggregates. This is not an anonymity/legal clearance statement or new retention
decision. Runtime/storage/report/admin/UI integration remains a separate gate.

### Plan revision 2026-10-04 — truthful source-only minimized data map

Admit docs/ops/r33-data-map.md to reconcile actual browser/active Redis/legacy JSON/presence/marker/admin/volatile aggregate/redacted diagnostic/CDN/support boundaries with current owner decisions and source. No fabricated retention for proxy/CDN/mail/storage history, no anonymity/zero-collection/legal-compliance claim, no new deletion/consent endpoint or public legal policy. Document logical deletion vs physical AOF/legacy archive/operator boundaries and missing legal configuration. This is evidence preparation, not production processing approval.

Plan revision retention 2026-10-02: owner duyệt phòng inactive 1h / backup 7d. ADR `docs/adr/2026-10-02-retention-approved.md`. Implement shared persistence cleanup/deletion-marker/managed-backup lifecycle qua R08/R10/R11 và tests; scope thêm retention constants/storage key và cleanup handlers. Đây là một technical subset, không phát hành policy pháp lý hay thêm delete-user endpoint. Audience/support/card IP đã xác nhận, consent/guardian/legal và external backup operator enforcement còn mở.

1. Inventory personal/pseudonymous data across rooms, sessions, Redis/JSON, backups, logs, analytics, assets and support channels; classify purpose/access/retention evidence.
2. Wait for OQ-08/OQ-10 owner decisions on audience, lawful basis/consent, contact, retention and deletion authority; obtain appropriate legal review rather than make legal claims.
3. Define authenticated request/delete/revoke flow tied to R05 identity, R09 token generations and R11 tombstones/migrations.
4. Implement minimization and structured log scrubbing before adding telemetry/admin views; ensure deletion prevents ordinary restore resurrection.
5. Add access-control, deletion/revocation, tombstone/backup and redacted-log regression tests using synthetic data only.
6. Publish approved policy/support language and operational runbook with retention limitations; mark any legal or backup exception explicitly.

## Implementation report

2026-10-13 follow-up: corrected policyv2 to keep gameplay silence/healing separate
from safety moderation. Chat immutable domain has26passing unit cases covering
host invitations/rotation, exact receipts/stale replay, expiry, bounded history,
server-derived identity, rate limiting, recipient blocks/mute and reserved JS
record keys. Existing roomView does not expose the new private state. No chat
events, UI, report database or provider has been activated. The source data map now
distinguishes daily tracking aggregates/pseudonymous2day hash from process-local
operational metrics; raw IP/UA transit and upstream storage are not falsely
treated as anonymous or zero collection. Report/operator/legal/device gates stay
open; whole R33 is not done.

2026-10-04 — Source-only data map added at docs/ops/r33-data-map.md after owner superseding archive decision and R35/R36 implementation. Actual guest browser credentials, active room names/roles/text/coins, Redis/session hashes, legacy active JSON, content-free markers, fixed admin auth/close audit, process-local aggregate analytics and closed sampled logs are distinguished from provider/network/operator retention. No new room-content backups or VPS backups enabled, no existing archive/data deletion or server access. Logical room expiry is not falsely represented as immediate physical deletion from all AOF/media/provider logs. Public legal policy, responsible controller/legal review for ages6–18 and actual release remain open, not independently accepted.

2026-10-02 — Retention choice được ghi nhận và triển khai cho app-managed room/deleted JSON snapshot: 1h inactivity, 7d archived snapshot + minimal marker. Heartbeat không kéo dài lastActivity; cleanup gồm waiting/playing/ended/fake-only, fresh queued/CAS deletion. No user-data deletion endpoint/legal compliance claim/production cleanup run. External AOF/volume/Umami/operator copies cần enforcement riêng; không bị ứng dụng tự xóa.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
