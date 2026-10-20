# Kawaii motion parity — local follow-up

Status: implemented and tested locally; **not deployed**. Production remains
the previously verified UI release `a954292d8d21a45b15902dd62a66d5a0845f0cb2`.

Reference: approved `CandyKawaiiHome.tsx`, `candyPrototypeKawaii.css` and
`candyPrototypeReference.css`. Keep approved palette, original coin mark,
typography, assets, button geometry, card identity and gameplay unchanged.
The frontend-design skill is used for fidelity to the user's approved direction,
not a replacement aesthetic.

Restored missing one-pass button sheen (hover only for fine pointers; press and
keyboard supported), small icon tilt/lift, staggered home/menu/card entrances,
a single small popup overshoot and a clearer card unfold. No infinite idle
animation, new bitmap, business-state timer or automatic gameplay action added.
Reduced-motion disables the new CSS animations and spatial popup/card movement.

Verification:

- 28 focused frontend tests passed (Candy theme, real Kawaii components, chat).
- TypeScript, focused ESLint and production Vite build passed.
- 72 local layout checks passed across lobby/waiting, A/B boards and four game
  phases at 320x400, 390x844, 568x320, 1440x900; no overflow failures.
- 6 actual-browser motion cases passed: three sizes, normal/reduced motion,
  visible sheen during interaction and opacity zero afterwards, icon transforms,
  staggered menu timing, no entrance overflow, disabled submit, and no popup
  animation restart on typing. At 390px both reduced-motion settings additionally
  verify real PDF card preview, flip to back and front via DOMMatrix and close.
  Catalog HTTP is a local hash-checked fixture; card images and components are
  real. No production requests, room mutations or deployment in these tests.

Evidence retained locally:
`C:/Users/Admin/AppData/Local/Temp/emcoin-kawaii-motion-avJdCi/report.json` and
`C:/Users/Admin/AppData/Local/Temp/emcoin-kawaii-live-YYRm8P/report.json`.

Review: http://127.0.0.1:5183/qa-screens.html?screen=lobby&theme=candy-clouds&rev=motion-parity
This route mounts production components with synthetic review data.
