# Owner decisions — admin, operations and final art

Source: owner answers numbered1–22 in the project chat,2026-10-03. This record intentionally excludes all server credentials and does not grant production mutation authority.

## Approved implementation direction

- Codex performs self-review; label it self-review, not independent/Claude approval. No delegated reviewer authorized by this answer.
- Admin login confirmed: emcoincloud@gmail.com plus a separate EmCoin password, not Google OAuth/OTP or the Gmail account password. Configure only a password hash through owner-controlled secrets; no default password or public signup.
- Admin may inspect room status/seat counts and explicitly close a room with an audited reason. No private story/reflection reading or direct Coin/role mutation.
- Remove Umami tracking from the web application. Build lightweight first-party aggregate operational analytics for the admin instead; do not infer permission for visitor profiling, persistent identifiers or third-party crash trackers.
- A VPS is available but EmCoin is not deployed there. Other hosted services/ownership are not established. No SSH/deploy/tag/store action performed or authorized by possession of a credential.
- Capacity starts small; measure and propose performance targets. No unbounded capacity, zero-loss or recovery-time guarantee approved.
- Deployment downtime is acceptable; no maximum duration or actual release approval established. Production/tag/store actions require separate confirmation.
- Android/Google Play first; iOS later if feasible. Signing/store-account/device models remain unconfirmed.
- No microphone/camera/location/contacts permissions for this version.
- Vietnam release, ages6–18 and support email from prior approval unchanged. Owner reports UNICEF funding; this is not verified branding/endorsement permission or proof of legal compliance. Do not add sponsor logos/public claims on this evidence alone.
- Owner does not want consent prompts or an individual-data deletion feature. Record requested product direction without treating it as legal clearance; a lawful minimized-data release and responsible operator remain review gates.
- Owner explicitly disables both new deleted-room content archives and external VPS backups. One-hour inactive-room expiry remains. Preserve existing archives rather than deleting them during implementation; existing expiry enforcement is separate. Keep minimal content-free deletion markers to prevent stale room resurrection; a marker is not a recoverable room backup. Active-storage/legacy JSON authority and Redis persistence are not disabled by this decision.
- Current100-card web catalog is the version's reference; no physical-deck synchronization. All existing card-related images/content/IDs/front-back pairs remain protected.
- Owner confirms rights to existing Rive assets; that does not establish rights to every font/logo/model/other image. Inventory non-card button/icon/UI images before proposed replacements.
- Defer new character/7-character animation production. Retain safe existing lifecycle work; no new mascot assets now.
- Final reskin direction remains warm2Dcartoon/mobile-first. Notify owner before starting and submit one representative sample for approval before scaling up. No reskin in this decision-record step.

## Outstanding configuration versus release gates

### Owner revision 2026-10-12 — voice and native planning

Follow-up “ok hãy làm” accepts the proposed communication constraints: gameplay silence blocks text/voice publishing, healing restores gameplay permission but not safety moderation; reported content may be retained at most7days for admin-only handling while ordinary chat follows room lifetime. Owner allows considering external hosting for heavy public images/media to support scale and store readiness; this does not approve a paid plan, upload of player data, particular processor/region, deployment or guarantee store acceptance. Pure communication policy foundation and public UI image optimization are local implementation; actual transport/report storage/media/native acceptance remains separate.

Owner explicitly approved voice scope in invitation-only rooms with a facilitator: player-triggered microphone, mute/block/report, no recording and no stranger matching. This supersedes the earlier no-microphone decision for that scope only; camera/location/contacts remain excluded. No provider selection, audio retention, room-admission protocol or change to gameplay silence/heal rules is implied. Owner reports no Play Console, Apple Developer or Mac/iOS build service yet and requests setup guidance. See `../ops/mobile-release-roadmap.md`; no signing/payment/store submission/deployment performed. Communication gameplay policy and abuse-report retention/operator remain decisions before implementation.

2026-10-04 follow-up: owner accepted proceeding with the web-first path proposed in chat: complete local web implementation/QA, notify before the representative non-card reskin sample, and defer native/store/deploy. These deferred tasks remain in the41-task backlog and are not marked complete or removed. No art generated by this ordering decision; sample approval and all protected-card exclusions remain.

Admin address/login mechanism and archive policy confirmed in the owner's follow-up. Store/signing owners, actual device versions, operational access/alerts/log retention, capacity/SLO and recovery objectives need configuration or measured proposals; code implementation does not certify these. Consent/deletion preferences do not substitute for privacy review for minors. Do not place secrets in source, reports or this ADR.
