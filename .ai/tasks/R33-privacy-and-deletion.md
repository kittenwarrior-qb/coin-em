# R33 Privacy và deletion

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R05, R09, R11

## Goal

Data map, policy/routes, authenticated deletion/revocation, retention and log scrubbing.

## Current evidence

### Plan revision / verification continuation — 2026-10-15, bilingual seed

Owner requested implementing lightweight Vietnamese/English word filtering while
deferring contextual moderation. Admit the original `profanityChecks.ts`, existing
publication/transport closed errors, editable-draft UI copy and nearest unit,
socket and browser regressions. Implementation is already in source `9c4a382`;
this continuation verifies that commit and records limits. No new dependency,
provider, retention, catalog, game rule, production flag or deployment change.

Small original vocabulary uses normalized inspection only; accepted text remains
unchanged. Vietnamese accents and Unicode boundaries limit false positives;
identity, emotions, help-seeking and benign substring cases remain permitted.
Quoted listed words reject and unknown/contextual harms remain outside coverage.
No malware/all-evasion guarantee, legal clearance or store approval is implied.

The initial per-pattern Unicode classes caused accented-input event-loop stalls
and socket ACK failures. Source fix canonicalizes separators once, with small
classes per compiled pattern and a cold accented/max-length regression. Keep the
failure in the record; do not increase transport deadlines as a substitute for
fixing runtime work. Verification evidence is recorded below after completion.

Verification: BE888/74files, FE794/82files, backend TypeScript/build and frontend lint/build PASS.
Owned browser scenario PASS for both themes at320/390px: contact/profanity rejection,
editable draft, no recipient leak or uncertain retry, then valid send/block/report.
Real Redis fixture PASS:10rooms/100seats,100committed load messages/1000isolated
deltas, backend kill/replay, Redis AOF restart, CAS race, fail-closed outage and
selected-report retention. Same-host SQLite uses one schema initializer; not a
separate-host scale certification. See `docs/qa/chat-profanity-20261015/summary.json`.
No production activation, public-notice/staffing sign-off, device or store approval.

### Plan revision / implementation — 2026-10-14, local publication contact layer

Owner requested continuing toward staging. Expand scope to
be/src/communication/publicationChecks.ts, RoomChat.ts, chatHandlers.ts and their
tests, plus existing RoomChatPanel copy/error handling and browser/UI regressions.
No provider, production flag, retention, game rule, card asset or package change.

`chat-contact-check/v1` checks new publications locally: common scheme/domain
links, email, Vietnam-mobile/international-plus phone patterns and bidi overrides.
NFKC/zero-width inspection and bracketed-at/dot forms reduce simple evasion;
approved text is NOT rewritten. This is not a complete PII/contact or semantic
harm detector. Nicknames, images, addresses, spoken numbers, unknown domains,
obfuscations and contextual abuse need separate handling. Emotional disclosures
are not censored for distress/self-harm words; accepting them is not counselling
or a guarantee of staffed escalation.

Checks run after seat/admission/mute authorization and before new message, receipt,
revision, activity or send-rate timestamp mutation. Closed errors return no
rejected text; selected-report storage is unchanged. Existing committed receipts
remain replayable without publishing again. Denied drafts stay editable and are
not treated as uncertain retries. An explicit stable textarea label fixes the
accessible-name regression exposed by the real browser rejection workflow.

Final QA: BE827/73files and FE793/82files PASS; builds and frontend lint PASS.
Both-theme owned browser case passes rejection followed by valid send, retained
draft, no recipient leak and no uncertain-retry UI. Retained failures: initial
www-prefix pattern missed a host (fixed); browser exact-label query failed after
revalidation despite the visible retained draft (inspected screenshot, fixed
label association and regression). No skipped assertion or safety bypass.
Production remains disabled. Semantic moderation, public notices, staffing,
staging and physical devices remain gates. See docs/ops/chat-foundation.md.

Owner follow-up: defer contextual moderation for later; requested open-source
Vietnamese/English options and no unsafe/hacker links. Link detection expanded
to generic domain-shaped text/IDN punycode, explicit bracketed-dot obfuscation and
valid bare IPv4/bracketed IPv6. Chat still renders plain text, never auto-links,
fetches URLs, resolves DNS or opens previews. No malware scanner/all-evasion
guarantee is claimed. No open-source profanity dependency installed yet.

### Implementation / QA revision — 2026-10-14, selected-report UI

Added explicit in-context disclosure before chat/report submission: room chat is
invitation-only, avoid private information, selected reports reach admins and
expire seven days from message send. Admin DataPanel now describes this narrow
exception separately from whole-room deletion/no backups. Client projections
strip unapproved server fields; render evidence literally, do not store chat or
invitations in browser storage, and clear views after disconnect/seat revocation.
New chat/admin clients and UI tests are included in FE790 PASS; BE787 PASS.
Both-theme owned Chromium flow uses real handlers but mocked room primary and
intercepted admin HTTP. No production flag/data mutation or compliance approval.
Public legal/guardian consent wording, pre-publication checks, operator response,
real Redis/load and physical-device proof remain activation gates. See
docs/ops/chat-foundation.md; this revision does not complete R33 or certify stores.

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

### Plan revision 2026-10-14 — guarded chat/report runtime, default off

Admit `socket/handlers/chatHandlers.ts`, existing guarded handler registration,
`communication/ChatReportStore.ts`, optional production index wiring and nearest
contract/SQLite/HTTP/socket tests. Apply the owner's seven-day admin-only selected
report exception without storing all rooms/stories or adding a provider. Expiry
is bounded to selected message timestamp+7days; no replay prolongation. Require
configured safety storage before new publishing; preserve host closure and
committed retry during outages. No environment/production/UI/signing change;
safe rendering, pre-publication checks, operator procedure and real Redis/device
evidence remain gates before activating user chat.

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

2026-10-14: transport now uses the actual guarded socket and existing room queue,
fresh seat/session generation checks and awaited primary commit before ACK/delta.
Blocked recipients receive revision-only updates, not private text. Selected
reports use versioned bounded SQLite with real file close/reopen tests, dedup,
per-reporter limits, no-store fixed-admin APIs and prune-on-access/minute cleanup.
Unknown schemas reject without modifying unrelated tables. Report storage failure
disables new publishing while preserving committed retries and safety controls.
Default flag remains off; no deployed processing change or end-user chat claim.

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

2026-10-14: full BE72files787tests PASS with maxWorkers4 and TypeScript build
PASS. New focused scope44tests (22actual Socket.IO/queue cases with mocked room
primary,18real SQLite report cases including file close/reopen and unknown-schema
preservation,4real loopback authenticated HTTP report cases). A first unset-flag
fixture failed because its default function argument changed undefined to true;
fixed fixture, not the production flag. Exact primary/adapter failure, same-ID
retry, session replacement/stale generation, blocks, expiry, concurrent revision,
strict shapes, broker gap hydration and enabled rate limit checks pass. No real
Redis restart/multi-host capacity/browser chat UI/device/store result is claimed.
Native20policy/preflight cases PASS; read-only SDK check remains expected failure:
Studio JDK21 exists, SDK/platform/build tools/ADB/license record/emulator image
are absent. No feature deployed, license accepted or new microphone capability.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
