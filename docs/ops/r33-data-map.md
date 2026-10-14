# R33 current technical data map

Source review2026-10-04, implementation-owned. Not a published legal policy,
consent/legal assessment, anonymity guarantee or production approval.
Owner decisions: ages6–18, Vietnam, support emcoincloud@gmail.com; no new deleted-
room content archives or external VPS backups; one-hour inactive-room expiry.
Do not infer rights to publish participant photos or UNICEF branding from these.

| Boundary | Actual data/purpose | Access and lifetime evidence |
| --- | --- | --- |
| Guest browser | userId/deviceId, admitted room/seat session token and resume candidates; seat recovery | localStorage in userId.ts/useSocket.ts; not a Gmail account. Browser storage can outlive a room; token is not proof that an expired/deleted room remains usable. No blanket local-storage expiry or individual erase claim. |
| Active room | chosen nickname/avatar, seats/roles, phase/card selections, submitted response/reflection text, votes, Coin receipt/history, activity | Room type/repository and recipient-specific RoomView; members receive permitted views, narrator/own-role permissions differ. Do not describe these as anonymous or publicly accessible. |
| Active Redis | current room snapshot/index, hashed seat secret/generation/grace/presence and commit revision | required-primary fresh authorization/CAS; playing guests cannot claim identity through a payload. Room cleanup rechecks fresh activity/revision. Redis adapter carries transient recipient messages between backend processes. |
| Active/legacy JSON | existing active room snapshot authority/fallback paths and recovery compatibility | persistence.ts; no automatic old-JSON restore into required primary. Logical deletion prevents ordinary recovery; failed secondary physical cleanup is retried, not reported as successfully erased everywhere. |
| Expiry | all waiting/playing/ended rooms become eligible after one hour without committed room/game activity | retention.ts/RoomService; heartbeats/presence/transient previews do not prolong activity. One-minute poll and primary failures can delay actual deletion. Two-hour guest grace cannot override expiry. |
| Deletion markers | room code/revision/delete-expiry metadata; explicit admin close additionally has fixed actor/reason/command receipt | Redis seven-day TTL and local tombstone policy prevent resurrection/replay errors. No names/stories/roles/player list/session secret/Coin ledger archived in new marker. It is not a recoverable room backup. |
| Historical archives/storage media | any existing managed deleted-room archives and Redis AOF/volume history | no new content archives/VPS backups; no manual deletion/migration of existing archives here. Managed historical expiry checks remain bounded. AOF rewrite/volume/media/provider retention is not established by app-level key deletion. |
| Admin authentication | fixed approved admin email, owner-configured separate EmCoin password hash, temporary session/token digest and failed-login limits | AdminAuth/HTTP API, disabled without correct configuration; Secure/HttpOnly/SameSite cookie and Origin/header checks. No public signup, Google OAuth or Gmail password. Session/analytics are process-local, not visitor profiles. |
| Admin overview/close | room metadata/status/seat counts and fixed aggregate HTTP outcomes/timing; explicit close audited reason/receipt | allowlisted API; no private response/reflection/nickname/role/session access or direct Coin edits. Exact close receipt stored with primary marker, not merely console output. |
| Operational diagnostics/metrics | closed event/outcome/version JSON; fixed HTTP outcome/duration buckets | R35 no private objects, IDs, free-form error strings, IP/path or story in app diagnostic records; sampled120attempts/minute/process. Process-local HTTP metrics reset on restart. No Umami script or external tracking SDK. Host capture/rotation/retention/alerts remain operator configuration. |
| Daily traffic analytics (owner-edited release2026-10-13) | allowlisted public page, referrer hostname/category, device category, daily view/visitor/room/game totals | TrafficStore SQLite; admin-authenticated reports. Daily aggregates retained400days, as currently implemented, not a legal retention approval. Public tracking endpoint processes request IP/UA in memory to compute a daily salted hash; hash retained2days for approximate deduplication. No raw IP/UA, room ID, private text or cookie is stored in this database. Salt persists in SQLite. The hash is pseudonymous, not proof of anonymity or immunity to guessing with access to the salt. No historical traffic imported on rollout. |
| Room chat (local opt-in backend, not deployed/enabled) | bounded100-message active-room history, invitation hash/admitted seats, recipient blocks, independent safety mute and bounded receipts | Existing seat/generation/queue/primary checks; recipient-only ACK/hydration/delta, no public roomView copy. Committed new chat action updates inactivity; reads/retries do not. Existing awaited room deletion removes the chat snapshot without a deleted-room content archive; Redis/legacy active JSON physical-media limits remain as above. |
| Selected chat safety reports (local opt-in backend, not deployed/enabled) | one chosen server-authored message, pseudonymous reporter/room ID, reason/status/time and idempotency digest | Dedicated single-host SQLite; member reports and fixed-admin authenticated list/resolve only. Expiry anchored to message timestamp+7days, no extension/revival through retries/resolution. Access/startup/minute cleanup logically prunes evidence; physical WAL/media erase not certified. Five new incidents/reporter/minute and2000records cap; no whole-room archive or general admin reading permission. UI/disclosures/operator/content moderation remain before activation. |
| Network/CDN/support | normal requests to hosting and existing card/image CDN; owner receives voluntarily sent support email | Cloudinary URLs remain original. Providers can receive connection/request metadata; their retention and mail handling are not specified by source. Do not promise that no third party sees any data or add private room/session values to image/mail URLs. |

## Product direction versus release review

2026-10-13 source follow-up: the traffic store above is already deployed with the
owner-edited admin release; it is distinct from process-local operational
analytics. As of that date the new immutable chat domain was not registered.
The2026-10-14 rows above describe its now-registered local opt-in backend, still
not deployed/enabled: no production chat/report store has been created by this
work. Session authorization, expiry/deletion and selected-report seven-day bounds
are tested; UI/operator/real-storage/device/privacy gates remain before activation.

Owner currently requests no consent prompt and no individual-data deletion
feature. That does not resolve the lawful basis, responsible controller,
guardian/child-facing notices, handling of submitted text/participant photos,
rights or legally required requests. Do not fabricate an approved privacy
policy, erase unrelated player data or add unrequested profiling to fill gaps.
Minimize collection and describe actual behavior; appropriate owner/legal
review remains a release gate. Support availability/response times are not
verified merely because an address is configured.

R33 technical evidence links to retention tests, required-primary/delete-marker
Redis fixtures, recipient secrecy/session boundary tests, R35 closed-log guards
and R36 audited close/API projection tests. Mocked tests and short local load
are not real-device, provider-retention or legal-compliance evidence. No user
data, credentials or child records appear in this document.
