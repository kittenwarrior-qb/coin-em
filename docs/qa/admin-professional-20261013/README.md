# Professional admin workspace — 2026-10-13

Frontend source: `121cc07c39fdee8c917a437d0dbe4a772d83854c`.

The refinement targets hierarchy and information density, not card art or gameplay rules. The frontend-design skill informed the single-header grid and bounded editor; the owner's existing Orbit/Workshop theme accents take precedence over changing the brand palette.

- One section title in a compact topbar; refresh/logout are global controls. Scope/privacy information is retained in the sidebar disclosure.
- Narrower contiguous sidebar and neutral surfaces. Catalog actions stay with the catalog; adding a card does not write until explicitly saved.
- Desktop catalog rows occupy more than half the viewport height in browser assertions. Search, headings and footer remain stationary while 80 records scroll.
- Card name/code head the detail view. Fields use a bounded reading width alongside paired previews; invalid/missing URLs have explicit empty states. Save/back retain draft, retry and navigation safety behavior.
- Account settings are arranged side-by-side where space permits; Analytics/Data panels have readable maximum widths.
- Desktop PWA notices move into the sidebar without altering worker activation or room-safety votes.

Local verification: 751 FE tests/78 files passed, focused admin tests passed, lint and production builds passed. Production browser QA passed at 320, 390, 1280, 1366×768, 1920 and 3840px. Tests verify the existing VT-001 editor (not the add-card button), header adjacency, viewport bounds, fixed catalog controls, panel switching, pending Back/Escape and same-ID retry. Screenshots inspected for catalog/detail/account.

Live read-only verification is recorded in `report.json`. No catalog saves, activation, password changes or user-room mutations are part of the visual smoke check. The isolated live browser deliberately blocks service workers, so its offline-guidance notification is used to verify sidebar geometry, not to assert a production worker failure. Browser QA also reproduces the old independent CSS translate utility and verifies that the notice stays entirely within the 208px sidebar.
