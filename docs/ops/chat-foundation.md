# Chat foundation and remaining runtime gates

Updated 2026-10-14. The owner now prioritizes text chat; voice is deferred, not rejected as
technically impossible. No provider, microphone permission or media server has
been enabled. Chat UI is implemented and exercised locally; production chat remains disabled.

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

1. Dedicated real Redis/restart/two-process and short100-seat chat evidence now
   exists as described below. Sustained soak, WAN/device, production RPO/capacity
   and separate-host safety storage are not certified by it.
2. Report UI and a draft operating checklist exist. Owner must still designate
   a responsible available operator and approve the pilot; this is not legal or
   store compliance evidence. See `chat-safety-operations.md`.
3. Invitation/chat/mute/block/report UI exists in both approved themes. Device
   validation and staging review remain; no auto mutation replay or chat cache.
4. A local pre-publication contact/link layer exists; finish semantic harm/abuse
   handling and operator review/contact. Pattern checks alone are not a complete
   moderation system or store compliance evidence.
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

Before activation, finish public privacy/consent wording, pre-publication content
checks/operator moderation, sustained-load and physical-device tests.
No Android APK/IPA, store approval or voice provider has been delivered.

## Frontend and operator workflow — 2026-10-14

`RoomChatPanel` reuses the existing room socket and the approved two-theme modal.
It is available in waiting/playing rooms only after an authenticated chat read;
feature-off remains hidden. No additional socket, localStorage chat history,
analytics message payload, link preview, upload, camera or microphone is added.
Invitation tokens are generated with WebCrypto and retained only in component
memory. The host can activate/rotate/disable, guests enter the invitation, and
invited users can send, block locally, or select a message for a safety report.
Host safety mutes do not alter gameplay silence/healing rules.

Incoming messages are escaped JSX text, bounded to 100 recent records. Incremental
updates preserve current projections; old revisions are ignored and missing
revisions trigger a bounded hydration read. Mount/foreground/reconnect reads are
coalesced, including React StrictMode; no mutation is automatically retried.
Disconnect clears visible evidence and invalidates in-flight ACK authority.
An uncertain send/control/report keeps its exact UUID/payload for explicit retry,
blocking further chat writes and voluntary leave until confirmed. Lost browser
memory after a full reload does not restore private chat drafts or pending commands;
old committed messages may reappear from the authorized server projection.
Replaced/expired/deleted seats clear chat data and controls.

Admin has an authenticated “Báo cáo an toàn” section: status filters, search over
the loaded records, accurate loaded/total counts (server returns at most 50), and
a selected-message detail dialog. Resolution/dismissal has a stable request UUID,
explicit same-ID retry for uncertain responses and no auto room-close/block.
Pending/uncertain resolutions block navigation/theme/logout; auth expiry clears
privileged evidence. DataPanel describes selected-report retention as an explicit
exception, not a whole-room archive. No export of chat evidence was added.

Local browser QA uses actual production guarded Socket.IO handlers, synthetic
real browser guests and an actual in-memory SQLite report store. Room storage is
the isolated test fixture, not real Redis proof. Admin HTTP is intercepted and
does not certify authentication/cookies (separate backend HTTP tests cover those).
Both themes are tested at 320/390px; report details at 1366×768. Production rate
limits are enabled in this browser case. No production environment/data changed.

## Owned real Redis and short chat load fixture — 2026-10-14

Run `node be/scripts/test-real-chat.mjs` with the pinned `.nvmrc` Node and a working
Linux Docker engine with cached `redis:7-alpine`. It accepts no target arguments,
does not import dotenv, compiles current source, fingerprints source/dist/protocol,
allocates labelled loopback-only Redis and two backend processes, and verifies
ownership before removing those resources. It never uses the production VPS.

The fixture covers 10 rooms/100 genuine sockets, 100 accepted chat load messages,
unchanged Coin state, a cross-backend authenticated committed-message retry after
backend SIGKILL, receipt/block/mute/report recovery, a two-writer revision race,
primary outage read/write rejection, actual Redis AOF kill/restart, and room
deletion without a chat archive. Selected evidence persists independently and
logical seven-day pruning is checked. Same-ID retry does not refresh room activity.
Report SQLite uses an actual file shared only on this host, not in-memory mocks.

Retained failure: simultaneous initialization of an empty SQLite store encountered
`database is locked`; moving busy_timeout earlier did not resolve it and was not
retained as a purported fix. Final topology has a single schema initializer before
parallel backend startup. Production remains single-backend; separate-host report
storage and automatic scale/startup require an explicit architecture decision.

The report contains mixed admission/read/mutation ACK quantiles for one short
local run, not a production SLO or pooled workload certification. AOF uses
appendfsync=always in the fixture, not a claim about VPS power/host loss. Synthetic
evidence files stay only in the allocated test root; owned processes/container
are removed. No production flag, catalog, user data or backup policy changed.

## Local pre-publication contact checks — 2026-10-14

`publicationChecks.ts` implements `chat-contact-check/v1` for new `send` actions
only. Common schemes/domain-shaped links, email, Vietnam mobile/international-plus
phone formats and bidi overrides produce closed rejection codes. Inspection uses
NFKC, removes common zero-width separators and recognizes bracketed-at/dot forms.
Accepted original text stays unchanged, including ordinary Unicode/emoji.
Rejected text is not copied to logs, messages, receipts or the report store and
does not change room activity or chat/game revisions. Receipt lookup precedes
new checks so previously committed retries do not become new publications.

Frontend maps rejection to “Tin chưa được gửi”, keeping the draft editable without
an uncertain-retry UI. Textarea uses a stable explicit label whose accessible name
does not include draft contents after revalidation. Both-theme browser tests cover
rejection followed by valid sending. BE827 and FE793 regular tests, builds and
frontend lint PASS at this source slice.

Limits: these patterns do not identify every number/address, nickname, image,
masked addresses, obfuscation or contextual abuse. No keyword ban is applied to
emotional disclosures or requests for help. This does not provide semantic
moderation, counselling, staffed escalation or a claim that unsafe content cannot
appear. No external content service is used. Public notices, moderation/operator
decisions and device/staging remain open; production chat stays off.

Owner follow-up: contextual moderation is deferred for now. Generic domain-shaped
text (including punycode), bare valid IPv4/bracketed IPv6 and bracketed-dot forms
are denied as well; the application does not fetch URLs, resolve them, show previews
or auto-link chat text. This is not URL reputation analysis or a malware scanner.

## Open-source candidates reviewed, not installed — 2026-10-14

- [DwcksDinh/bad-word-filter](https://github.com/DwcksDinh/bad-word-filter): MIT,
  TypeScript, README describes Vietnamese/English and configurable word lists.
  Candidate only, not audited production moderation: source needs review/testing
  for regex statefulness, missing-list behavior, word boundaries and false positives.
- [Wart050/Profanity-Filtering-All-languages](https://github.com/Wart050/Profanity-Filtering-All-languages):
  README lists English/Vietnamese and zero runtime dependencies; repository shows
  GPL-3.0, so licensing/data provenance need review before integrating or distributing.

These are profanity/dictionary filters, not contextual harm classifiers or link
security systems. A curated Vietnamese/English vocabulary with boundary/exception
tests fits this Node backend without an extra service. The owner subsequently
requested implementation; the original seed below was chosen instead of either
dependency. No user chat was submitted to any repository/provider in this research.

## Original bilingual seed — verification continuation 2026-10-15

Source commit `9c4a382` adds `profanityChecks.ts` (`chat-profanity-seed/v1`),
called by `chat-publication-check/v2` before any new send commit. It uses a small
original Vietnamese/English vocabulary, not copied third-party code or word lists.
No package, external service, network call or additional content store is added.
The closed `CHAT_PROFANITY_NOT_ALLOWED` error retains the editable draft without
uncertain-retry controls. Existing receipt replay, room retention and game rules
are unchanged; rejected text is neither persisted nor sent to other players.

Normalization checks common full-width, zero-width, punctuation/spacing and
English leet forms. Vietnamese accents are preserved to avoid treating `đu`,
`du`, `đủ` or `đụng` as profanity. Neutral identity terms, emotional disclosures
and help-seeking statements are in the benign regression corpus. There is no
client-controlled exception list or dynamic user regex.

Retained failure: initial Unicode-property classes repeated inside each compiled
pattern stalled V8 on accented text, causing real Socket.IO ACK deadlines to fail.
The source fix canonicalizes separators once and uses small classes per pattern;
a cold accented/max-500-character regression and transport rejection cases guard
against recurrence. ACK timeouts were not increased to conceal the failure.

Limits: this is a seed vocabulary, not comprehensive Vietnamese/English moderation.
Quoted listed words also reject; unknown insults, inserted-letter evasions,
contextual abuse and all private-information obfuscations are not detected.
No distress/identity blacklist, semantic classifier, malware scanner, URL reputation
service, automatic counselling or guaranteed human response is claimed. Production
chat remains off; notices, operator coverage, invited staging and device gates remain.
