# Configurable round count — local QA

Owner request: waiting-room host chooses1–Nrounds, max10, instead of always one round per seat.2026-10-12. Self-review; no deploy/store action.

## Implemented

- New authenticated `set_round_limit` contract, host-only/waiting-only, integer/null validation, expectedRevision, UUID4 receipt. Existing room queue, seat generation and primary-Redis availability guards reused.500msaction rate limit,20bounded durable receipts; receipts omitted from RoomView.
- `null`/missing=auto roster size. Custom count stays fixed on join, becomes invalid on leave if above roster; no silent clamp. Engine rejects invalid configured count even if client sends start manually. Existing min5/max10player requirements preserved.
- Engine freezes totalRounds at start. Subsequent role rotation, phase progression and60Coin allocate/collect unchanged; shortened ván ends at selected count. Old playing rooms keep existing totalRounds, no migration/recalculation.
- New frontend starts include expectedRevision; backend rejects a stale configured snapshot before starting. Legacy clients without field still validate server roundLimit/domain gates. Backend-first/matched deployment required for new `set_round_limit`, not executed here.
- WaitingRoom host selector auto/1–N, explicit save, all clients show confirmed config; warning that not everyone becomes sender in a short game. Dirty/invalid/pending locks start, pending locks leave/Back/Esc. On ACK loss client retries same request ID/revision/limit; malformed-success snapshots are not accepted. Roster area reduced to fit new controls and keep footer usable, short screens still scroll safely.
- No modifications to frozen deck/new-catalog activation or PDF exceptions. Store publication remains deferred.

## Evidence

- Backend full647tests/59files passed.16new domain cases cover5seats×1/3/5rounds and10seats×1/5/10rounds,20coins of each color including unused remainder, collection history/terminal hydration, defaults/roster changes, host/status/revision/idempotence and malformed counts. One new actual Socket.IO integration exercises5real clients (Redis mocked), host/guest authorization, commit replay, hidden receipts, JSON persistence, stale-start reject and frozen1roundstart.
- Frontend full722tests/74files passed. New control tests cover bounds, pending/dirty start lock, short-game note, roster invalidity/non-host; transport regression verifies timeout retry keeps same request ID and consumes confirmed snapshot. TS/build/lint passed.
- Actual browser room suite2/2passed199.19s:5real browser guests choose1round (Orbit),10guests choose3rounds (Workshop), then existing profile/phase/navigation/coin-preview/replacement/resume flows. Isolated loopback backend with mocked Redis and intentionally blocked CDN; not physical-device or complete short-game terminal browser proof.
- Browser visual matrix90/90passed on two themes/three viewports. Final density refinement adjusts roster height to leave room for selector/save/warning/footer; rechecked after patch. Screenshot inspection found new selector pushing footer below tall viewport in first density pass; refined height rather than removing warning/controls.
- Actual isolated Redis7AOF appendfsync=always fixture kill/restart passed: configured roundLimit1 and frozen totalRounds1 recovered in new process. Existing two-process revision race/coin receipt/index corruption/expiry/tombstone/admin-close replay tests passed. Owned fixture container/temp files cleaned, no shared Redis touched. Fixture durability settings are not a production RPO guarantee.
- Vite production build, FE/BE TypeScript and FE lint passed; shared dirty source, no commit/tag.

## Limits/failure history

First domain rollover test skipped the give-coins collection step by jumping straight to reward;4history assertions failed. Corrected test to call the real collectCoinRound before rollover, preserving gameplay engine unchanged; all16cases passed. Tests cover ledger/terminal boundaries, not every phase of all six chosen-count combinations in real browsers.

No native handset/install QA, production load/SLO, deployment or store acceptance inferred. Catalog SQLite remains an unactivated draft and is a separate unfinished workflow. Full gameplay with the replacement catalog still needs content review/pinning/activation tests.
