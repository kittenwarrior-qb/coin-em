# A1 shared UI rollout — 2026-10-10

Current approved direction is Sky–Pink, superseding the historical mint rollout below. Active controls use sky blue / blush pink / neutral support sprites, with deeper blue ink for small labels. Latest15-case route check passes. Exact generated asset provenance is in `../a1-sky-pink.md`.

Use the owner's restored puffy A1: mint primary, blush secondary/selected, cream support surfaces. No rejected organic/bean sprite is active. frontend-design guides shared hierarchy and readable live labels, with the owner's A1 choice overriding unrelated anchor palettes. No new bitmap generation this turn: reuse inspected/selected sprites and decorative art from prior provenance records.

## Implemented coverage

- Existing registry covers seven pill variants and fourteen circle variants; switch/toggle/checkbox/range/progress/spinner, screen/table/modal artwork already use A. Keep that approved mapping.
- Shared native Button now exposes variant/size hooks; A CSS skins filled/secondary/outline/destructive/icon surfaces while ghost/link remain text controls. Keep asChild, pending, disabled, ref and callbacks intact.
- Public-site primary/secondary CTA, site navigation/mobile menu, dropdown portals, 2D catalog filter controls and preview navigation follow mint/blush/cream hierarchy. Catalog face imagery and category contents are untouched.
- 3D showcase circle controls, bottom triggers, deck/card selector chips, panels and decorative background follow A. Models/textures/card faces unchanged. Compact bottom triggers remain single-line with 44px minimum height; chip geometry remains compact.
- RoomCard selection uses blush vs mint, with aria-pressed and unchanged callback. CreateRoom headings and checkbox labels use brand ink. Badge palette groups differ instead of all pink. Dropdown options expose selected state and use cream panels. Scroll track uses mint.
- Five gameplay popup shells have explicit game-popup hooks; surrounding panel/background is themed while role/Coin icons and semantic imagery remain intact. Guide navigation/close chrome uses selected puffy sprites; all nine tutorial slides stay original.
- Admin login/forms/panels/headings use the same cream/mint/ink family. No authentication, access-control, analytics or room commands changed.

## Evidence and limits

FE664 tests/62 files pass. TypeScript/ESLint and production build pass. Read-only Chromium147 board QA passes nine viewports (tmp/qa-642988e27c6c48068406edd3bd04cc49/emcoin-board-qa-ua90Zg). Public routes and admin login pass fifteen checks across320/430/1280 widths; report.json and screenshots here. Admin API is intercepted with401 solely for a login screenshot, never submitted. Secondary CTA bitmap/ink and horizontal-overflow assertions are checked. Browser screenshot review caught and repaired excessive selector specificity (secondary CTA was mint) and old admin heading ink. Final compact-trigger sizing follows that review.

Original573-image aggregate remains7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8. Strict inventory587images/missing0/decode0; no source/image bytes changed this turn. Do not interpret historical reskins=0 manifest metadata as a runtime coverage count.

This is an application-wide shared chrome rollout, not a promise that every historical/unused asset was replaced. Protected cards, characters, avatars, roles, Coin, tutorials, logo/sponsor marks/photos stay original by owner scope. Remaining R40 acceptance includes owner visual review, real-device accessibility/contrast, less common game states and unresolved remote-asset rights/usage audit. No deployment or completion of the41-task release plan claimed.
