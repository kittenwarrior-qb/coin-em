# A1 compact pills and contrast — 2026-10-10

Owner asks for consistent pills and clearer interface contrast. frontend-design used with the owner's existing Sky–Pink puffy A1 direction; no new visual anchor or bitmap generation. Existing approved sprites are reused. No protected artwork or Coin/role identity palette change.

## Implementation

Shared compact pill rendering covers badge, button MỚI badge, new-badge, explicit Host/Quản trò labels, phase status/countdown, inventory tabs, room selection, dropdown triggers, public catalog chips/tabs and support navigation. Full-height endcaps use horizontal three-slicing (`border-image-slice: 0 80 fill`) instead of stretching the complete button or nine-slicing its top/bottom into square corners. Small badges use 12px endcaps; other compact controls use24px; wide room selectors use32px. Selected backgrounds are cleared to prevent a flat rectangular underlay. The existing large-button renderer and semantic role/Coin/card tags remain separate.

Contrast tokens: main blue #20557F, secondary ink #45627C, field edge #5B83A3, accent text #873D5A. Inputs use opaque white plus 2px edges; placeholders no longer use the pale blue. Waiting labels and selected state cues are stronger. Selected inventory/catalog tabs have an underline as well as pink material. Disabled large controls use70% opacity rather than50%; they stay disabled. Card imagery, avatar identities, role/Coin colors and interactions are unchanged.

## Evidence

675 frontend tests /63 files pass, including foreground >=4.5:1 and field-edge >=3:1 on solid light brand backgrounds. Browser measurement via `e2e/scripts/check-pill-contrast.mjs` checks320/430/1280px: join-room fields have text7.87:1, placeholder6.38:1 and edge4.02:1 against white. Also verifies seven catalog tabs use three-sliced artwork without rectangular background underlays, plus an underline on selected tabs. These are targeted measurements, not a blanket accessibility certification: raster shading, role semantics, disabled/animated surfaces and physical-device acceptance require separate review.

Public/admin15-case QA and75 scroll-layout cases pass. Final135-state screen rerun passes and is recorded in `a1-screen-qa/report.json`. Initial nine-slice attempt and background-priority defect were corrected after visual/browser checks. One later full run had a fixture-load timeout during a long production build; the retry passed after the build completed. Production build, TypeScript and ESLint pass. No deploy/SSH/commit/push.
