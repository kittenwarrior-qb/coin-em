# Operational logging boundary

The compiled TypeScript backend emits `operation-diagnostic/v1` with three fields only: version, a closed operation label, and a closed outcome. The frontend uses `socket-diagnostic/v1` with version, a closed event label, and severity. These are diagnostic observations, not a durable action audit or proof of a committed transaction. Actual admin-close audit receipts remain in the primary content-free deletion marker.

Do not add room/user/socket/session IDs, names, roles, cards, votes, response/reflection text, tokens, passwords, IPs, URLs, filesystem paths, raw errors or arbitrary labels. The backend attempts at most120records per minute per process. Sink/clock errors consume/drop diagnostics without failing gameplay. `diagnosticSamplingSnapshot()` returns a detached process-local budget/drop summary; it is not an exposed public endpoint or persistent history. Frontend informational socket diagnostics run only in development; warnings/errors contain no payload. No external collector or crash SDK is configured.

Generic backend JSON parse/size/internal exceptions return fixed no-store400/413/500 responses without raw body, message or stack. A response already started is terminated, not appended with an error page. The admin registrar retains its earlier authenticated/CSRF/4KB boundary. Socket ACK semantics are unchanged by this diagnostic-only revision.

The admin HTTP aggregates are volatile outcome/timing totals, reset on process restart. They are not unique visitors, historical traffic, action/reconnect counts, a capacity promise or production alerting. Sampling also means log counts cannot be used as exact action totals. Room content expires after one hour of inactivity under the existing retention rule; no new deleted-room content archive or external VPS backup is configured.

Before production: the operator must configure access and retention for stdout/container/journal/proxy logs outside this repository, review Caddy/platform access logs separately, designate an alert recipient and rehearse readiness failure detection in approved staging. Do not claim that application redaction disables every host/proxy log or proves legal compliance for ages6–18. The old unused JavaScript entry is not covered by the compiled TypeScript source guard and has not been removed without an entrypoint usage audit.

Verification uses synthetic values and owned loopback/temp fixtures only. No production logger, database, container, credential or hosted service was changed.
