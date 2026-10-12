# Prototype refinement — Menu, icons, gameplay

## Why the previous result was busy

The live board reused Home's large interlocking ribbons, while the approved board reference keeps the gameplay center blank. Menu icons mixed generic outline symbols with the paper controls. Roles still used bright curved captions, floating 3D crowns/flowers and plain name labels; all of these competed with the new materials. The gift picker had a permanently visible recipient grid rather than the compact selected-recipient row in the reference.

## Applied

- Independent gameplay backgrounds for both themes. Home/Menu retains its existing hero art; the board uses quiet center space with decoration at its edges.
- Shared repo-native `BrandIcon` family for Menu cards/cube/book/headset, gift, question mark, settings, chevron and close. Legacy consumers keep their original art.
- Brand board wordmark, real round/phase heading and readable player-name plaques. Real role labels/border meanings remain; brand-only floating crown/flower decorations are removed, not role information or avatars.
- Gift picker follows coin type → selected recipient → amount → confirmation. Selecting a recipient collapses the grid; reopening remains explicit and blocked while pending. The accessible confirmation name retains the exact quantity/type/recipient. Failure preserves choices and never invents success.
- New paper-style “Mới” badge, coordinated button type and popup chrome.

frontend-design guided the containment, hierarchy and icon consistency. The owner's approved prototypes override the skill's generic anchor palettes. No new brand direction was introduced.

## Assets and provenance

Generated with the built-in imagegen tool, not CLI. Original tool outputs are retained under `C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/`.

- `fe/public/cartoon/ui/themes/kindness-workshop/board-backdrop-v1.png`: source `exec-7b2d2ea2-0c12-41e5-aae5-ba48ecb65f88.png`; reference owner attachment `codex-clipboard-d3ae380a-cff9-4bc6-9746-d0ad0bcde85c.png`.
- `fe/public/cartoon/ui/themes/emotion-orbit/board-backdrop-v1.png`: source `exec-3ef7ee6e-5e07-4b7a-bd5a-270b911c6f5b.png`; reference owner attachment `codex-clipboard-f36454b8-34ef-49c6-8b03-d64441a4276f.png`.

### Final prompt set

Paper: Use case: precise-object-edit. Asset type: reusable mobile gameplay background ONLY. Input image is edit target and exact visual reference. Remove EVERY UI component: logo, headings, table blue rectangle, six player tokens, numbers/name labels, gift sheet, coins, buttons, all icons and their shadows. Fill those removed areas with continuous original ivory fibrous paper. Preserve the existing background edge collage ONLY: denim-blue torn strips in outer corners, coral paper ribbons hugging left/right/bottom edges, muted grey-blue scraps and small ochre/coral round cut-paper accents at edges. Preserve exact original denim/coral/ivory palette and tactile paper fibers. Center 70% width from top 10% through bottom 90% must be calm blank ivory paper with zero loops or ribbons crossing gameplay area. No added objects, no text, no icons, no frames, no new decoration. Output portrait same aspect ratio as reference.

Orbit: Use case: precise-object-edit. Asset type: portrait mobile gameplay background only. Reference is exact edit target. Remove ALL foreground UI and its shadows: title pill, back/settings buttons, progress dots, heading, labels, large central orbital table and all six numbered player tokens, bottom gift panel, controls, text, every coin. Reconstruct calm continuous almost-white lavender satin background underneath. Preserve ONLY existing background decorative edge elements: large deep-indigo curved corner at upper right with fine berry-pink orbit stroke and pink satellite dot, fine dashed orbit upper left, subtle translucent pale lavender left and right edge circles, faint lavender lower-left curve, lower-right berry/indigo edge arc. Keep the reference's restrained indigo/lavender/pink palette and fine silky paper texture exactly. Center 70% stays quiet and empty, no arcs crossing center. No text, no icons, no table, no added shapes. Portrait same aspect ratio as reference.

## Validation and remaining fidelity gaps

24 focused renders cover both themes, Menu, selected gift picker and 6/10-player boards at 320×400, 430×660, 430×932. 46 targeted component tests pass, including two branded recipient/error regressions. TypeScript, targeted ESLint and production build pass. Final frozen-source reruns: 90/90 screen cases and 272/272 phase cases pass. The gallery and an image URL both return HTTP 200.

Still not pixel-identical: generated background fibers and silhouettes differ from reference pixels; the available typefaces are approximations; player avatars/real roles replace prototype numbered placeholders; 10-player density differs from the six-player reference. Coin selectors show only currently legal types, not three fictional positive allowances. Server multiplayer/reconnect is outside these synthetic previews.

Review: `docs/design/brand-prototypes-v1/refinement-review.html` on local gallery port 5174. Reports: `docs/design/prototype-refinement-qa/report.json`, `docs/design/brand-theme-qa/report.json`, `docs/design/gameplay-theme-qa/report.json`.

## Avatar and corner wallet follow-up

Owner flagged plain avatar borders and undersized legacy Coin thumbnails. Added code-native paper/satin avatar rims with an inner ivory layer, retaining the chosen portrait/background, player name and separate live countdown border. Role colors are translated into each theme's tones while real role labels remain. Legacy avatar masking is unchanged.

Corner wallet uses an ivory/paper backing and readable tabular balances. New UI-only Coin SVGs use stars for Xưởng Tử Tế and emotion faces for Vòng Cảm Xúc; green/yellow/red meanings, amounts and exact original card-preview callback pairs are unchanged. This uses frontend-design for hierarchy/material consistency, not a new imagegen asset pass.

Four additional theme-specific tests verify portraits/countdowns and all three Coin amounts/face pairs. All 19 targeted tests pass; TypeScript, targeted ESLint and production build pass. The final 24-case focused matrix passes with matching `give-coins` phase (closing the local gift popup to show the full board), rather than comparing a selfcare phase against the reference's Coin phase. The phase caption remains below, not beside, its heading. Earlier broad matrix results above belong to the prior frozen-source pass, not this avatar follow-up.

## Full round-index UI audit and paper silhouette correction

- Replaced smooth paper-ring curves with deterministic finely irregular cut-paper outlines; removed the excessively uniform thick circular stroke. The portrait, countdown and role disclosure rules remain separate and unchanged.
- Paper name plaques have torn edges. Names use readable Quicksand and can wrap rather than truncate the last digit/name segment. Satin theme names also wrap.
- Added bottom scroll clearance and scroll padding to the gameplay region. The last avatar remains reachable; the 10-player gallery now includes an explicit bottom-scroll screenshot. Fitting 10 people at the same scale on a short mobile display still requires scrolling; hiding the last player is not accepted as success.
- DEV fixture accepts round indices 1–10. `check-gameplay-themes.mjs --all-rounds` checks 680 synthetic states: both themes × 10 round indices × 17 phases × two viewports (320×400 and 430×932). Player counts rotate 6–10, viewers rotate narrator/sender/healer/silencer. This is not the full Cartesian product and does not simulate valid server actions through all ten rounds. It checks actual scroll reachability of player tokens as well as dialog controls, pill clipping, horizontal overflow, missing images and JavaScript errors.

Final frozen-source results: 680/680 state renders, 24/24 focused layouts, 56 component tests, TypeScript, targeted ESLint and production build pass. No failures were detected by those checks; they cannot prove absence of every visual defect or pixel fidelity.

The owned multiplayer browser suite also passes both 5-guest and 10-guest scenarios using production handlers on an isolated loopback server with temp storage/mock Redis and independent browser guest contexts. It checks admission/start/role reveal, synchronized phase navigation, countdown stability, reload, offline recovery and tab replacement. It does not traverse all 17 phases or ten complete rounds, and is not real Redis/production/physical-device testing. Reports were written to the two `emcoin-room-browser-qa-*` directories printed by the test run.

frontend-design guided the corrected paper silhouette, legible names and scroll clearance, within the owner's existing prototype direction. Report: `docs/design/all-rounds-theme-qa/report.json`.
# Orbit Menu refinement — 2026-10-11

Applied frontend-design's visual-system discipline to the owner-approved Orbit reference, without substituting a new palette. Menu-only changes: Quicksand bold instead of Cookii, independent outlined SVG icons, full arrows, flat lavender satin rows, a distinctly blush second row, inline berry “MỚI”, and reference-aligned panel/row/title geometry. Workshop icons, paper materials, card artwork and action handlers stay unchanged. Compact-height panels remain internally scrollable.

Verification: 24/24 synthetic refinement cases (both themes, Menu/gameplay/coin picker, three viewports), 5/5 Menu hierarchy tests including theme-specific badge/icon isolation, TypeScript build, scoped ESLint and production Vite build passed. Reviewed the resulting 430×932 Menu screenshot and refreshed the comparison gallery. This is closer to the prototype, not a pixel-perfect certification: the available Quicksand typeface and reproduced SVG geometry are not the original generated image's exact glyphs/strokes.
