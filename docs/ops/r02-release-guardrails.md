# R02 Release guardrails

## Local changes, 2026-10-01

Production Compose fixes `NODE_ENV=production` and both role-picker flags to false.
The server rejects bot insertion and debug preference updates in production even if
an environment flag is incorrectly enabled. Persisted debug preferences are ignored
by GameEngine when starting a room in production. Outside production, bot insertion
requires the connected host and an integer count from 1 to 10.

Deploy requires a successful CI from a push on this repository's main branch.
PR/fork/manual CI events do not deploy. E2E remains in CI; a broken suite blocks release.
Production deploys are serialized without cancelling a running release.
The `production` environment should have a required reviewer configured before rollout;
this repository change does not configure GitHub environment or branch protection settings.

The VPS checkout must be clean. The workflow fetches main, verifies the exact tested SHA
is an ancestor of main, then checks out that SHA detached. It rebuilds/recreates only
backend/frontend with `--no-deps`; Redis, Caddy and analytics are not recreated.
Backend `/health` and a nonempty frontend index file must pass before success is reported.
This is process health plus a frontend-file check, not proof of game integrity or readiness.

## Rollout and rollback

No deployment was run during implementation. Before enabling this change, the release
owner must confirm the maintenance window/drain policy and configure required reviewers.
Backend recreation still interrupts live sockets; R37 owns drain, immutable images and
end-to-end public smoke tests. Do not release while active games lack an approved drain.

The job prints previous and requested commit SHAs before changing checkout. If a build
fails before recreation, running containers remain; a failed health check after recreation
requires incident review. Do not automatically roll back persisted state or restore snapshots.
After confirming schema compatibility, the authorized operator can check out the recorded
previous SHA, rebuild backend/frontend and recreate only those services with `--no-deps`,
then repeat health/file checks. Never delete volumes to perform this rollback.

## Verification

Server regression tests cover production rejection with debug=true, unauthorized bot
calls, malformed counts and persisted role preference suppression. Workflow checks
cover source event/repository/branch, successful CI, exact SHA and service scope.
Local checks do not prove a GitHub CI run, branch protection or a VPS deployment passed.
