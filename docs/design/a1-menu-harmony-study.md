# Whole-menu Sky–Pink study

Owner rejected the mixed sky/pink/cream menu and approved a single complete menu study before further rollout. frontend-design used to coordinate palette, material and hierarchy, following the owner's puffy A1 choice rather than introducing a new visual anchor.

Preview: `/qa-menu-studies.html?variant=a1&direction=sky-pink&context=home` or `context=room`. Existing A1/A2/A3 studies and current production menu remain unchanged. `GameMenuModal.visualStyle` is opt-in; study-only CSS is imported by the development fixture, not the production application.

Sky blue is the ordinary-action family; pink highlights the title and 3D entry. Guide and support no longer introduce cream/yellow or extra pink actions. Frame reuses the existing sky A1 panel bitmap. MỚI badge is a restrained pale-pink live-text label with a subtle bevel, not a stretched button bitmap. Focus starts at the non-interactive panel without an initial action ring; Tab still reaches controls and retains focus-visible outlines. Escape/close/pending/quit confirmation behavior is preserved. Short-view-height controls are compact; shorter menus scroll inside the frame. Cards, role/Coin colors and image files are untouched. No imagegen, new raster assets, deployment or global palette migration.

Verification: 16 targeted menu/modal/lifecycle tests pass, TypeScript and ESLint pass. Ten browser cases cover Home/room at320×400,320×568,430×932,1280×900,844×390; action artwork, button reachability, close and horizontal overflow checks pass. Screenshots: `menu-harmony-qa/`. Local fixture QA, not physical-device certification or owner visual approval. Wider rollout awaits review.
