# R38 Website và documentation

**Priority:** P1  
**Status:** in progress
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

Plan revision2026-10-09 — complete current registered guide/navigation consistency, not a legal policy or reskin. Admit fe/src/content/siteNavigation.ts, existing AboutStory.tsx/CoinRulesGuide.tsx and adjacent guide/header/router tests. One immutable three-page public navigation map supplies Router and siteContent/SiteHeader (explicit lazy page component bindings, no dynamic arbitrary imports/new legacy/pilot routes). Normalize trailing slashes for active labels and announce current link in desktop/dropdown navigation. The registered AboutStory currently labels itself Offline-first and lacks readable approved60Coin rules; clarify Internet-required web versus in-person conversation, reuse exact existing CoinRulesGuide before original tutorial illustrations, include approved support contact and keep all9tutorial image URLs/bytes/content unchanged. No new gameplay/physical deck/consent/operator/license assertions, new privacy policy, package/lock/config/image/layout replacement. Extend only the owned public-info browser fixture to check guide/current-route/mobile geometry/support/original illustrations/no private or tracker requests under original110sowned/120souter limits, record v2 evidence scope. Public operator/store/signing and release choices remain real owner gates.

### Plan revision 2026-10-04 — truthful current web capacity/connectivity copy

Admit be/tests/browser/public-info.browser.ts for production-preview3viewport approved facts/support/navigation/overflow and no backend/analytics request checks, with owned trace/screenshot teardown. Admit CI artifact path and existing BrowserCIGuard solely to preserve this new public-info evidence alongside existing opt-in suites. No build/release workflow trigger, secrets, runtime rule or remote action changes.

Existing About quickStats still claims4–8players per table while approved/current RoleDeck and actual production handlers support5–10. Extend existing approvedGameInfo.ts with current web playerCount, render it in About explicitly labelled web rather than silently rewriting a physical/pilot rule. Clarify siteFacts that physical conversation is face-to-face while the web needs Internet; R31 offline scope is public guide only, never offline gameplay. Adjacent shared-fact/actual About text regression only, no layout/CSS/fonts/art/physical deck/historical statistics/new public legal policy or release change. Source remains stable until current browser fixture completes. This is content correction, NOT reskin.

Follow-up source audit: heroFacts also belongs to legacy site content, so changing it alone is not proof of registered About copy. Put the Internet/public-guide-only sentence into the actual current About lead and assert its visibility in both real component and production browser. First public-info TSo4W9 passes player range/support/geometry only, before this final lead sentence; copied matrix in progress also predates the sentence and must not be labelled the final exact-source matrix. Rerun current copy/build/browser after it settles; no hidden weakening or art change.

### Plan revision 2026-10-02 — owner-approved audience/support/coin guide

Scope adds shared `fe/src/content/approvedGameInfo.ts`, game `CoinRulesGuide.tsx` and existing GuideBook/GameMenuModal consumers. Apply only owner-approved current audience 6–18, support emcoincloud@gmail.com and finite coin60 rules. Keep original tutorial/card images unchanged, readable coin rules as a separate initial guide view with original illustration view still reachable. Do not rewrite historical pilot demographics/research, claim legal consent, or replace imagery. Registered website About/siteContent age/support consume one fact source; representative contacts remain unchanged. Final privacy policy, rights and broader route/document cleanup remain separate gates.

1. Inventory registered routes, unregistered pages, navigation links, rules/help text, asset sources and public claims against current source and approved documents.
2. Wait for R01/OQ-08/OQ-09 final rules, privacy/support and asset approvals; mark draft/unknown content rather than publishing a claim.
3. Define one navigation/content map with owner, source-of-truth and rulesVersion references; separate game UI from marketing/help pages.
4. Migrate route/menu/content references incrementally, retaining verified external-link behavior and accessible headings/landmarks.
5. Add link/route/mobile/accessibility checks and content review checklist for rules, privacy, support, asset attribution and no-child-data leakage.
6. Publish only approved content; retain rollback via versioned content/route change, not unsupported gameplay descriptions.

## Implementation report

2026-10-09 — shared PUBLIC_SITE_PAGES binds the same three lazy public routes and header links; trailing slashes now preserve aria-current. AboutStory renders the existing approved readable CoinRulesGuide/support before all nine unchanged original tutorials. Removed misleading Offline-first wording in favor of approved Internet-required/public-guide-only wording. No artwork, CSS reskin, new legacy route or public legal policy.

2026-10-04 — About consumes approved5–10 web-player range rather than old4–8; actual visible lead explicitly requires Internet for web play and limits offline to public instructions. Shared legacy hero facts agree; historical physical/pilot claims and every image/card remain untouched. Added production-preview public-info browser fixture and CI artifact preservation, not a publication or reskin.

Shared owner-approved current audience/support/rules version module consumed by About, site facts and support menu. About is now 6–18/current support address; existing representative contact and historical pilot content unchanged. Read-only HTML CoinRulesGuide is GuideBook's initial view with all approved 20/20/20 allocation, meanings, reserve, optional gifting and collection/reset wording, plus previously approved non-regifting. All nine original tutorial image paths remain behind “Minh họa gốc”; no image replaced/reskinned. No legal/privacy/therapeutic claim added. Broad route/doc guide consistency, rights/consent review and public privacy policy remain.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-09 — frontend57files615testsPASS18.96s; focused14PASS after correcting test-only unsupported options and using real Enter activation of Radix. TypeScript/lint/buildPASS (build26.22s). Owned production browser pLUJrq v2 PASS21.38s at320/390/1280: actual guide/current links/menu navigation, exact original nine URLs, zero horizontal overflow/private-or-tracker requests/page errors. All three guide screenshots inspected; vertical scrolling remains intentional on small phones. No physical-device, rights or legal acceptance.

2026-10-08 — fresh production public-page browser X2EKT4 PASS6.588s in the current9case short matrix. Original approved capacity/support text and320/390/1280 geometry assertions pass; private/tracker requests0/errors[], no backend. Not legal/privacy/asset-rights/device acceptance or reskin. Source unchanged; R29 aggregate457.35s report and screenshots retained.

2026-10-04 — Final current lead-copy production browser PASS30.06s: owned emcoin-public-info-browser-qa-0DdwMl/report.json, Chromium147.0.7727.15,320×568/390×844/1280×900, exact visible range/audience/connectivity/support/navigation checks,0horizontal overflow/0private-or-tracker requests/0errors/no backend connection. All3 fact screenshots inspected. Current focused5 component tests/typecheck/build PASS; copied clean eXWZwK all9commands PASS including FE570. No physical-device, rights, legal or release acceptance inferred.

Final guide visual/geometry check after complete opening animation: `C:/Users/Admin/AppData/Local/Temp/emcoin-board-qa-LJxJeW/report.json`, all nine viewport rows pass, including whole-rule scroll reachability and unchanged original tutorial path. Browser screenshots inspected at 320×568 and short landscape. No physical keyboard/Safari/screen-reader proof.

2026-10-02 full frontend 14 files / 118 tests pass, zero skipped. Three new shared-fact/coin-text/original-illustration-toggle tests; build passes, lint 0 errors/8 existing warnings. Browser guide checks use the isolated R21 synthetic fixture, not accounts/real child data. Neither fixture nor unit tests prove original tutorial text agrees with current web rules; its artwork remains unchanged by explicit owner scope. No publication/release approval claimed.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

2026-10-09 owner-approved Codex self-review: route registry keeps explicit lazy component bindings, no arbitrary imports; header is accessible on trailing-slash URLs. Public text uses the same approved game facts as in-room guidance without changing protected tutorials. Frontend-design skill influenced preservation of the existing cartoon layout, not a new style. Operator/privacy/license/publication gates remain open.

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
