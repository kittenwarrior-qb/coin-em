# Kawaii floating home — local review

Owner-requested follow-up: give the original coin logo volume and a slow hover,
with gently sliding clouds. Keep the approved palette, wordmark artwork, button
geometry, labels and existing join/create callbacks. Frontend-design discipline
preserves this approved Kawaii system instead of introducing a new visual anchor.

- Original coin WebP retained; no new asset or dependency.
- Logo has a static layered silhouette shadow plus a soft ground ellipse.
  Nested wrapper floats 0–5px over six seconds independently of press/reaction
  transforms. Press depresses 3px/2%; click retains the existing short response.
- Extended cloud silhouettes cover their SVG viewport while sliding ±20px in
  opposite directions, over 24/32 seconds. Home overflow remains clipped.
- A small pause/resume button controls only decorative background motion.
  Reduced-motion users get a static scene without this unnecessary toggle.
  No gameplay event, session mutation, sound or new persistence is introduced.

Checks passed: 14 focused frontend tests; TypeScript, focused ESLint, Vite build;
72 layout checks over lobby/waiting and A/B gameplay samples at four sizes;
6 browser motion cases over three sizes and normal/reduced preferences.
Browser checks verify actual 5px transform, background pause/resume, reduced
CSS animations absent, visible logo/controls after entrance, decoded logo,
existing sheen/menu/card-flip regressions and disabled-submit semantics.

Local evidence:
`C:/Users/Admin/AppData/Local/Temp/emcoin-kawaii-motion-d4LHdS/report.json`
and `C:/Users/Admin/AppData/Local/Temp/emcoin-kawaii-live-ZcjNKd/report.json`.

Review: http://127.0.0.1:5183/qa-screens.html?screen=lobby&theme=candy-clouds&rev=floating-home
Production components, synthetic review data. **Not deployed**; live web still
uses the previously verified `a954292d8d21a45b15902dd62a66d5a0845f0cb2` release.
