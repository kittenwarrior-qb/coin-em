# Chat foundation and remaining runtime gates

2026-10-13. The owner now prioritizes text chat; voice is deferred, not rejected as
technically impossible. No provider, microphone permission or media server has
been enabled. This document does not certify a working end-user chat.

## Implemented domain boundary

`be/src/communication/RoomChat.ts` is an immutable command/projection module, not
registered Socket.IO handlers or frontend UI. It is deliberately not enabled on
production while the safety and runtime pieces below are missing.

- Host-only invitation activation/rotation/disable. Invitation is a cryptographic
  32-byte base64url token supplied by the caller; server persists its SHA256 hash,
  never the raw invitation. Possessing a room ID alone does not admit chat.
- Actor comes from a current real room socket; expiry/ended/disconnected/fake
  seats fail closed. Runtime must also retain existing seat-session generation
  checks, room queue and primary-storage availability guards.
- Strict UUID request and chat revision, fingerprinted receipts, exact retry
  deduplication and stale/conflicting retry rejection. History is limited to 100
  messages, receipts to 200; evicted requests cannot silently duplicate messages
  because their expected revision is stale.
- 500-code-unit plain-text limit and one new message/second. No DM, upload, URL
  preview or executable HTML. Frontend must render escaped text; accepting literal
  markup as plain text is not an HTML sanitizer or a content moderation filter.
- Server-derived sender/name; recipient-specific history blocking; host safety
  mute remains independent of gameplay silence/healing. Changing invitations or
  temporarily disabling chat does not clear safety restrictions.
- No Coin/gameplay mutation. A successful new chat action updates room activity;
  reads/retries do not prolong the room. State belongs to the room snapshot and
  must be deleted with it, without a deleted-room archive. Reports are a separate
  narrowly scoped safety store, not an archive of all room content.

## Required before enabling

1. Register transport behind an explicit off-by-default flag; existing guarded
   socket must authenticate seat/generation, hold the room queue through
   `saveAndWait`, then ACK and emit the recipient projection only after commit.
   Verify primary failure, restart/retry, concurrent commands and deletion.
2. Add independent report storage with owner-approved maximum seven-day TTL and
   admin-only handling. Store only selected reported content and bounded context;
   do not log or expose all stories/chat to admin. Test pruning/auth/access.
3. Build the invitation/chat/mute/block/report UI in both approved themes, with
   pending/stale/timeout states and explicit retry. No auto-replay across a new
   connection/session, no private room content in PWA cache or analytics.
4. Add pre-publication content checks and operator workflow/contact. A blacklist
   alone is not a complete moderation system or store compliance evidence.
5. Run real room and browser/device tests, update disclosures, then enable in
   owned staging before any separately reviewed production rollout.

Native staging work and this domain module do not mean all 41 tasks or app-store
review are complete. Account enrollment, SDK licenses, device evidence,
Mac/Xcode/signing and owner release decisions remain explicit external gates.
