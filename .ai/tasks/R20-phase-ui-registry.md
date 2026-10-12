# R20 Phase UI registry

**Priority:** P1  
**Status:** in progress
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

### Plan revision 2026-10-03 — exhaustive action renderer registry

Pair R19 extraction: include `features/game/phases/BoardPhaseActions.tsx`, GameBoard consumption and adjacent tests. All approved GamePhase keys have an action renderer, including explicit no-op phases and terminal. Existing server capabilities/connectivity/pending/checkpoint decide disabling, never hidden role images or an inferred next phase. Renderers preserve current sender/non-sender/finite/legacy/three-card presentation and expose existing local callbacks only. Validate registry coverage plus every phase under owner/non-owner/offline/pending and old-scope handler regression. No permission/phase/rule change or reskin; diagnostic/overlay registry and independent/device gates remain open.

### Plan revision 2026-10-02 — recipient phase view

Scope adds backend pure `PhaseView.ts`/RoomView integration and focused contract tests, frontend `features/game/phases/registry.ts`/diagnostic component and GameBoard consumption, plus existing useSocket wire type. Additive `phase-view/v1` is derived only from R06 registry and existing ActionValidator/CardCatalog decisions; no new event, permission or transition rule. Public projection receives no private actor capability. Navigation/display use server-computed applicable position/total/next/previous; client must not infer absent healer/Guide from hidden roles. Existing role image mappings stay untouched and become display-only. Legacy/missing/unknown phase view renders a read-only diagnostic, not guessed mutation controls. Offline transport remains the final send guard; this slice does not claim generic pending ACK migration or full phase-view decomposition.

Connectivity extension includes GameContainer passing its existing isConnected signal. Board action controls use an offline mask/native disabled fieldset; target/card/coin/vote confirmation handlers recheck connectivity and relevant capabilities. No offline command queue, fabricated pending status or new auth boundary.

1. Inventory all FE phase/role/order inference and map each to its R06-approved projection/capability equivalent.
2. Do not encode unresolved R01/OQ-01/OQ-04 behavior; list unsupported phase/capability combinations as blocked or explicit safe fallback.
3. Define an exhaustive registry keyed by approved phase IDs, with owner/non-owner/pending/terminal renderers consuming typed capabilities.
4. Migrate phase views incrementally from inferred role/image checks to registry selection; let R17 action status drive controls.
5. Provide an explicit unknown/legacy phase diagnostic that does not offer a mutation and does not expose secrets.
6. Test every approved phase × owner/non-owner/offline/pending and terminal/unknown cases; update only after R06 contract changes are accepted.

## Implementation report

2026-10-03 action-view registry continuation: every17 approved GamePhase key now has an explicit central-action renderer (including no-op and terminal), separate from component-only fieldset/navigation module to retain Fast Refresh hygiene. Board supplies admitted capabilities/destinations/phase/ownership/pending/connectivity and existing local callbacks; no image-role/order permission inference or new command. Exact original reflection limit/labels, finite optional gifts, legacy-confirmed rewards, selfcare chooser and checkpoint explanation preserved.25new tests cover all17phases across owner/non-owner/offline/pending, original arrows/server destinations, card caps, finite/legacy eligibility and stale-scope callbacks. Full FE451 PASS/lint0errors0warnings/TypeScript/Vite15.96s PASS; BE494 unchanged. Overlay/full phase-view composition, profiler/device/independent gates remain distinct; not done/release.

Implemented additive `phase-view/v1` in recipient RoomView, computed from existing PhaseRegistry/ActionValidator/CardCatalog only. Healer-absent rooms show 15 applicable steps, not a client guess of 16; hidden Guide selfcare capability resolves on the server without revealing another role. Client navigation, progress, own-role action permissions and status registry consume this view. Invalid/missing/unknown projections mount a read-only diagnostic; confirmed offline board stays mounted with mutation controls disabled. No game rule, card asset or command type changed. Full phase component/pending renderer extraction remains under R17/R19/R20.

<!-- Codex updates this after implementation: changed files, invariant preserved, commands and results. -->

## QA report

2026-10-02 local verification: backend 39 files / 477 tests, frontend 11 files / 104 tests pass, zero skipped. New PhaseView has 10 tests including every applicable phase × recipient for 5–10 players, public/disconnected/terminal/unknown actors, hidden Guide and three-card limit; new FE registry/real-board suite has 8 tests, including offline card controls and unknown diagnostic. Actual isolated socket card-catalog suite verifies delivered phaseView. Builds pass; frontend lint/build warnings remain tracked, not waived. No deployment or independent audit claimed.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

Backend-first compatibility boundary: new FE requires `phase-view/v1`; old/missing server metadata deliberately fails closed. This is an additive wire field, not a protocol rollout approval. Roll back with targeted compatible source changes; never restore room data over newer revisions. See `docs/adr/R20-server-phase-view.md`.

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
