# R18 — projection-derived GameBoard reads

The existing R17 transport remains the owner of revision/room/terminal admission. GameBoard receives that accepted snapshot; a pure projection and memoized hook derive players, stable user-ID lookup, current-round cards and displayed coins. No additional mutable confirmed-state store or second revision gate is introduced.

The board no longer copies player/card snapshots into legacy gameStore effects or writes confirmed selections optimistically. Card controls send their existing command and wait for an accepted server projection. This slice does not yet provide generic pending command UI or receipts.

Player action/DOM IDs remain socket IDs for compatibility, while focus and own-seat selection prefer stable user IDs. Inventory/modal/focus state is component-local; focus stores identity rather than a player snapshot. GameContainer keys the board by room ID, so another room resets drafts while offline/error/revision updates in the same room keep it mounted.

Current-round logs restore multiple card categories on cold resume; active selectedCard overlays the log-derived result. Cleared active-card rollback snapshots clear the corresponding selection, and waiting rooms start empty. Unknown legacy selections follow R15's projection behavior, not a guessed catalog migration.

Existing PHASE_CHANGED/previous markers invalidate target/downstream card selections in the log reducer. Forward navigation cannot resurrect old reflections/emotions from preserved audit history. Server validation uses those same existing markers; no log erasure, additional event or ledger mutation is introduced.

Legacy gameStore/socketStore and legacy type definitions are retained until remaining usage and transport consolidation are independently verified. Full normalized store migration, action-consumer migration, profiling and real browser/device QA remain open. Hook memo identity is not a profiler result.

Evidence: 15 new pure/jsdom regressions; full frontend after this slice 8 files / 85 tests (latest combined R19 suite: 10 files / 96 tests). The frontend-design skill was used to preserve readable current UI/content, not to redesign or reskin. All images and card source/pairing remain unchanged. Rollback: targeted code revert or compatible forward fix without resetting user data.
