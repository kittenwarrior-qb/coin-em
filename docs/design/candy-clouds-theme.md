# Mây Kẹo / Candy Clouds

Owner request: 2026-10-17, a third optional skin inspired by the supplied EmCoin
box artwork. The two existing themes and default remain unchanged. No card face,
card mapping, Coin color/rule, player identity, backend, native package or production
configuration is changed. This is app UI, not a deployment of the separate website.

## Direction and assets

- Refined controls: pink `#F3C2D8`, sky `#BCE6F4`, butter yellow `#F5CF75`,
  dark readable ink `#214E63`. Quicksand is already bundled. The original Home
  watercolor background retains its packaging-inspired pink/sky wash.
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

## Product refinement — owner feedback, 2026-10-17

Owner requested a designed product family rather than a recolor of unrelated
controls. Packaging colors take precedence over preset skill palettes.

- Home actions: original asymmetrical SVG silhouettes, lighter sky/pink material,
  short dimensional lower edge, restrained highlights and dark labels. Both
  gradient endpoints maintain at least 4.8:1 contrast against ink (sky >=5.85:1).
- Navigation: compact, gently irregular rectangular tiles instead of four huge
  alternating pills. Consistent icon tile, text alignment and trailing chevron;
  only the 3D novelty indicator uses a pink accent. Theme choice remains live.
- Icons: original CandyIcon 24px grid with 1.8px round strokes, used on Home,
  menu, shared BrandIcon and circle controls. Twelve matching SVG assets cover
  in-game lock/heal/connect/compass/sleep/gift/check/photo/navigation/role symbols.
  URL mapping is an exact allowlist; card faces, user images and semantic Coin
  artwork never enter it. Older theme icon rendering remains unchanged.
- Secondary screens: softer input/panel chrome, quieter scrollbar, matched
  selection borders, readable focus. Gameplay background is subdued separately
  from Home; night gets a continuous blue gradient with readable navigation.
- Ten-seat layouts prioritize readable role/name labels over fitting everything
  into one short screen. The viewport stays fixed; genuinely long game content
  remains internally scrollable. Disabled/pending controls stay disabled.
- Success toast text is explicitly dark on the new light action color. This
  was found by reviewing the rendered contact sheets, not by geometry tests.

Reproduce diagnostic screenshots (synthetic data, read-only local routes):

`node e2e/scripts/review-candy-design.mjs http://127.0.0.1:5183`

The script captures 17 screen/modal states and all 17 phases, plus contact sheets.
Card-preview is a fixture exercising the image-load-error fallback; it is not
evidence of a production catalog failure. Screenshots do not prove actual
multiplayer behavior, production authentication or Android/iOS device behavior.

### Refinement verification

- FE809 tests/83 files PASS; final icon-stroke follow-up: focused5 tests and
  TypeScript PASS. ESLint and Vite build PASS; final CSS `index-DzaqvNAD.css`.
- 65 viewport +42 popup-reachability +51 phase +21 nested +3 switch/reload cases
  PASS on synthetic loopback fixtures. All-theme Home/menu baseline16 and
  Candy admin20 also PASS. Reports in temp: `636guF`, `NOUiTG`, `9xA18a`,
  `fIPcol`, `WP9DbA`, `Tjk1Vg`, `3ZKnkt` respectively (script-specific prefixes).
- 34 screenshot cases have no document overflow (`emcoin-candy-design-rp5cMU`).
  Final toast/night follow-up confirms computed title ink `rgb(33,78,99)` and
  night navigation `rgb(239,248,252)`. Contact sheets were refreshed after this
  check, in `docs/design/candy-clouds-refinement-qa/`.
- No production deployment, APK rebuild, card-face changes or rules changes.

### Follow-up: button edges and playing mat

Owner's screenshot showed Home icons/chevrons too close to the illustrated
button edges. Home now uses explicit three-column grid sizing and bounded
padding rather than percentages on individual flex children. Labels can wrap;
Guide has room for enlarged text. The new fit test checks child containment,
separation and card-slot clipping, not just document scroll height.

The old blue multi-ring table sprite is no longer rendered for Candy. A quiet,
single-edge card mat is attached to `table-card-area`, independently of status
and action controls. Card widths respond to the mat container; two-card and
three-card rows stay within its boundaries. Card URLs/faces/click identity stay
unchanged. Placeholder glyphs use the original Candy icon family, not emoji.

- Fit matrix42/42PASS (`emcoin-candy-fit-W2tWvd`): seven viewport sizes,
  100%/150% Home text, six/ten seats, emotion/reflection rows. The first run
  `P6CMTa` caught Guide text overflow at150%; fixed before the final run.
- Phase geometry51/51PASS (`OElvzk`), all-theme Home/menu baseline16/16PASS
  (`QPKosQ`). FE809 tests PASS, followed by the final focused6 tests including
  three real card faces and preview click identity. TypeScript/ESLint PASS.
- Final Vite build PASS; CSS `index-CMLbGm93.css`.
- Inspected current screenshots and fit report: `docs/design/candy-clouds-fit-qa/`.
  Earlier refinement contact sheets above intentionally document the previous
  iteration, not this revised playing mat. No production deployment.

### Art-direction follow-up: Bàn Mây

Owner rejected the neutral mat as visually unfinished. Replaced it with an
original code-native illustrated cloud surface (`table-cloud.svg`): irregular
silhouette, sky-to-blush edge, painted highlight curves and sparse sparkle marks.
Placeholder backs use matching color washes and live SVG glyphs. These are
empty-state UI, not replacements for actual card faces.

Candy portraits now have an independent medallion (`CandyAvatarFrame.tsx`),
soft role tones and a small gold stamp, rather than reusing Orbit's satin rings.
Names are unboxed; role text remains visible with a colored left marker. Role
visibility logic, identity, countdown layer and actual portrait art are unchanged.
The self-photo badge is placed at the portrait edge instead of over the name.

Coin wallet is a compact horizontal HUD; header has a consistent title accent.
Six-seat layout is tighter, and tall nine/ten-seat screens use a620px layout with
a250px mat, while short viewports retain internal scrolling. Night names are
explicitly light for contrast. Facilitator navigation uses the Candy crown glyph.

- FE811 tests/83files PASS, including independent frame/countdown/old-theme and
  unchanged real card-face/click tests. TypeScript and ESLint PASS.
- Final42-case fit run (`emcoin-candy-fit-BvJw0K`) PASS, now also checking side
  player-token overlap. Seven viewports, normal/enlarged Home text, six/ten seats.
- Phase51 and old-theme Home/menu baseline16 PASS (`6jSJGM`, `hrRBrp`) before
  the final tall dense-layout-only adjustment; final fit42 is after it.
- Inspected evidence: `docs/design/candy-clouds-table-art-qa/`. Previous screenshot
  folders are historical iterations, not the current design. Still local only.
- Final Vite build PASS; CSS `index-C0BZZbm_.css`.

### Scroll architecture correction; art not approved

Owner rejected Bàn Mây and reported vertical scroll instability. The decorative
cloud mat is no longer rendered (asset retained as historical iteration). Current
neutral oval is provisional; it is not an owner-approved design direction.

Root cause: old per-count minimum heights620/720px were added to header and
footer spacing. The whole player-grid scroll owner included the header, so it
could disappear while reaching the sender. Candy now wraps the unchanged seat
order in one `candy-stage-scroll`. Fixed-height header remains outside it, and
the inner canvas minimum derives from side-seat rows (`94px*rows+192px`). Short
screens retain accessible internal scrolling; normal390x844 six/ten-seat boards
have no unnecessary stage scroll. No global scrollbar-hiding workaround.

- Real wheel up/down, last-seat reachability, fixed header/outer/document,
  phase-height stability:42/42PASS (`emcoin-candy-stage-SrXhJL`), three viewport
  sizes, six/ten seats, seven representative phases. Screens/report saved at
  `docs/design/candy-clouds-stable-stage-qa/`.
- Existing fit42PASS (`UepoaI`, before fixed header-height-only follow-up).
- Full811 tests PASS; new layout order/theme isolation test makes focused8
  tests PASS. Initial test annotation was too narrow for optional Player flags;
  corrected to the actual Player type before final TypeScript/build verification.
- Earlier browser run was interrupted by Vite hot reload during an edit; final
  stage matrix was run with source frozen. No production deployment.

### Owner decision: Orbit structure, Candy palette

Owner selected “Vòng Cảm Xúc: bàn tròn, bố cục thoáng” as the structural reference.
Current table uses original `table-round.svg`: circular plane, segmented sky rim
and one blush arc. Removed the provisional oval and rejected cloud frame from
runtime. Actual card images, role rules and existing themes stay unchanged.

Additional narrow-screen grid min-content expansion caused sideways seat
clipping. Fixed with `minmax(0,1fr)` grid track, `min-width:0` middle row, and
compact two-row facilitator navigation below360px. Stage is vertical-only.

The preview process was serving stale CSS: HTTP/browser rules still contained
old `min-height:0` without the saved `min-width:0` declaration. Verified source
versus served rules, then restarted the owned5183 Vite process. Earlier screenshots
and SrXhJL/20hM8R are not final-current-source proof. After restart, source/served
grid rules agree and the final narrow-screen capture shows both seat columns.

- Final stage matrix42/42PASS (`emcoin-candy-stage-5D1Dzp`), including horizontal
  stage overflow and seat containment, actual wheel up/down, last-seat reach,
  fixed header and same stage geometry across7phases at3viewports/six-ten seats.
- Final fit42/42PASS (`emcoin-candy-fit-zmwyol`), enlarged Home text, all card
  slots contained and no side-token overlap. Inspected current normal/short PNGs
  in `docs/design/candy-clouds-round-stage-qa/`.
- Focused8 tests PASS; final TypeScript/ESLint and Vite build PASS
  (`index-BZh0kuk1.css`). Full811 pass preceded the new seat-order test; no claim
  of a rerun full812 suite. No production deployment or native package rebuild.
