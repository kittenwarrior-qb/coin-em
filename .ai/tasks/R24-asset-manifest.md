# R24 Asset manifest

**Priority:** P1  
**Status:** in progress
**Owner:** Codex implementation  
**Reviewer:** Claude audit  
**Dependencies:** R15

## Goal

Manifest from catalog, license/consent record and validation/crop/thumb/cache budget.

Plan revision 2026-10-01: manifest cần hỗ trợ reskin toàn bộ hình ảnh trong R40, gồm cả asset local và URL CDN đang dùng. Mỗi asset có logical ID và mapping cũ/mới để đổi hình mà giữ nguyên card ID, nội dung và semantics; reskin cuối sau gameplay/coin regression.

## Current evidence

Metadata/source/fallback/version asset chưa thống nhất; font/CDN failure còn warning.

## Scope

### Files to read

- `REFACTOR_MASTER_PLAN.md` (backlog, architecture and test sections relevant to R24)
- `.ai/README.md`, `.ai/tasks/INDEX.md`, and dependency task briefs: R15.
- fe/public; fe/src/constants/cardImages.ts; fe/src/utils/cdnUrl.ts; fe/src/hooks/useAssetPreloader.ts; fe/src/components/game/GuideBook.tsx

### Files allowed to change

Chỉ các file/module liệt kê trong “Files to read”, các test/fixture sát task và tài liệu/ADR mới cần thiết; mở rộng phải ghi Plan revision.

### Files explicitly out of scope

Source code, package/lockfile, workflow, Docker, Caddyfile, game.md và README.md ngoài danh sách/ADR đã được phê duyệt; không deploy, tạo tag hay thao tác production.

## State/event/data flow

`canonical catalog → manifest asset records → preload/cache/fallback → rendered approved face`

Do not invent event names, schema fields, phase transitions, card IDs, or rule outcomes; derive them from the approved ADR/contract and current source.

## Acceptance criteria

- [ ] The stated output exists, is versioned or documented where required, and is traceable to current source.
- [ ] All mutations preserve the dependency contract, stable identity/revision boundaries, and recipient-specific secrecy where applicable.
- [ ] Invalid, stale, duplicate, unauthorized, restart, and terminal-state paths are explicitly handled or rejected.
- [ ] Tests cover the backlog test case plus at least one regression case found in current evidence.
- [ ] No unapproved rule, catalog, privacy, retention, production, or release decision is embedded in implementation.

## Test plan

- Add focused unit/contract/integration tests nearest to the changed module; use isolated fixture data, clock, namespace, and server/process where applicable.
- Run the relevant package build, lint, and test scripts plus the explicit backlog scenario for R24.
- Record commands, environment boundaries, failures, and evidence in QA report; do not represent mocked storage/browser as real durability/device evidence.
- For browser, Redis, load, backup, or release tasks, run only the dedicated isolated/staging suite approved by the owner.

## Risks and rollback

- Risk: a partial change can create incompatible clients, stale projections, wrong room state, or a false green test.
- Ship behind an agreed compatibility boundary; preserve an explicit migration/rollback path and immutable audit evidence.
- Roll back with a targeted revert or compatible forward fix after verifying persisted state; never use `git reset --hard` or restore an old snapshot over newer room data.

## Open questions

2026-10-03 owner direction supersedes the historical physical-catalog question: current100webcards are the version reference, with no physical synchronization. Card IP/Rive rights are owner-declared; other asset/font/logo/model provenance remains unverified, not a technical permission to reskin unknown scope. No additional card art or generated fallback is allowed.

Blocked bởi OQ-09: catalog physical và license/consent; không dùng AI asset làm nguồn luật.

## Implementation plan

Plan refinement2026-10-03 — include .github/workflows/ci.yml solely to run the read-only local hash/dimension/manifest validator after FE dependencies install; no publishing, credentials, deployment or runtime cache changes. Runtime preloadAssets.json is an explicit scanner input, not all build-only manifest JSON, so moving exact literals cannot hide missing runtime paths and bulky metadata is not misreported as a rendered reference.

Plan revision2026-10-03 — runtime manifest seam before R40: admit fe/src/assets/assetManifest.json, preloadAssets.json, protectedCardAssets.ts; adjacent read-only fe/scripts/verify-asset-manifest.mjs/policy and tests; existing CardInventory renderer as well as the listed preload hook. Build manifest metadata from the EXACT existing critical/background lists and frozen100webcards, with local SHA256/bytes/decoded dimensions, remote hashes/dimensions explicitly unknown, independent rights status and immutable protected front/back pairing/crop/cache/fallback policy. Keep bulky hash/provenance metadata outside the application bundle; generate a thin same-order/same-URL/tag preload projection consumed by the original hook with its unchanged loading priority/concurrency/retry/timeout/cleanup. Protected runtime face records derive from existing CARD_DATA, never overwrite or mutate catalog/CardData/IDs/URLs/content. CardInventory consumes these records only for its existing catalog cards, retaining the original pair/selection object/FlipCard/layout and existing behavior for unknown input rather than guessing a migration. Validator compares metadata/projection/local bytes and original backend face reference without fetching CDN or writing images/caches. Record fingerprints of original preload lists and all200faces; no artwork, sprite, CSS, reskin, physical catalog or gameplay policy change. Hashes are verification metadata, not a license or CDN delivery claim. Preserve rollback by reverting only manifest plumbing, never room state or card images.

Plan revision 2026-10-03 — conservative protected inventory metadata, no reskin: extend read-only scanner with an adjacent pure scope classifier/tests. Freeze card source references and existing cards/showcase/tutorial/sticker/model namespaces, including ambiguous card-related material rather than declaring it editable. Only known cartoon button/UI sprite namespaces are UI-reskin candidates, all other assets remain review-required; rights stay unverified independently of scope. Add exact200 face records from the frozen100-card engineering baseline, preserving IDs/pairs/URLs, on-demand/no-PWA-cache policy, no invented fallback/crop/license verification. No image/network writes or renderer/catalog mutation; metadata preparation is not runtime manifest or R40 completion.

Plan revision 2026-10-03 — broken unused starter avatar: source usage audit shows AppHeader only belongs to legacy AppLayout, not the current Router. Add `fe/src/components/app-header.tsx` to scope solely to remove its missing `/avatars/shadcn.jpg` AvatarImage request and now-unused imports, retaining its existing fallback (same effective displayed result). Do not add/substitute an unlicensed image, retire the template, change current game/card/site rendering or classify source search as runtime coverage. Run strict inventory check plus FE lint/build/regressions; original asset bytes remain unchanged.

1. Inventory public/CDN assets, current card image maps, preload behavior, font failures and source/license evidence.
2. Wait for OQ-09 approved catalog, front/back pairs and rights; keep unverified assets explicitly quarantined rather than guessed.
3. Define a versioned manifest generated from canonical catalog with source, hash, dimensions, crop, fallback, license/consent and cache fields.
4. Validate manifest against catalog/asset files in CI-safe tooling; make renderer/preloader consume manifest records rather than parallel maps.
5. Add bounded retry/dedup/concurrency and failure states so missing CDN/font/asset degrades to approved fallback without blocking game.
6. Test manifest coverage, missing/corrupt asset, offline CDN, face pairing and cold/warm cache budget; hand character runtime effects to R25.

## Implementation report

### Plan revision and implementation 2026-10-12 — bounded startup/image delivery

Owner authorizes reducing heavy assets and considering external hosting. Scope expands to exact non-card brand controls/style consumers, startup helper/hook, mechanical WebP generation, build-only pruning plugin, adjacent tests and capacity docs. No CDN upload, provider subscription, card reskin or deploy.

17 approved theme PNG masters (30,198,227 bytes) mechanically encoded into WebP (3,606,964 bytes), no resize/crop; exact alpha/dimensions preserved, mean visible-channel error <=3/255. RGB is lossy, not pixel-identical. Four startup Orbit assets now406,310bytes vs4,561,375; Workshop1,373,588 vs8,986,780. Manifest/projection/fingerprint and all runtime CSS/TS consumers updated together; secondary/quiet filename selectors also corrected. 200 protected card-face records unchanged and integrity verifier passes112local checks. Startup preload selects current theme only;106Friends records remain inventoried but are not bulk fetched.

Owned production build removes only17generated PNG copies after checking every WebP hash;17PNG source masters remain recoverable in public. Plugin report lives under FE source so isolated FE Docker context does not depend on sibling docs. Full FE712tests/71files, TS/Vite build and lint pass; full BE617tests/56files pass, including pure communication policy. Brand browser90cases final pass; earlier two CDN inventory failures retained separately. Production startup network checks/evidence tracked in `docs/qa/web-startup-optimization/`; no physical-device, VPS capacity or store approval inferred.

2026-10-04 — versioned asset-manifest/v1 records now cover EXACT78existing preload items (4critical/74background) and200frozen card faces.80local entries (including2local protected fronts) have actual SHA256/bytes/Sharp dimensions; remote face bytes/hash/dimensions stay explicitly null with no CDN fetch. Rights remain unverified independently of scope, no replacement/crop/fallback produced. Thin preloadAssets.json retains original URL/tag/order fingerprint b72675f1a6f547bc9e0ba5f1685bb6e4573383fd49e2fab7fd2685ddd391c87d and original hook's priority/concurrency/retry/timeout/cleanup. Bulky provenance/hash JSON is build/test-only, not imported in app. Immutable runtime protectedCardAssets derives original100CARD_DATA pairs; CardInventory uses unchanged known faces and still sends the original CardData object. Unknown input stays unknown, not aliased/migrated or newly illustrated. Scanner explicitly includes only runtime projection JSON so relocation cannot hide references. Read-only validator PASS4critical/74background/200faces/80local checks; tests/typecheck/full build/browser verification follows separately. No reskin/image/ID/content/domain/physical/PWA-cache change or license/remote-delivery completion claim.

2026-10-03 read-only inventory now includes200 exact face records from frozen100 web baseline and conservative asset scope.139local images protected-card-related,51cartoon button/UI candidates,383review-required. Known card/source namespaces excluded from reskin; protocol-relative/file/javascript URLs cannot become UI candidates. Rights remain independently unverified except truthful owner-declared deck-IP metadata (not license audit), no generated fallback/crop/new image/public-private cache. Two new tests preserve every pair/ID/URL/old baseline object and reject malformed inventory; strict audit exits0, same573image hash. This is preparation metadata, not runtime manifest/rights/R40 completion.

2026-10-03 removed only the missing starter AvatarImage request/unused imports from unused AppHeader; existing fallback retained. No replacement image, template retirement, current-route UI or protected card/asset byte change.

2026-10-02 inventory correction: exclude `src/test` fixtures from production static-reference candidates. A synthetic `/fixture.svg` in a diagnostic regression test was previously reported as a missing runtime image; no asset is added/removed to mask it. Read-only hash inventory still includes every public image. Dynamic runtime references and rights remain unresolved.

2026-10-01 — Plan revision: mở scope fe/scripts/audit-assets.mjs, utils/imagePreload.ts và tests cho inventory/preload. Read-only scanner kiểm 573 ảnh local (~15.5 MB), 142 remote static references; có SHA256/dimensions và mapping newUrl=null/provenance unverified, không suy static search thành runtime coverage. Preloader ưu tiên critical, bounded concurrency/retry/timeout/cancel. Sửa 2 runtime reference thiếu; còn placeholder /avatars/shadcn.jpg trong app-header. Manifest runtime/canonical pairing/license/fallback và reskin chưa xong.

Evidence chung: `docs/qa/2026-10-01-implementation-progress.md`. Không đánh dấu acceptance/done khi các phần còn lại chưa đạt.

## QA report

2026-10-08 — after fresh9case short browser PASS, read-only pinned-Node verify-asset-manifest PASS:80local SHA/byte/dimension checks,200protected catalog faces,4critical/74background references, reskins0. No CDN requests/assets/cache writes; remote content and rights remain unverified, not a new full573-image inventory or rights certification. Runtime/card mappings/package locks unchanged.

2026-10-04 — Main FE53files568testsPASS18.52s, ESLint0warnings/TypeScript/Vite19.71sPASS. Read-only manifest verifier PASS4critical/74background/200protectedfaces/80local hash-and-decoded-metadata records. Strict complete inventory retains573images/15,516,248bytes/content hash7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8,280static/142remote references,0missing/0decode/0reskins. Current copied clean ZCZ7v4 passes all9commands BE545/FE568 on pinned WindowsNode22.23.3/npm10.9.9/unchanged locks, before subsequent R30-only fixture additions. Remote bytes/rights remain explicitly unverified; this is not full asset license/device/reskin acceptance.

2026-10-03 strict read-only `node scripts/audit-assets.mjs --check` now exits0:573images/15,516,248bytes, original aggregate hash `7b15602886af3ba3832197fe99706792e56c82ffcb0a4bc6c1153800b5502ff8`,280 static candidates/142 remote, zero missing local references/decode errors, zero reskins. Static/dynamic/runtime/provenance limitations remain; this is not full manifest/runtime or asset-rights acceptance.

<!-- QA owner records environment, test matrix, failures, visual/device evidence and final result. -->

## Audit report

<!-- Reviewer records independent findings, unresolved risks, and approval/rework decision. -->

## Decision log

<!-- Link approved ADR/owner decisions here; do not replace an unresolved decision with an implementation assumption. -->
