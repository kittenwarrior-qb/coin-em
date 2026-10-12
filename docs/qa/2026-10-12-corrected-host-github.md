# Corrected host and GitHub inventory — 2026-10-12

Owner corrects host to103.74.102.24 and requires GitHub-managed source/deploy.
No mutation on wrong host180.93.54.160. Correct-host read-only inventory:

- Ubuntu18.04, kernel4.15.0-22; Docker24.0.2, Compose2.18.1.
-3GB RAM,20GB disk,13GB free; existing2GB swap.
- Only containers `mendez-caddy-1`, `mendez-app-1`, `mendez-db-1`.
- Only five volumes, all labelled project=mendez: backups/caddy_config/
  caddy_data/media/pgdata. Only project network mendez_default, plus Docker defaults.
- Source `/opt/mendez` resolves to itself,143MB, no nested mount reported.
- Ports80/443 owned by Mendez Caddy; no native nginx/caddy/apache2 active.
- Firewall inactive. ESM status JSON unsupported by the old client; no inferred
  subscription/security coverage. Ubuntu18.04 standard maintenance ended2023;
  see https://ubuntu.com/about/release-cycle .

Owner approves fresh Ubuntu24.04 LTS through provider console. No in-place
upgrade, wipe, old-container/volume deletion, reboot or EmCoin install performed.
Fresh install requires provider-console action, then verify changed host key
through that trusted console. DNS app.emcoin.cloud A103.74.102.24 confirmed via
Cloudflare resolver after correction; previous wrong-IP/NXDOMAIN evidence is historical.

Git Credential Manager account kittenwarrior-qb has repo ADMIN; gh's global
HuynhDuyAnh96 account was READ. Use existing Git identity in process only, never
print tokens or change global auth. Existing repo remains public; no credentials,
runtime databases or local data included. Source audit scans1511candidate files,
zero credential-pattern/private-file/100MB-limit findings. Generated QA images
remain local; curated source/docs/reports are prepared for a PR, not direct main push.

Workflow builds exact successful main-push CI images on runner, labels commit,
archives/checksums them, uses strict known-host SSH and host-only admin settings.
Fresh24.04/operator approval/no-existing-backend gates prevent accidental updates.
Automated later updates remain refused pending a tested admission-freeze/drain path.
This source is not claimed to have run on GitHub/VPS. Runtime Compose config,
Ubuntu24.04 Bash syntax and13focused guard/CI/parity tests pass locally.
