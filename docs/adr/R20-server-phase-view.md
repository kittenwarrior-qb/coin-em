# R20 — server-derived recipient phase view

Engineering slice, 2026-10-02; no new product rules or deployment approval.

RoomView carries additive `phase-view/v1`: current phase, applicable position/total, next/previous and recipient booleans. PhaseRegistry is the order/applicability authority; ActionValidator and canonical CardCatalog supply existing action eligibility. Coin-cycle gifts/collection lock previous navigation. A disconnected/public/missing actor receives no action permission. Role flags describe only the recipient's already-visible original role; another actor identity or private role is never returned.

Frontend PHASE_UI is exhaustive presentation only. Phase ordering, healer presence and hidden Guide selection are not reconstructed from public player roles or artwork. Known phase plus well-formed matching version is required before rendering controls. Missing/unknown metadata renders a leave-only diagnostic. Offline retains the confirmed board but masks action permission; useSocket is still the final transport guard. Fresh server authorization is required for every command: capabilities are hints, not security credentials.

Compatibility: deploy-compatible backend metadata must precede the new frontend. No live rollout performed. Full pending-command renderer migration and independent audit remain. Card content, imagery, catalog pairing and game outcomes are unchanged. Targeted compatible revert/forward fix is the rollback; never roll persisted rooms backward.
