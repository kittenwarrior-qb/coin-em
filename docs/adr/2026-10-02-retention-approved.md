# Owner-approved retention — 2026-10-02

Owner: “phòng 1h ko hoạt động thì xóa, backup 7 ngày”.

- All room statuses, including ended/fake-only rooms, expire after one hour without room activity (`lastActivity`). Presence heartbeats do not extend this window. Existing explicit room leave/empty-room removal can still close a room earlier.
- Backup retention: seven days. Application-managed deleted-room snapshots are kept separately from active room files, expire seven days after archival, and are never automatically restored. External full-volume/AOF/Umami/operator backup storage must also follow seven days, but is not silently targeted by application cleanup.
- Cleanup checks every minute, rechecks current primary state and uses atomic revision/lastActivity guards. Timing is poll-bounded, not an exact-to-the-millisecond deletion guarantee during an outage.
- Minimal deletion markers are kept for the same seven-day backup horizon to block stale writers/fallback resurrection. Expired room snapshots are not auto-restored, even after markers expire. A new room code cannot reuse an unexpired marker.
- One-hour room expiry takes precedence over the previously approved two-hour seat reconnect grace. No heartbeat, resume listing or old backup can extend room lifetime by itself.
- These are retention choices, not a legal-compliance claim or authorization to delete arbitrary backup directories/deploy/restore production. RPO/RTO, migration, revocation-aware operator restore and minor-consent review remain open.
