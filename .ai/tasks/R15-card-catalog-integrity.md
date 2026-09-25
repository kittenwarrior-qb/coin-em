# R15 Card catalog integrity

**Priority:** P0  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R04, R07

## Goal

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

Blocked bởi OQ-01/OQ-09 về catalog chuẩn, front/back, license; không tự map ID/asset.

## Implementation plan

1. Compare all FE, BE, physical and asset representations; produce an evidence table of ID/category/front-back/source mismatch.
2. Wait for OQ-01/OQ-09 owner-approved catalog, rights and face pairing; do not infer mappings from filenames or images.
3. Define a versioned canonical catalog and reviewed legacy map; separate gameplay ID/category from asset URLs/manifest fields.
4. Change selection requests to approved IDs only and resolve category/phase/actor/count server-side through R04/R07 boundaries.
5. Migrate snapshots and UI consumers using the legacy map with explicit unsupported-ID rejection and no client object trust.
6. Test unknown/wrong-category/wrong-phase/duplicate/max selection, reload persistence and approved front/back fixture matching.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
