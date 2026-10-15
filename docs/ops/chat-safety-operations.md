# Chat operating checklist (not yet enabled on production)

This document records the implemented controls and the remaining owner decisions.
It does not certify legal compliance, store approval, staffing or response times.

## Current supported topology

- One production backend and its local SQLite safety store are the intended first
  rollout. Room state uses required Redis; an unavailable primary rejects actions.
- The two-process local fixture shares one same-host SQLite file with a single
  schema initializer. Simultaneous empty-file bootstrap encountered a SQLite
  lock, so initialize/validate schema before starting additional workers. That
  test is not a supported separate-host SQLite architecture or auto-scaling proof.
- Report storage holds selected messages only, at most 2000 rows, with expiry
  anchored to message send time plus seven days. An unavailable/full store blocks
  new chat activation/admission/publication; controls and committed retries remain.
- No voice, microphone recording, attachments, direct messages or stranger matching.

## Before a staging pilot

1. Owner names the person responsible for reviewing reports and when they are
   available. Do not publish a promised response time until it is actually covered.
2. Finish child/guardian-facing public notices and review the selected-message
   reporting exception, contact details and consent/rights process with the owner.
3. Local contact/link and original bilingual profanity-seed checks exist. Finish semantic harm/abuse handling or reviewed
   pre-publication human moderation. Reporting and contact patterns alone are not
   a complete content-safety system; do not claim all private/unsafe text is found
   or censor emotional disclosures using a distress-word blacklist.
4. Run the current browser workflow, owned Redis/restart fixture and device checks.
   Confirm the report store is initialized, writable, limited and pruned, without
   printing passwords, tokens or message bodies in diagnostic logs.
5. Use a separately approved, invited staging pilot before enabling production.
   Do not change production flags or seed/replace the owner's card catalog as part
   of a load test. No operator-enabling switch exists in the admin UI.

## Handling a report with current controls

1. Open Admin → Báo cáo an toàn → Chờ xử lý. At most 50 records are loaded; search
   covers those records, not all report history. Process open reports and refresh
   to see the next batch. Verify room, sender, reason and expiry before deciding.
2. Open the selected evidence. Only that reported message is available, not the
   private room conversation. Do not reconstruct or export a full room history.
3. If the room needs to stop, use the separate confirmed close-room control in
   Tổng quan & phòng. Resolution itself never closes rooms or bans players.
   The in-room host can independently mute chat senders or disable room chat.
4. After any appropriate action, mark Đã xử lý; otherwise choose Không cần xử lý.
   On uncertain network results use Kiểm tra lại for the same request, not a new
   resolution UUID. Reauthenticate if the session expires.
5. Evidence expires automatically; resolving does not extend it. Do not add manual
   copies, deleted-room archives or new backups to prolong that retention.

## Incident containment

If reporting cannot be reviewed or safety storage is unavailable, do not open a
new pilot. An operator may disable the backend chat flag through the reviewed
manual-release/configuration process; restarting a backend interrupts connections,
so coordinate this as an operational change. Keep rooms, catalog, credentials and
analytics intact. Never use Redis FLUSHALL, broad filesystem deletion or catalog
reset as a chat incident procedure.

The current admin list needs pagination for older resolved history beyond the
50-record window; staffing, semantic content review, physical devices and public notices
remain open gates, not completed by the local load evidence.

## Vocabulary maintenance

`be/src/communication/profanityChecks.ts` is a deliberately small, original
Vietnamese/English list, not a complete safety system. Review additions together
with benign word-boundary/identity/emotion tests and the cold accented-input timing
regression. Do not add ambiguous unaccented Vietnamese aliases or distress words
without reviewing false positives. Rejections return a closed code and keep the
draft editable; do not log rejected content to tune the list. Contextual moderation
was deferred by the owner, not certified unnecessary. A production activation
still requires the pilot gates above; adding words does not authorize that change.
