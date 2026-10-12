# Room retention: 1 hour / managed backups: 7 days

**Superseded for new content archives2026-10-03:** owner explicitly disables new deleted-room backups and external VPS backups. Inactive room expiry remains1hour. New deletion writes only a minimal7day anti-resurrection marker, removes active storage and never creates/accesses `.deleted-backups`. Existing historical archives are not manually deleted/migrated by this change; their existing safe expiry validation is retained. Active Redis persistence/legacy JSON authority is unchanged. The old backup descriptions below document historical behavior only, not an enabled new-backup policy. No backup/recovery guarantee or production cleanup/deploy is claimed. Decision: `docs/adr/2026-10-03-owner-admin-and-release-direction.md`.

Approved by owner 2026-10-02. Room activity means committed room/game actions (including admission/profile/settings), not network heartbeats, presence leases or transient card previews. All statuses expire at `now - lastActivity >= 1 hour`. One-minute checks are poll-bounded and retry failed primary operations; a storage outage is not falsely reported as successful deletion. The prior two-hour reconnect grace is subordinate to room expiry.

## Runtime paths

- Shared room queue: fresh primary read, activity recheck, awaited delete. Redis Lua compares revision and current activity before **any write**, preflights index type, atomically writes a seven-day marker and removes room snapshot/index.
- Commits check the marker before writing, including from another process. Fresh reads/recovery evict or omit tombstoned rooms. No automatic Redis-required JSON recovery is introduced. Expired JSON snapshots are not loaded, even after a marker expires.
- Last-player leave now awaits deletion before announcing room closure. The ten-second waiting disconnect callback also rechecks identity/generation in the room queue. Cleanup/grace jobs are drained when the handler lifecycle stops.
- Restart no longer erases fresh waiting-room rosters or extends activity. Startup runs the same inactivity cleanup before becoming ready.

## Managed backups and boundaries

Generated snapshots go to `ROOM_DATA_DIR/.deleted-backups/`, in a `deleted-room-backup/v1` envelope with deletion/expiry timestamps. Minimal local markers go to `.tombstones/` (`room-deletion/v1`). Neither folder is an automatic restore source. Backups contain private room data and session **hashes**, not a license to restore live credentials; keep access restricted and never commit them to Git.

The one-minute cleanup also removes generated expired archive/marker files after seven days. It validates managed direct-child directories/files and refuses symlinks/junctions/corrupt metadata; no recursive deletion of arbitrary storage. It retries degraded removal of a tombstoned active JSON file, preserving a fresh replacement after marker expiry. A room code with an unexpired marker cannot be reused. Active JSON backups are overwritten snapshots, not an unbounded history.

Once Redis deletion commits, a secondary disk/archive fault is logged as degraded, not a failed game action. This can mean a deleted room has no recoverable backup. In JSON-only mode an atomic local marker is the deletion commit; subsequent archival failure is also degraded. Corrupt metadata/disk faults require operator review and can delay physical backup purge. No zero-loss guarantee is made.

**Not managed here:** external `make backup` copies, full Redis AOF/volume snapshots, Umami/Postgres, remote/offsite archives, old orphaned files without valid managed metadata. The owner's seven-day policy also applies to these, but their storage owner/scheduled enforcement must be configured separately before release. This app must not silently delete those directories or claim their retention is already enforced. No user/production data was deleted during implementation/testing.

Operator restore remains gated: authorized isolated infrastructure, immutable checksum, current primary revision and deletion-marker review, migration/catalog validation, stripped/revoked transport credentials and explicit restore approval. Do not point the offline audit CLI at archives as if they were current raw Room files. Do not restore older-than-policy snapshots over fresh or deleted rooms.

## Verification / rollback

Focused tests: `npx vitest run tests/unit/Retention.test.ts tests/unit/RetentionScheduler.test.ts`. Real Redis: build backend, then `node scripts/test-real-redis.mjs` (dedicated labelled loopback container only). Tests exercise boundary, fresh activity/heartbeat distinction, primary failure, revision/index race, queued writes, cancellation, seven-day expiry and marker survival through kill/restart in a new process/directory.

Rollback is a reviewed forward-compatible code change. Keep marker interpretation and seven-day backup boundaries; reverting to old code that ignores markers can resurrect deleted rooms. Never reset live data or remove markers to make an old binary start.
