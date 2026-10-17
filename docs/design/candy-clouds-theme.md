# Mây Kẹo / Candy Clouds

Owner request: 2026-10-17, a third optional skin inspired by the supplied EmCoin
box artwork. The two existing themes and default remain unchanged. No card face,
card mapping, Coin color/rule, player identity, backend, native package or production
configuration is changed. This is app UI, not a deployment of the separate website.

## Direction and assets

- Pink wash `#F1B8D5`, sky `#A8DCF1`, butter yellow `#F5C857`, turquoise primary
  `#126D85`, dark readable ink `#194A60`. Quicksand is already bundled.
- Reuse `fe/public/logo.svg` byte-for-byte. Its turquoise lettering and yellow/
  orange coin are the original brand family shown in the supplied packaging.
- Original code-native SVG primary/secondary/quiet controls, circle and table:
  `fe/public/cartoon/ui/themes/candy-clouds/`. Soft slightly asymmetric outlines,
  quiet inset edge, no borrowed artwork or embedded button labels.
- New background: built-in imagegen, not CLI/API fallback. Generated original
  `C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-964c9242-dd6c-4365-a023-ca85321666b9.png`.
  Final project asset: `fe/public/cartoon/ui/themes/candy-clouds/backdrop.webp`,
  948×1659, 57,214 bytes (WebP83). Conversion is format optimization only.
- Runtime styles: `fe/src/styles/candyCloudsTheme.css`. Shared brand selectors
  admit the third ID without changing any old theme-specific declaration.
- Select from Menu → Giao diện or authenticated Admin theme switch. Public
  `?theme=candy-clouds` is validated by the existing preference model. No global
  default or stored room data changes; existing pending/navigation locks remain.

## Exact built-in generation prompt

Reference: the owner-supplied packaging attachment, used for palette/texture only.

> Use case: stylized-concept. Asset type: portrait mobile game background illustration, 1024x1792 or similar tall 9:16. The attached EmCoin packaging is ONLY a palette and watercolor texture reference, not an edit target. Create an original clean background for a children's emotional education board game UI. Soft luminous watercolor washes: candy blush pink #F1B8D5 across the upper third blending through pale lavender and creamy white #FFFAFD into airy sky blue #A8DCF1 at the lower third. Very subtle paper fibers and feathery translucent brushstrokes, like the packaging. Sparse small illustrated pastel coins in butter yellow, sky blue and soft pink and tiny white sparkles ONLY near the extreme outer edges/corners. Keep the central 70% quiet, pale and spacious for readable live interface controls and a separate logo; low visual noise, refined friendly stationery brand, no shiny plastic or candy toys. Flat full-bleed 2D artwork, no perspective. IMPORTANT no words, no letters, no logos, no buttons, no panels, no people, no card faces, no gray die-cut area, no cutting guides, no dimensions or rulers, no box mockup. This is a background asset, NOT a screenshot or mockup of an interface.

## QA scope

Focused tests cover validated preferences, original logo/card/Coin URLs, pending
button identity and unchanged popup history while switching. Browser scripts
admit the third theme by default; `--candy-only` explicitly limits a run to the new
theme (not a claim that old-theme matrices ran). `check-candy-switch.mjs` checks
real selection, reload persistence, Escape/focus return and return to Workshop.
Geometry uses isolated loopback/synthetic fixtures, not actual gameplay commands,
production auth, physical Android/iOS or a release certificate. Results are
recorded in R40 after the final run; no deployment or new APK is implied.

### Verification2026-10-17

- FE808tests/83files PASS. The final three-file pending/popup/theme subset also
  passes16tests. First jsdom fixtures were corrected to wait for real popup
  history consumption and compare the actual router/sentinel state, not animated
  visibility or an invented pre-popup state.
- Final ESLint, TypeScript and production Vite build PASS; normal PWA manifest/
  worker retained. Compiled CSS is `index-DVqt_J85.css`. Final post-fix nested
  Back/Escape matrix also PASS21/21 (`emcoin-nested-scroll-m5Yge3`).
- New-theme geometry199/199:65viewport (jGWe1i),51phase (LsUGHm),42popup (WNmqWG),
  20admin (GVkzzn),21nested (gfR1PA). Local Chromium/synthetic fixtures; no backend
  write or physical-device proof. Final geometry CSS hash:
  `5ec2d413167d0310fbf942ec23685f43c482a2bab45af920e6928d268210dc73`.
- Switch/reload/return to Workshop at320×400,390×844,1440×900:3/3PASS, errors[],
  report `emcoin-candy-switch-FUMGJA`. Covers actual Back and Escape. Earlier
  `qdrWPf` failed when the old URL override returned after popup closure. Fixed
  in ThemePreference only: after manual choice, remove stale `theme` on popstate
  while retaining unrelated query/state and popup/navigation protection. The
  geometry matrix precedes this history-only correction; final switch/full tests
  and baseline16cases (`0ZTpb8`) are after it, with identical theme CSS.
- `docs/design/candy-clouds-qa/` contains inspected Home/menu/trao-Coin screenshots.
  All labels are real UI over decorative art, not flattened screen images.
- Existing logo.svg SHA256:
  `c6dcda158f4a6ed0a990a8f5517d276ceefa817728bb963c659a19325ca7bb4a`.
  New WebP SHA256:
  `6b68688bd3fb70e8e8a73a61ecb0715e301c832bbaabd923cfe60159921f74a5`.
