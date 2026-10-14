# Chat foundation and remaining runtime gates

Updated 2026-10-14. The owner now prioritizes text chat; voice is deferred, not rejected as
technically impossible. No provider, microphone permission or media server has
been enabled. This document does not certify a working end-user chat.

## Implemented domain boundary

`be/src/communication/RoomChat.ts` is an immutable command/projection module, not
frontend UI. Guarded Socket.IO transport and selected-report SQLite/admin API
now exist as described below. They are deliberately not enabled on production
while the safety/UI/device gates below are missing.

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

1. Real Redis/restart/multi-backend evidence still needs a dedicated fixture.
   Current loopback transport uses real handlers/queues with an isolated mocked
   room primary, not a production durability or capacity certification.
2. Finish the report/operator UI and operating procedure. Selected-report SQLite
   and authenticated admin endpoints are implemented; this does not prove a
   responsible operator is available or certify legal/store compliance.
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

## Runtime contract implemented 2026-10-14

- `EMCOIN_ROOM_CHAT_ENABLED` must equal `true`; all other/unset values stay off.
  Production compose/environment was not changed. Startup creates safety storage
  only with the flag and configured admin credentials/origin. Unavailable/full
  safety storage prevents new enable/join/send operations, while committed retries
  and disable/mute/block controls remain available.
- `get_chat_state`: payload exactly `{ roomId }`, ACK required; returns the
  recipient projection, including `safetyAvailable` and current `canSend`.
- `chat_command`: `{ roomId, ...ChatCommand }` with the strict version1 domain
  fields, UUID and expected chat revision. The existing guarded socket enforces
  membership/session generation and serializes through the primary commit. ACK
  owns success/uncertainty; no fire-and-forget or automatic replay contract.
- `chat_state` carries recipient history after controls; `chat_update` carries
  room ID/revision and at most one visible new message after sends. A blocked or
  uninvited recipient receives no sender/text. Clients must ignore old revisions
  and hydrate gaps rather than invent missing messages. Full history is not
  broadcast on each message. The game `room_state` projection updates room CAS
  revision/expiry without exposing private chat state.
- `report_chat_message`: exactly `{ roomId, messageId, requestId, reason }`, ACK
  required. Reasons: harassment/unsafe/privacy/other. The selected message comes
  from server history, not caller text; active invited membership is required.
  No self/unknown-target report, arbitrary context, private role or session copy.
- Admin `/admin/api/reports?status=open|resolved|dismissed|all` is authenticated,
  origin/header protected and no-store, with at most50records per response.
  `/admin/api/reports/resolve` accepts only `{ id, status, requestId }`, with exact
  idempotent resolution and conflict handling. Existing overview/close permissions
  are unchanged; this is not a browse-all-chat endpoint.

## Selected report storage

`chat-reports.sqlite` is a dedicated version1 single-host SQLite store, chmod600
on platforms supporting these permissions. Unknown schemas fail closed rather
than altering unrelated databases. A report contains one selected server-authored
message plus bounded reporter/room/reason/time/status metadata, not the full room.
Identical incidents are deduplicated across new request IDs; five new incidents
per reporter/minute and2000retained records bound writes/storage. This limit can
make chat unavailable until evidence expires; it is not infinite capacity.

Expiry is anchored to the selected message's server timestamp plus seven days,
so late submissions/retries/resolution cannot prolong retention or resurrect
expired evidence. Expired rows are logically deleted on access and once/minute
in the enabled server; SQLite WAL/media/provider physical erasure is not certified.
Room deletion retains only these explicitly selected safety reports until expiry,
not an archive of the room. Persistent SQLite close/reopen tests are separate
from mocked room persistence. Multi-host report consistency is not proven.

Before activation, update end-user/admin data copy to distinguish the selected
report exception from deleted-room content, add moderation/content checks and
run both-theme browser/device/load tests. No chat UI, Android APK/IPA or voice
provider was shipped by this backend slice.
