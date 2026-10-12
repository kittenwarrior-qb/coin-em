# Public diagnostics minimization

`/health` retains its existing readiness contract: 503 until startup completes or required primary storage is unavailable; 200 otherwise. `/metrics` is not a readiness check.

`/metrics` now returns only `rooms` (number), `players` (number), `roomsByStatus` (`waiting`/`playing`/`ended` counts), `uptime` (seconds) and `redis` (boolean). Removed: `roomDetails`, all room identifiers/activity timestamps, `memory` and `pid`. Both routes use `Cache-Control: no-store`.

This deliberately changes the previous public metrics shape. No FE/test/documented consumer of `roomDetails` was found in repository search; external consumers must migrate to aggregate fields. Do not recreate per-room public labels as a compatibility workaround. A future authenticated operator view requires R36 review.

The shared registrar is used by runtime and tested on an isolated loopback random port. This is data minimization, not full privacy compliance, telemetry/SLO/alert coverage or crash-reporting consent. Aggregates may still disclose overall activity; access controls/rate limits and infrastructure observability remain operational review topics. No new third-party analytics or retention policy is introduced.
