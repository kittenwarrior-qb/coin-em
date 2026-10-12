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
| App diagnostics/analytics | closed event/outcome/version JSON; fixed HTTP outcome/duration buckets | R35 no private objects, IDs, free-form error strings, IP/path or story in app diagnostic records; sampled120attempts/minute/process. No Umami script/new tracking SDK/persistent visitor identifier. Host capture/rotation/retention/alerts remain operator configuration. |
| Network/CDN/support | normal requests to hosting and existing card/image CDN; owner receives voluntarily sent support email | Cloudinary URLs remain original. Providers can receive connection/request metadata; their retention and mail handling are not specified by source. Do not promise that no third party sees any data or add private room/session values to image/mail URLs. |

## Product direction versus release review

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
