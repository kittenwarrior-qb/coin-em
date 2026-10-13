# Guarded manual frontend update — 2026-10-13

## Source and actual deployment

- PR91 merged: web imagef58348233d589e6d941a5b818b1d01dba549fdc6;
  current release pointer and web container match that SHA.
- Backend remains0f9ecfe6cdd176fb6ee7e822b80e142fcc343c98. Backend container
  ID eafff3537b1a2e739b4af1d1829f48b268755ed1d2ccdfd6266d32f8a682a1a2
  and started2026-10-13T03:28:13.073527992Z unchanged; Redis container ID
 31eb9381a1202d5413dcba5ced8f022af615be2d1764b9e3fe7b153f61f56a0f
  and started2026-10-13T03:28:02.300165198Z unchanged.
- Images checksumd4f31209ce7d765b9c6917f5eff7c981f2c517a72a4968dcbbb09e3271d00763;
  config0ddab60b01e915b4e499a2c6c4695c546ced11ff7659672917b03ccc1eef9dab.
- Real backend image filesystem/execution fingerprint equal between old and
  newly built image; runtime/Caddy files match. Empty healthy backend checked
  before stopping only web ingress and again behind that admission barrier.
  Only web recreated; no room close, database seed, volume deletion or backend
  restart performed by update driver. HTTPS/catalog checks then promote pointer.
- Canonical100-card catalog remains active. CI remains enabled for checks;
  automatic Deploy remains disabled_manually as owner requested.

## Focused UI and capture change

Early admin screenshot was taken before image decode, falsely making the logout
background appear absent. Real decoded capture/login/logout confirms its material.
Separately, raw center pixels show white-on-pink contrast about4.25:1 and a live
background sample4.41:1 for small text. W3C criterion for that text is4.5:1:
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html .

Only admin logout changes to the existing quiet/light secondary material and
brand ink. Destructive close-room remains pink; both approved themes tested.
No card/asset reskin, palette redesign, wire protocol, gameplay or Coin change.
Live updated sample contrast9.0534:1; actual login/logout passes. This sampled
control measurement is not full-page or full-application WCAG certification.
frontend-design discipline preserves owner-approved theme/content rather than
inventing another aesthetic. Screenshot QA now awaits real assets/fonts and
exit-overlay DOM removal; failures are retained, not hidden by image timing.

## Tests

- Backend672/672 and frontend741/741 tests pass; backend typecheck, frontend
  lint/typecheck/production build and unchanged asset manifest pass. Initial
  typecheck caught misuse of Testing Library's nonexistent exact option; removed
  it (string role names are exact by default), reran typecheck successfully.
- Admin production-preview browser case passes320/390/1280 with decoded assets,
  quiet logout material, no horizontal overflow and original pending/retry/focus
  assertions. HTTP in that fixture is synthetic, not real auth evidence.
- Eight network-disabled owned Ubuntu shell scenarios pass: success, occupied
  room, admission race, storage unavailable, backend changed, config changed,
  bad checksum, HTTPS failure. Mocked Docker/curl/sleep, retained data sentinel
  and pointer checks; not real Redis/concurrency/TLS/SLO certification.
  Evidence:C:/Users/Admin/AppData/Local/Temp/emcoin-web-update-qa-lTkNER/report.json.
- First fixture attempt read Linux symlink using Windows Node readlink and failed
  EINVAL. Read pointer inside its owning container filesystem instead; no guard
  removal, data deletion or source filesystem workaround.

## Live gameplay smoke and retained failure

Two post-update fast UI smokes gave red+green, then failed waiting for yellow's
success popup. Failure screenshot identifies the actual existing RATE_LIMITED
message, not a lost ACK: same giver's green preview completes in772ms and the
script requests yellow before gameHandlers'1000ms per-socket limit. Yellow remains
5; server correctly refuses it without deducting. Failed reports/screenshots and
owned QA room cleanup retained locally. The first timeout was5s; corrected
expect.configure return value to15s yields the same rejection, proving that a
longer wait alone is not the fix. No production limiter disabled or runtime
Coin behavior changed. Live smoke now respects1100ms between same-giver requests.

Latest live smoke **passed**:15phase visits,3gifts, exactly1receipt total per
color across5summary rows, no page errors, ownedRoomCleaned:true. Result recorded in local
`docs/qa/deployed-web-20261013/report.json`; verify its result rather than treating
the retained earlier failures as a pass. Scope: five owned real browser clients,
one chosen/saved round,15phases, three gifts, receipt totals, reload and terminal
state, owned-room-only cleanup. No physical-device/store/voice/load certification.

## Operator boundaries

update-web is a short maintenance deployment, not zero downtime or a general
backend upgrade. It refuses changed backend/config or rooms; restores old web on
failure; preserves backend/Redis/catalog data. General backend migrations and
compatible drain remain separate work. Users with an old open tab may need a
reload after maintenance; this is not a seamless lazy-chunk retention guarantee.
No new room archive, external backup, visitor tracking or Umami introduced.
