# A1 Sky–Pink correction

Owner direction: blue–pink inspired by the extracted About source, not mint/green. Keep puffy A1 controls and protected card imagery. Legacy theme key `mint-blush` remains for compatibility; its current display name is A1 Sky–Pink.

Palette: sky #BFEAF1 / #D9F7FB; pink #F0BCCB / #FAE5EC; cool surface #F7FCFF; About blue #245F8F; small/control ink #20557F for at least 4.5:1 contrast on solid palette backgrounds. Raster shading must still be visually reviewed.

Imagegen skill used for four color-edit assets. Original generated files remain unmodified. Runtime derivatives are resized/compressed only by `fe/scripts/prepare-sky-pink.mjs` (Sharp), with no procedural hue editing.

## pill

Saved generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-efa0c8fc-7c1c-41b3-a15c-3af2404aff3f.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/buttons/themes/sky-pink-a1/pill-sky.png

Prompt:

Use case: precise-object-edit. Input image is the edit target, an approved EmCoin A1 UI asset. Change colors only; preserve its exact silhouette, proportions, puffy bevel, highlights, shading placement, framing and clean blank center. No text, no icons, no cards, no logos, no new objects, no bean-shaped notch. Shift mint/green to soft sky BLUE, not green, teal-green or violet. Palette inspired by original About: #BFEAF1/#D9F7FB highlights, readable medium sky-blue rim around #659DC4, blue shadows around #39769E. Output one asset, not a sheet. Asset: single horizontal puffy pill button. Preserve ~260:99 aspect ratio, transparent corner background and exact broad convex upper/lower contour. Sky-blue central fill around #B8DEF2.

## circle

Saved generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-49b6b04d-f912-47c3-a518-8ecb5c5187a5.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/buttons/themes/sky-pink-a1/circle-sky.png

Prompt:

Use case: precise-object-edit. Input image is the edit target, an approved EmCoin A1 UI asset. Change colors only; preserve its exact silhouette, proportions, puffy bevel, highlights, shading placement, framing and clean blank center. No text, no icons, no cards, no logos, no new objects, no bean-shaped notch. Shift mint/green to soft sky BLUE, not green, teal-green or violet. Palette inspired by original About: #BFEAF1/#D9F7FB highlights, readable medium sky-blue rim around #659DC4, blue shadows around #39769E. Output one asset, not a sheet. Asset: single puffy circular button, square canvas, transparent outside circle. Sky-blue fill #B8DEF2. Preserve slight hand-drawn contour.

## table

Saved generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-8eaeb2ca-5629-43c0-8328-371ce38fb962.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/ui/themes/sky-pink-a1/table.webp

Prompt:

Use case: precise-object-edit. Input image is the edit target, an approved EmCoin A1 UI asset. Change colors only; preserve its exact silhouette, proportions, puffy bevel, highlights, shading placement, framing and clean blank center. No text, no icons, no cards, no logos, no new objects, no bean-shaped notch. Shift mint/green to soft sky BLUE, not green, teal-green or violet. Palette inspired by original About: #BFEAF1/#D9F7FB highlights, readable medium sky-blue rim around #659DC4, blue shadows around #39769E. Output one asset, not a sheet. Asset: tall rounded rectangle puffy panel frame 3:4 ratio. Preserve alpha outside. Change green rim to blue #B8DEF2 with #659DC4 shading; change cream inside to almost-white cool #F7FCFF. Preserve broad bevel and slight irregular contour.

## backdrop

Saved generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-27aca430-8dfa-4bc9-8fda-f83243695324.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/ui/themes/sky-pink-a1/backdrop.webp

Prompt:

Use case: precise-object-edit. Input is edit target, tall 9:16 EmCoin soft decorative background. Keep arrangement of existing waves/petals and calm blank middle. Replace ALL sage/mint/green waves with soft sky BLUE #D9F7FB/#BFEAF1/#C7E7F8. Keep pink petals soft #F7C5D8. Replace beige center with cool nearly-white #F7FCFF. No new leaves, objects, words, logos, cards, people or icons. Soft watercolor 2D, bright youthful, low saturation. Opaque portrait background, one asset only.

## Scope and verification

Final local QA: 674 tests / 63 files pass; TypeScript and ESLint pass; production build passes. 135 screen states, 75 scroll-layout cases, 15 public/admin route cases and 4 real-wheel scroll cases pass. Visual inspection includes Home, waiting, give-coins popup and About at 430px width. Small/control ink is #20557F, while original About-blue reference remains #245F8F.

No protected original image replaced or deleted. Original 573-image hash remains `7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8`. New four derivatives total 63,504 bytes. Asset audit: 591 images, zero missing local references, zero decode errors. Cards, Coin colors, role identity colors, avatar artwork, logos and tutorial content are unchanged.

Browser QA is local synthetic fixture QA, not live backend or physical-device acceptance. No deployment, SSH, commit or push performed. R40 release/device/rights gates remain separate.
