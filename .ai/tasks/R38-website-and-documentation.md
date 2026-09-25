# R38 Website và documentation

**Priority:** P1  
**Status:** planned  
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R01, R22, R24, R33

## Goal

One navigation/content map, rulesVersion guide and discoverable privacy/support.

## Current evidence

Website routes/content/docs drift from source/rules; some page files are not registered.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R38)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R01, R22, R24, R33.
- README.md; fe/README.md; e2e/README.md; fe/src/Router.tsx; fe/src/pages/About.tsx; fe/src/pages/AboutHow.tsx; fe/src/pages/AboutImpact.tsx; fe/src/pages/AboutTeam.tsx; fe/src/pages/siteContent.ts; fe/src/components/site/SiteHeader.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`approved rules/content/assets → navigation/routes/docs → public privacy/support → link/mobile validation`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R38.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Blocked by R01/OQ-08/OQ-09 for final rules, policy, support and assets; no claims beyond approved evidence.

## Implementation plan

1. Inventory registered routes, unregistered pages, navigation links, rules/help text, asset sources and public claims against current source and approved documents.
2. Wait for R01/OQ-08/OQ-09 final rules, privacy/support and asset approvals; mark draft/unknown content rather than publishing a claim.
3. Define one navigation/content map with owner, source-of-truth and rulesVersion references; separate game UI from marketing/help pages.
4. Migrate route/menu/content references incrementally, retaining verified external-link behavior and accessible headings/landmarks.
5. Add link/route/mobile/accessibility checks and content review checklist for rules, privacy, support, asset attribution and no-child-data leakage.
6. Publish only approved content; retain rollback via versioned content/route change, not unsupported gameplay descriptions.

## Implementation report

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
