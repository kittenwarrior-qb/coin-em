# EmCoin Friends — original avatar/icon replacement (2026-10-12)

Owner reports the old icon/avatar subscription expired and approves simple faces with two theme materials. This supersedes preservation of OLD GUI portraits, not the protected card deck or original card-face pairs.

## Delivered assets and integration

- 23 stable avatar slots × two materials = 46 WebP images in `fe/public/emcoin/avatars/{orbit,paper}`. Slots remain 0–22; saved profile values are not renumbered. The source sheets contain one additional unused capybara study, not a new selectable slot.
- 30 project-authored SVG symbols × two palettes = 60 files in `fe/public/emcoin/icons/{orbit,paper}`. Role metaphors are facilitator/speech, story/heart envelope, healing/sprout hand, silence/lock, connection/loops, invitation/gift, guidance/compass. No vendor SVG paths were copied.
- EmcoinImage and themeArtUrl select materials only for `/emcoin/` assets. Card/photo URLs pass through verbatim. Board, profile, gift/reward/guess panels, night feedback, public about pages and secondary controls now use new art. Animated lock/sleep/check and private flight preserve timing and source/target semantics.
- Built-in ImageGen generated new character sheets. `prompts.json` records the exact selected prompt set and input provenance. The detailed initial Orbit draft and transparent extraction attempts were discarded; runtime sprites are mechanical cell exports from the approved simple sheets, not edited card art.
- frontend-design guided restricted palette, readable small silhouettes, original icon vocabulary and consistent material selection, with the owner's selected prototypes taking precedence over a new anchor.
- `asset-manifest.json` records 106 new asset hashes. Runtime preload manifest v2 has four existing approved brand startup assets plus 106 new Friends assets; retired GUI assets are no longer preloaded. The 200 protected card-face records remain unchanged and pass the frozen catalog comparison.
- 324 old icon/avatar files and the vendor credit logo are removed from public/build output. They were MOVED, not destroyed, to `D:/Desktop/coinem/tmp/retired-licensed-icons-20261012`. Do not move them back into a distributable build. Historical docs are retained as evidence; active vendor-license claims/logo are removed from Support/About.

## Review

Live asset sheet: `http://127.0.0.1:5174/original-assets-review.html`.
Both material collections include 32/40/48px readability examples and live local QA boards. The all-screen gallery is republished separately after its checks; UI placeholders are explicitly synthetic, not player identities or real admin analytics.

## Verification and boundaries

704 frontend tests passed; TypeScript, full src ESLint and production build passed. Reviewed source has no old `/cartoon/icons/` runtime references; retired files are absent from `fe/public` and `fe/dist`. Integrity verifier checks 112 local records including the two local protected faces, with zero protected-face reskins. Brand UI90, gameplay272, non-3D supplementary120 and explicit synthetic admin18 cases pass (500 presentation checks total). The real socket/browser room suite passes both5/10guest cases in217.54seconds; this is isolated temporary/mocked storage, deliberately offline CDN, not physical-device, production-cookie or real-Redis durability proof. Backend approved rules/night/card-showcase/operational-analytics regressions pass35tests in4files; backend behavior was not edited. The prior full-terminal and real-Redis proofs are historical separate reports, not rerun here.

The first browser attempts failed because the previous local preview server was no longer running. Later supplementary attempts were interrupted by development reloads during source edits. Neither is counted as a UI pass; stable-source reruns are required.

This is not a legal certificate or an assertion of exclusive ownership of AI output. Separate old GUI chrome/legacy fallback sprites, fonts, photos, Rive, stickers and 3D/model resources have NOT all been granted fresh licenses by this pass. Their provenance/retirement remains a release gate; the owner-protected deck is not silently changed. No VPS, production deployment, real room deletion or account secret was used.
