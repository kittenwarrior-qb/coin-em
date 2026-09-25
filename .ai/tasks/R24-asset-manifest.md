# R24 Asset manifest

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R15

## Goal

Manifest from catalog, license/consent record and validation/crop/thumb/cache budget.

## Current evidence

Metadata/source/fallback/version asset chưa thống nhất; font/CDN failure còn warning.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R24)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R15.
- fe/public; fe/src/constants/cardImages.ts; fe/src/utils/cdnUrl.ts; fe/src/hooks/useAssetPreloader.ts; fe/src/components/game/GuideBook.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`canonical catalog → manifest asset records → preload/cache/fallback → rendered approved face`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R24.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked bởi OQ-09: catalog physical và license/consent; không dùng AI asset làm nguồn luật.

## Implementation plan

1. Inventory public/CDN assets, current card image maps, preload behavior, font failures and source/license evidence.
2. Wait for OQ-09 approved catalog, front/back pairs and rights; keep unverified assets explicitly quarantined rather than guessed.
3. Define a versioned manifest generated from canonical catalog with source, hash, dimensions, crop, fallback, license/consent and cache fields.
4. Validate manifest against catalog/asset files in CI-safe tooling; make renderer/preloader consume manifest records rather than parallel maps.
5. Add bounded retry/dedup/concurrency and failure states so missing CDN/font/asset degrades to approved fallback without blocking game.
6. Test manifest coverage, missing/corrupt asset, offline CDN, face pairing and cold/warm cache budget; hand character runtime effects to R25.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
