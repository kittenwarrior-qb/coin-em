# A1 contour correction — 2026-10-10

REJECTED / INACTIVE: Owner requested rollback to the prior puffy A1. These source/derivative files are retained only as historical experiments; no active pill mapping or badge uses them.

Owner feedback: smooth capsules lost the old skin's uneven, plump character. frontend-design coordinates the selected A1 palette and live-text surfaces; imagegen precise-object-edit changes raster contours, then creates three hue siblings. The owner selected A1, not yet these new contours. "Newly approved" in the hue prompts below is prompt wording, not a record of human approval.

Input: inspected docs/design/theme-a-v2-source/pill-mint.png. Mint edit then serves as the input for the other three edits. Built-in image generation; no CLI, API key or manual raster painting. Four source PNGs here are immutable copies. Generated output identifiers: mint exec-53c036bb-b41e-4c2b-bc6a-c13a074005eb; blush exec-bf5f2235-3122-484f-89cf-fc84d909193c; cream exec-4371b438-c028-4e5c-9714-312479ff7e91; blush-soft exec-fda1a772-bcdf-4442-8649-84d9e51aa72d. Native outputs live under C:/Users/Admin/.codex/generated_images/01a08442-593a-7802-9384-4356a960c79b/ with those identifiers plus .png.

prepare-theme-a-organic.mjs only trims, resizes and encodes. Versioned production copies: fe/public/cartoon/buttons/themes/mint-blush-organic-v1/pill-{mint,blush,cream,blush-soft}.png. 260×99 RGBA. Closely matched shape/lighting, not pixel-identical. Existing variants and all protected art retained.

SHA256 / bytes:

- mint: 8f30527bedb0799cf26cd5855ba8b85335d6d0299b28eafe0b975d1e01c31862 / 34000
- blush: 8b857b6f380347a397cd0e3f40115dfcaf944204dddb103a610c3c1f12dd94e3 / 32659
- cream: 1fbfcf633f5896f6952cfbf645b521708550d92c3fe3d5b43a9af0914bbb1690 / 29629
- blush-soft: 69fba908ad37e0b48d4fe26a10ab664fe31ed1a53d7b2e3902711b117ab73c7c / 26715

Total 123003 bytes. Alpha contour check at x=65/130/195 returns top y=0/12/5 (cream 0/12/6), proving a central dip rather than an ellipse. Transparent corners, dimensions and size budget verified. Pill badges and the menu title reuse the soft-blush sprite behind live labels, without clipping hitboxes. Round icon buttons retain v2 sprites; no claim that every surface is now irregular.

### mint

Use case: precise-object-edit. Input image is the edit target: existing mint EmCoin UI button. PRIMARY CHANGE: replace its mathematically smooth symmetric capsule silhouette with a visibly hand-shaped gently lumpy cartoon button. Keep mint palette, plump inflated body, thick lower lip, broad clean label area, upper-left curved highlight and tiny upper-right highlight, front-facing 2.6:1 approximate proportions and transparent alpha. Shape MUST visibly change: top edge has TWO very broad unequal soft bulges separated by a shallow dip about 6 percent of total button height; bottom edge has an off-center gentle upward dent and a heavier drooping lower-left shoulder; left end is fuller and slightly higher, right end is a little narrower and lower. No ruler-straight parallel edges, no perfect ellipse, no equal corner radii, no bilateral symmetry. Think softly hand-moulded inflated clay gummy: understated but obvious irregular contour when displayed 210px wide. NO ripples across the label area; only silhouette and rim follow the irregular contour. No scalloped cookie, jagged edge, spikes, melted drips, extreme banana bend or random noise. Keep youthful polished 2D painted game sprite, not realistic plastic. ONE blank button, no text/icons/cards/coins/characters/extra objects/background. Truly transparent alpha.

### blush

Use case: precise-object-edit. Input is the edit target, the newly approved irregular mint EmCoin blank button. Change ONLY color. Preserve EXACTLY its visible double-bulged top with central shallow dip, off-center lower-edge dent, heavier left shoulder, unequal ends, outline/rim contours, puffy shading, two highlights and transparent background. Do NOT smooth it into a perfect capsule or ellipse. Same framing, single sprite, no text/icons/extra elements. Body #F0BCCB, highlight #FAE5EC, rim #CB87A0, outline #9A5D73.

### cream

Use case: precise-object-edit. Input is the edit target, the newly approved irregular mint EmCoin blank button. Change ONLY color. Preserve EXACTLY its visible double-bulged top with central shallow dip, off-center lower-edge dent, heavier left shoulder, unequal ends, outline/rim contours, puffy shading, two highlights and transparent background. Do NOT smooth it into a perfect capsule or ellipse. Same framing, single sprite, no text/icons/extra elements. Body warm cream #F3E9D2, highlight #FFF9E8, rim sage #A7B69C, outline #82967A.

### blush-soft

Use case: precise-object-edit. Input is the edit target, the newly approved irregular mint EmCoin blank button. Change ONLY color. Preserve EXACTLY its visible double-bulged top with central shallow dip, off-center lower-edge dent, heavier left shoulder, unequal ends, outline/rim contours, puffy shading, two highlights and transparent background. Do NOT smooth it into a perfect capsule or ellipse. Same framing, single sprite, no text/icons/extra elements. Body very pale blush #F7E3EB, highlights #FFF4F8, rim #DAB9C7, outline #B38B9D. Gentler color contrast, SAME volume.
