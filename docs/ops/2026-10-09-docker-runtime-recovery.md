# Local Docker runtime recovery — 2026-10-09

Owner authorized continuation after the explicit host-repair question, with no factory reset and preservation of containers/volumes. This is a local workstation operation, not EmCoin deployment or production-data maintenance.

## Observed failure and scoped recovery

Docker Desktop4.76.0 host log reported inaccessible `dockerInference`, then `engine.sock`; WSL docker-desktop was stopped and Linux API unavailable. Individual socket rename and reparse metadata operations failed with Windows error1920. Similar socket/parent-directory recovery is reported in the [Docker issue tracker](https://github.com/docker/desktop-feedback/issues/625); this is supporting incident evidence, not proof of the precise Windows kernel root cause on this machine.

After stopping the failed Desktop with `docker desktop stop --force --timeout 20`, verified exact absolute source/destination directories, no directory reparse link, no remaining Desktop/backend process and no unexpected contents. Only zero-byte runtime endpoints were found. Preserved these directories by native PowerShell Move-Item, without recursive deletion:

- `C:/Users/Admin/AppData/Local/Docker/run.stale-20261009`: original3endpoints dockerEthernetVfkit/dockerInference/userAnalyticsOtlpHttp.sock.
- `C:/Users/Admin/AppData/Local/docker-secrets-engine.stale-20261009`: only engine.sock.
- `C:/Users/Admin/AppData/Local/Docker/run.stale-20261009-2`:2endpoints left by the intermediate failed startup; original first directory remains intact.

The intermediate start passed Inference but failed Secrets Engine, leaving new stale Inference endpoints. The next attempt therefore cleared both runtime paths together by keeping the directories above, then `docker desktop start --timeout 45` completed successfully. Docker recreated its current runtime directories.

## Verification and limits

- `wsl --list --verbose`: docker-desktop Running; Ubuntu remains Stopped.
- `docker info --format '{{.OSType}}'`: linux, exit0.
- Cached redis:7-alpine and caddy:2-alpine image inspection succeeds; IDs match the prior local fixture images.
- Existing containers remain available;2running containers observed before allocating a new fixture. No commands to remove their containers/volumes/images were run.
- No factory reset, Docker/Windows upgrade, WSL shutdown/unregister, settings/credential editing, disk migration, system prune or VPS operation.

The stale directories have **not** been deleted. They are runtime endpoint evidence, not room or Docker-data backups. Do not restore them into an active Desktop session; future disposal/restoration requires checking that exact scope separately. Recovered engine readiness is not a60minute load pass or proof of unrelated workloads' data integrity. Fresh EmCoin short/full workload evidence belongs in R30.
