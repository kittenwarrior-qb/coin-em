# R21 — centered mobile-first shell

2026-10-02 owner chose “Giữ mobile-first, co giãn và nằm giữa desktop (Khuyến nghị)”. Preserve the existing player placement, cartoon visual direction and all card imagery/content; no separate wide desktop layout.

Shell fits viewport width, capped at 430px, centered on desktop and uses dynamic viewport height. Safe-area insets reserve shell/HUD/modal space. At low viewport heights (including keyboard-like viewport shrink), only the board scrolls; readable 64px avatars remain and all ten slots are reachable. Simultaneous visibility of ten readable avatars on a 390px-high viewport is not claimed. Board labels in side columns wrap within their existing 80px slot; top/bottom curved labels stay. No role visibility or card rendering policy changes.

Coin sheet is bounded to shell height, with fixed close header and scrollable controls/body. Close and increment/decrement targets are 44px. Other overlays/focus/reduced motion and broader target accessibility remain R23 work.

QA uses a clearly labelled dev-only synthetic page with no socket/session/storage, a private loopback Vite child and existing headless Chromium. Default production build excludes the fixture HTML and does not import its module. Report/screenshot temporary paths are recorded in QA, not evidence of physical mobile keyboard, safe-area hardware or Safari. No backend connection, external account or production operation is involved.
