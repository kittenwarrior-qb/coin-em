# R20 Phase UI registry

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R06, R12, R19

## Goal

Exhaustive phase renderer registry dùng server capabilities/action status.

## Current evidence

FE đoán phase order/quyền qua ảnh/role thay vì state/capability server.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R20)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R06, R12, R19.
- fe/src/pages/GameBoard.tsx; fe/src/components/game/PhaseOverlays.tsx; fe/src/stores/types.ts; fe/src/components/game/types.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`server phase/capabilities → registry selection → owner/non-owner/pending renderer → terminal guard`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R20.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked cho UI behavior nếu OQ-01/OQ-04 chưa chốt; không encode luật mới ở client.

## Implementation plan

1. Inventory all FE phase/role/order inference and map each to its R06-approved projection/capability equivalent.
2. Do not encode unresolved R01/OQ-01/OQ-04 behavior; list unsupported phase/capability combinations as blocked or explicit safe fallback.
3. Define an exhaustive registry keyed by approved phase IDs, with owner/non-owner/pending/terminal renderers consuming typed capabilities.
4. Migrate phase views incrementally from inferred role/image checks to registry selection; let R17 action status drive controls.
5. Provide an explicit unknown/legacy phase diagnostic that does not offer a mutation and does not expose secrets.
6. Test every approved phase × owner/non-owner/offline/pending and terminal/unknown cases; update only after R06 contract changes are accepted.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
