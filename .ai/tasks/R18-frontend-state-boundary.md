# R18 Frontend state boundary

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R15, R17

## Goal

Server-view store, session store và local UI/draft boundary với stable selectors.

## Current evidence

Room/player/phase/card đang bị copy ở nhiều hook/store/type.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R18)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R15, R17.
- fe/src/stores/gameStore.ts; fe/src/stores/socketStore.ts; fe/src/stores/uiStore.ts; fe/src/stores/types.ts; fe/src/hooks/useGameState.ts; fe/src/hooks/useGameFlow.ts; fe/src/types/game.ts

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`projected server view → normalized selectors → local draft/UI only → render`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R18.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

Không; owner state phải theo projection R17, không tái tạo luật FE.

## Implementation plan

### Plan revision 2026-10-03 — single transport admission path

Scope adds `fe/src/hooks/useSocket.ts` and its existing `seatSession.test.tsx`. Keep the temporary legacy phase mirror for compatibility, but write it only inside the accepted-snapshot gate, not again in four event listeners. Legacy unversioned player-list events must update both the accepted render snapshot and transport ref via that same gate; versioned snapshots still reject partial legacy events. Cover exact once-only writes, stale/terminal rejection and successive legacy deltas. No new store, protocol, rule, UI/art or removal of legacy public exports; broader consolidation/profiling remains open.

### Plan revision 2026-10-02 — projection-derived GameBoard slice

Scope includes `fe/src/pages/GameBoard.tsx`, `GameContainer.tsx` (room-keyed board lifecycle), a pure `fe/src/utils/gameProjection.ts` and adjacent hook/selector tests, using the existing accepted RoomState prop from R17 and log reducer. Remove only GameBoard's duplicated player/card store synchronization and optimistic confirmed-card writes; transport remains the sole revision gate. Keep socket IDs as existing action/DOM compatibility IDs, expose stable user-ID lookup separately. Modal/focus/inventory state becomes component-local and stores focus identity, never a confirmed player snapshot. No new gameplay rule, card content, art, layout or physical catalog mapping. Legacy stores/hooks remain temporarily for unmigrated callers; full store/session consolidation and render profiling are not claimed complete.

Rollback regression scope extension: include `components/game/selectedCardsFromLogs.ts` and its existing `types.ts` to consume the already-emitted PHASE_CHANGED direction/phase. A finite-cycle rollback preserves audit logs, so selection projection must invalidate target/downstream selections at the rollback marker rather than replay old cards. Matching R15 validation consumes the same existing marker without altering logs or coin ledger.

1. Map every room/player/phase/card owner and duplication across hook, stores, components and legacy types.
2. Define canonical projected server view, session state and local UI/draft ownership; forbid gameplay authority in draft/UI state.
3. Introduce normalized selectors keyed by stable player ID and revision; migrate one read-only consumer before changing action consumers.
4. Move card/phase/coin rendering to projection-derived selectors and keep modal/focus/animation progress local only.
5. Remove a duplicated state copy only after hydration, rollback and new-room regression fixtures prove equivalence.
6. Test new room reset, stale snapshot gate, resume/rollback card consistency and render profiling; do not redesign layout in this task.

## Implementation report

2026-10-03 single admission-path continuation: removed four redundant phase-mirror writes after `applyRoomState`; the temporary compatibility mirror remains solely inside the successful revision/room/terminal gate. Unversioned `player_joined`/`player_left` compatibility deltas now pass the composed snapshot through that same gate instead of setting render state alone and leaving command reads stale. Versioned snapshots still ignore legacy partial deltas. Seven new transport regressions verify each listener writes once, rejected old/terminal snapshots never mirror, successive legacy host/player updates and Coin journaling resolve the newly joined stable recipient, and versioned partial deltas are ignored. Initial four test failures were an unsupported Vitest2 matcher, corrected to separate count/argument assertions without weakening coverage. Full FE39files407 PASS; BE494 unchanged, combined901. Full FE lint0errors/0warnings/TypeScript/actual Vite build23.66s PASS. No protocol/rule/art/store-export removal or full consolidation/profiler acceptance.

2026-10-03 — Profile display boundary: WaitingRoom and MiniPlayerToken no longer own optimistic name/avatar/background copies that can shadow later recipient snapshots. Existing display reads server player props; ProfileModal retains a separate editable draft while open, seeds confirmed values only on a new opening and does not discard them before true async confirmation. These changes are scoped through R17's profile plan revision, with no catalog/card or profile palette changes. Full FE 280 tests/build pass; profile transport exact-ACK/newer-broadcast regressions and editor draft/reopen cases pass. Broader store/session/controller consolidation remains, not acceptance.

2026-10-02: GameBoard now derives player/card/coin rendering synchronously from its one R17-admitted room snapshot via memoized `useProjectedGameState`/pure `projectGame`. Deleted GameBoard's player/card synchronization effects and optimistic card writes. Resume uses all current-round selection logs plus the active selectedCard; cleared rollback selections and waiting/new-room boundaries do not inherit confirmed cards. Stable user-ID lookup follows replaced sockets while existing socket-based commands/DOM IDs remain compatible. Local modal/inventory focus stores identity only and resolves current projected player data, so it cannot retain stale roles/coins. Room-keyed GameBoard resets component-local drafts on room switch, not on disconnect/revision updates. The frontend-design skill guided preservation of current readable UI/content; no layout, palette, card content/art or reskin change.

15 new pure/jsdom hook regressions cover resume, rollback/forward navigation, round boundaries, stable identity, coins, memo identity, local legacy-store isolation and modal scope. Full FE suite after this slice: 8 files / 85 tests pass; latest combined R19 continuation has 10 files / 96 tests pass. Build/lint pass with existing warnings. Legacy game/socket stores and generic command/session consolidation remain for later incremental removal, along with real browser profiling/interaction evidence; not acceptance/done. ADR: `docs/adr/R18-projection-read-boundary.md`.

## QA report

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
