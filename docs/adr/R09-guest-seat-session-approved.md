# R09 — Guest seat session policy

Owner approved the proposal with “ok làm đi” in this chat, 2026-10-02.

Guest play needs no account. The server issues an opaque secret for a room/seat. Public userId, deviceId and socketId are not credentials. A new authenticated tab replaces the previous active socket/generation. Keep the existing two-hour reconnect grace for disconnected gameplay seats. This approval does not change privacy, retention, store signing or production release policy.

## Wire contract: guest-seat/v1

Existing `join_room` and `reconnect_room` accept `sessionToken` when reclaiming an existing seat. Successful admission privately ACKs `{ success, session: { roomId, userId, token, generation } }`; errors ACK `{ success: false, error, code, message }`. The bearer token must never be included in shared events, snapshots or logs. Persist only its SHA-256 hash and active generation. Admission commits before ACK, room membership and snapshot delivery.

`session_replaced` is the new targeted lifecycle notification required by the approved replacement policy. The old socket is disconnected; the old client stops automatic reconnect and shows a replacement message. Commands require current socket membership and generation, checked against a fresh persisted snapshot.

The token remains stable across reconnects to make an ACK-loss retry safe; generation changes instead. Possession of a token permits explicit seat replacement, not simultaneous active generations. Revocation/deletion still requires the R11/R33 lifecycle work. Local storage holds guest bearer credentials: protect them against XSS; never send them to analytics or capture them in evidence.

## Compatibility boundary and remaining work

Never manufacture a secret for an old seat based on public IDs. Existing snapshots without a token hash retain their data and active socket behavior but cannot securely cold-resume by userId/deviceId alone. Coordinated client/server rollout is required; no release has been performed.

Waiting-room behavior remains unchanged (ten-second accidental-disconnect cleanup and manual selection); this approval does not silently enable waiting-room auto-resume. Playing/ended cold reconnect uses the saved secret and preserves the current projection. Two-hour expiry uses a persisted disconnection time when available; crash-only recovery checks the adapter for an active generation and otherwise uses the persisted last-seen lease. Only locally connected current generations renew every 60 seconds; crash-time precision is bounded by that interval, not claimed exact. Adapter-backed multi-process takeover, full browser refresh per phase and deletion/tombstone/restore behavior still need verification before R09 is complete. A cold repository reload or domain-only Redis worker is not a full server restart test.
