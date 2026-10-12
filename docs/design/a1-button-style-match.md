# A1 button family matching — 2026-10-10

Owner spotted inconsistent button styles: sky had straighter edges/sharper outline, while blush had a softer convex shape. Keep approved puffy A1 pink as reference, not the rejected irregular bean shape. frontend-design guides consistent silhouette/material; imagegen built-in edit produces a closer blue sibling. This is visually matched art, not a pixel-identical recolor.

Edit target: D:/Desktop/coinem/fe/public/cartoon/buttons/themes/mint-blush-v2/pill-blush.png

Generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-7cf1d932-f966-45ae-9dc8-3492947259f4.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/buttons/themes/sky-pink-a1/pill-sky-v2.png

Downsized/compressed via fe/scripts/prepare-sky-pink.mjs. Previous sky sprite retained, no destructive overwrite. Shared control registry and shared CSS pill backgrounds consume the new asset, including Home, room selectors, badges and native route controls. Saturated pink and circle assets remain unchanged. Cream and blush-soft also get new siblings referenced through the same registry; old versions remain available. No card or gameplay change.

## Exact built-in edit prompt

Use case: precise-object-edit. Input image is the ONLY edit target: EmCoin's approved pink puffy A1 pill button, blank and transparent. Make its sky-blue color sibling by changing ONLY pink hues to soft sky blue. Keep the same curved bulging top and bottom, soft slightly uneven hand-drawn outline, rounded ends, border thickness, darker lower bevel, broad upper-left translucent shine and tiny upper-right white shine. It must look like the EXACT SAME button mold as the pink original, not a straight-sided rounded rectangle. Preserve its wide approximately 260:99 canvas/aspect ratio and full silhouette occupying nearly the full canvas. Blue central fill #B8DEF2, highlights #D9F7FB, shadow/edge medium blue #659DC4 with soft darker bevel #39769E. No text, no icon, no extra glow, no new geometry, no flatter top, no uniform capsule. Transparent outside the single pill.

## Verification

Runtime dimensions: 260 × 99, alpha PNG. Original573-image guard and full asset inventory checked. Browser fixture results are local synthetic QA, not live backend/device certification. No deploy, commit or push.

Final QA after all three replacements: 674 frontend tests / 63 files pass; TypeScript, ESLint and production build pass. 135 screen cases, 75 scroll-layout cases and 15 public/admin route cases pass. Runtime594-image inventory has zero missing references and zero decode errors; original573 hash unchanged. Visual inspection of final Home and room-selection popup screenshots confirms a closer curved/beveled pill family. Exact pixel identity is not guaranteed by generated edits. New runtime derivatives total26,533 bytes.

## Additional matched siblings

### cream

Generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-3c174f03-40cb-4677-9233-bb7f6837ca7f.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/buttons/themes/sky-pink-a1/pill-cream-v2.png

Exact prompt:

Use case: precise-object-edit. The sole input is edit target: approved EmCoin pink A1 puffy pill. Create a color sibling, changing ONLY palette, not the mold. Preserve its softly convex bulging top and bottom, rounded ends, slight hand-drawn asymmetry, full-width roughly 260:99 framing, same upper-left broad translucent highlight and tiny upper-right shine, same bevel depth and darker lower edge. NOT a straight-sided rounded rectangle or perfect capsule. Single blank pill, no text/icons/new elements, transparent outside. Warm neutral cream fill #FFF6E6, soft beige edge #B8AB8D, cream highlight #FFFCF4, beige lower bevel #C8BBA0. No green or sage tint.

### blush-soft

Generated original: C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/exec-48cb750b-b11d-4b7c-87a2-d1a7670c9813.png

Runtime: D:/Desktop/coinem/fe/public/cartoon/buttons/themes/sky-pink-a1/pill-blush-soft-v2.png

Exact prompt:

Use case: precise-object-edit. The sole input is edit target: approved EmCoin pink A1 puffy pill. Create a color sibling, changing ONLY palette, not the mold. Preserve its softly convex bulging top and bottom, rounded ends, slight hand-drawn asymmetry, full-width roughly 260:99 framing, same upper-left broad translucent highlight and tiny upper-right shine, same bevel depth and darker lower edge. NOT a straight-sided rounded rectangle or perfect capsule. Single blank pill, no text/icons/new elements, transparent outside. Pale blush fill #FAE5EC, blush rim #C995AA, shine #FFFAFC and deeper pink bevel #D9AFBF. Softer/lighter than original saturated pink.
