# R15 Card catalog integrity

**Priority:** P0  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R04, R07

## Goal

2026-10-12 follow-up: new PDF gameplay catalog/publication/version pinning now has local verification in `docs/qa/2026-10-12-published-pdf-catalog.md` (662 BE /732 FE tests,5/10-seat production-preview terminal runs,24 editor cases,real Redis restart). Role/combined-emotion face text is populated; canonical-only review preserves custom edits. R15 remains in progress for staging and public-gallery cutover, not because the earlier draft-only integration is still missing. No production activation or legacy-art deletion is claimed.

Canonical versioned catalog IDs, legacy map và server-authoritative selection.

## Current evidence

Client gửi object/URL; catalog FE/BE/physical và card state không thống nhất.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R15)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R04, R07.
- be/src/constants/cards.ts; fe/src/constants/cards.ts; fe/src/constants/cardImages.ts; fe/src/components/game/CardInventory.tsx; be/src/modules/game/commands/SelectCardCommand.ts; be/src/modules/game/commands/SelectSelfcareCardCommand.ts; fe/src/pages/CardShowcase.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`card ID/category request → contract validation → catalog resolve → phase/deck validation → persisted selection projection`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R15.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

2026-10-03 — Owner answer19 explicitly confirms current100-card web reference for this version with no physical-deck synchronization. This resolves version catalog choice without changing any ID/content/front-back/art or claiming third-party asset rights. Historical physical-catalog block below no longer applies to this version; unknown legacy mapping/migration/release checks remain separate.

Blocked bởi OQ-01/OQ-09 về catalog chuẩn, front/back, license; không tự map ID/asset.

## Implementation plan

### Plan revision 2026-10-12 — owner-approved managed replacement catalog

Owner explicitly supersedes frozen-web-only content scope: implement lightweight SQLite metadata + media URL catalog and admin editing for replacement PDF, test before native/store work. Owner confirms paired combined-emotion pages are two faces of one card, PDF rules authoritative subject to approval of differences before gameplay mutation. Scope expands to `be/src/catalog`, admin registrar/startup, adjacent tests; FE admin catalog editor/client, source PDF mechanical export/import scripts and reviewed fixtures/docs. No old face/art deletion, provider upload/payment, production deploy or store submission. Catalog drafts and immutable prepared snapshots may be implemented now, but active-game integration/replacement activation require approved rules/pair audit and pinned-room version contract. Preserve legacy active-room resolver until migration tested; do not mark all task/release gates complete from draft CRUD tests.

### Plan revision2026-10-03 — client ID-only request boundary

Scope includes `fe/src/hooks/useSocket.ts`, a pure `features/game/selectors/cardIdentity.ts`, adjacent helper/transport tests and the existing isolated `be/tests/integration/card-catalog.test.ts`. Existing server resolver already accepts `{id}` and restores exact frozen category/art/metadata. Send only own string ID for select_card, optional night cardData, situation preview/fan cards; retain original event names/type/null/undefined/position/ACK/connection/session semantics and server rejection of unknown/missing/wrong-phase IDs. Do not perform FE catalog guessing, alias rewriting or local authority validation. All backend direct-client category/URL rejection tests remain. Keep original CardData objects/catalog/card bytes/face pairs untouched; no reskin/physical mapping/migration. Positive canonical ACK and existing duplicate/stale/uncertain guards remain authoritative.

### Plan revision 2026-10-02 — frozen current-web validation

Projection/rollback scope extension: include `be/src/modules/game/services/RoomView.ts` and its tests to sanitize selection projections and cap resume expiry at the approved room retention. Reuse existing PHASE_CHANGED/previous log markers for active selection validation; no persisted log rewrite or rollback-rule change. Associated frontend reducer/type changes are recorded under R18.

Scope thêm `be/scripts/read-web-card-baseline.cjs`, generated `be/src/constants/webCardBaseline.json`, pure resolver/selection validator, ActionValidator, gameHandlers và focused/loopback/parity tests. Baseline trích xuất **chính builder CARD_DATA và CDN transform đang chạy**, giữ nguyên ID/URL/category/subType/cặp mặt; không đổi FE/art/content, không suy map physical. Version `web-card-baseline/v1` chỉ là engineering frozen reference, không quyết định canonical physical deck hay migrate snapshot. Runtime resolve client object bằng known ID, bỏ URL/client fields; phase/group/actor và existing FE max3 reflection được kiểm server-side. Aliases chỉ prefix form TH/BK/PT/VT đang định nghĩa rõ trong source, không map sample sit-1/emo-1/ref-1/care-1. Unknown legacy persisted selections không tự rewrite; migration vẫn gate R11.

1. Compare all FE, BE, physical and asset representations; produce an evidence table of ID/category/front-back/source mismatch.
2. Wait for OQ-01/OQ-09 owner-approved catalog, rights and face pairing; do not infer mappings from filenames or images.
3. Define a versioned canonical catalog and reviewed legacy map; separate gameplay ID/category from asset URLs/manifest fields.
4. Change selection requests to approved IDs only and resolve category/phase/actor/count server-side through R04/R07 boundaries.
5. Migrate snapshots and UI consumers using the legacy map with explicit unsupported-ID rejection and no client object trust.
6. Test unknown/wrong-category/wrong-phase/duplicate/max selection, reload persistence and approved front/back fixture matching.

## Implementation report

### 2026-10-12 — managed SQLite/admin draft stage

Actual catalog store +100logical PDF seed +145mechanically encoded source-page media implemented; immutable prepared snapshots do not activate gameplay. Restricted admin GET/save and FE editor support stable identity, fields/two faces, review/archive, optimistic revision and persistent retry receipts. Metadata empty/unreviewed by design until content review, runtime legacy deck still unchanged. Local FE719/BE630tests, build/lint/types and24synthetic admin browser cases passed; login body-limit regression caught and fixed without relaxing login4KBguard. Reports and explicit gaps: `docs/qa/2026-10-12-managed-catalog-draft.md`. Owner-approved PDF rule exceptions and round-count plan linked in ADRs. No CDN upload, production DB/deploy, new-catalog gameplay acceptance or store action claimed.

2026-10-03 client ID-only continuation: pure cardIdentity copies only own string ID without consulting/rebuilding the catalog; select_card/optional night cardData/preview/fan emissions now use existing `{id}` shape. Original action/type/target/position/null/undefined/offline/ACK/duplicate/uncertain behavior and original CardData objects/URLs/200face pairs remain. Backend source/resolver unchanged; new actual loopback test accepts canonical ID-only request and verifies exact broadcast/persisted card/capability. BE full42files495 PASS; FE full43files463 PASS before equivalent compatibility helper correction, final focused170 helper/transport tests PASS; full FE lint0errors0warnings/TypeScript/Vite32.63s PASS. Initial test incorrectly iterated non-card CARD_DATA metadata alongside arrays, fixed to explicit five100-card groups; TypeScript caught Object.hasOwn outside current lib target, corrected to existing-compatible hasOwnProperty.call without raising target/suppressing diagnostics. Final exact-source clean matrix/browser proof follows separately; current source total958 expected/regular evidence scoped honestly. No card reskin, new event/rule, physical mapping/migration, primary durability/device/independent/release acceptance. ADR updated with compatible-resolver-first rollout requirement only, not deployment authorization.

2026-10-02: Frozen `web-card-baseline/v1` contains all 100 current web builder cards (7 role, 32 situation, 32 emotion, 14 reflection, 15 selfcare), exact current ID/category/subType/front/back URLs. Read-only extractor and parity tests prove source equality without fetching remote images. Runtime resolver discards arbitrary client URLs/extra fields; commands, validator, selection broadcasts, preview/fan relays and recipient RoomView use resolved copies. Server rejects unknown IDs, mismatched category, wrong phase/actor, disabled groups, repeated selection, selfcare reuse and reflection over 3 in the current round. RoomView strips old client extras without rewriting persisted data; unknown legacy selection is null/review-required, not guessed. Projection resume expiry is bounded by the approved one-hour room inactivity expiry. No card art/text/face pairing or frontend card source was changed. ADR: `docs/adr/R15-frozen-web-card-validation.md`.

Full backend suite: 38 files / 467 tests pass, zero skipped; 25 pure/parity/engine-rollback tests and 4 actual isolated loopback handler tests added. Finite-cycle rollback preserves history: validation now counts active selections after existing rollback markers, allowing reselection without changing logs/coins. Loopback primary storage is mocked, not Redis durability proof. Backend typecheck/build pass. Physical catalog reconciliation, reviewed persisted migration and independent browser/device QA remain; not acceptance/done.

## QA report

2026-10-03 final958-source clean verification: fresh copied workspace `tmp/qa-642988e27c6c48068406edd3bd04cc49/emcoin-clean-toolchain-2OtVtg/report.json` passes all9 commands, including BE495/FE463 regular tests, lint and builds on Windows Node22.23.3/npm10.9.9. All897 source/test/public/PWA hashes and three lock digests match the current source. Three fresh npmci use only a previously verified owned npm cache (`--offline`), not original node_modules; no cold-network/Linux/device/production/independent approval implied. Authenticated5/10 browser verification is separate and must finish before claiming its result.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
