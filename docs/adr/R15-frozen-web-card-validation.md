# R15 — frozen current-web card validation

Engineering reference: `web-card-baseline/v1`. This does not declare the web deck canonical for the physical product and does not authorize rewriting any card art, content or face pair.

The read-only extractor executes the current trusted local CARD_DATA builder and CDN URL transforms. The checked-in reference contains 100 exact cards. Tests compare all runtime entries and protect card-image/CDN source hashes. CardInventory UI-only changes may update its source hash without changing card data; any actual data change requires reviewed reference revision, not automatic runtime acceptance.

Client ID resolves into a detached server copy. Optional claimed category must agree. Known raw TH/BK/PT/VT IDs are syntax aliases from existing constants; no inferred emotion/physical/sample-ID aliases. Arbitrary URLs and payload extras never enter new selection state, logs or broadcasts. Phase, actor, enabled groups, current-round duplication and max-three reflections are checked in server commands as well as dispatch validation. Preview/fan relays also resolve known enabled situation cards.

2026-10-03 client continuation: select_card and optional night cardData now send the already-supported `{id}` object only; situation preview/fan relays use the same shape, preserving null/undefined/positions. The pure client helper copies only an own string ID, does not consult a catalog or normalize aliases; unsupported inputs remain invalid requests for the server. Existing full-object/direct-client category checks remain server-side. Full original client CardData/catalog/front-back assets remain unchanged and server responses restore canonical metadata. Any eventual rollout requires the compatible frozen-card resolver before/matched with the ID-only client; no deploy is authorized here. This is not a generic durable receipt or physical-deck mapping.

RoomView resolves known persisted cards and allowlists selection log fields without mutating storage. Unknown legacy selections require review and are not migrated or shown as trusted content. Strict primary failure still publishes no selection. Existing timer/queue/session invariants remain.

Regression found during R18: finite-cycle previousTurn preserves audit logs, so counting all historical selections falsely blocked reselection. The validator now counts only active selections after relevant existing PHASE_CHANGED/direction=previous markers and current-round boundaries. Logs and ledger remain unchanged; three real engine rollback/reselection regressions pass, preserving coins. This is not a new rollback permission.

Evidence: CardCatalog 25 tests and isolated registered-handler loopback 4 tests; full backend 38 files / 467 tests. Storage in Vitest is mocked. No network card-byte verification, physical mapping, migration or browser QA is implied. Rollback is a reviewed targeted code revert/compatible forward fix; never overwrite newer room data.
