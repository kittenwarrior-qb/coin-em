# R01 — Draft ADR: rules version and decision gate

**Status:** Draft — blocked; not an approved game specification.  
**Owner needed:** Product owner + gameplay owner.  
**Created:** 2026-09-09.  
**Decision key:** `rulesVersion: draft-r01-unapproved` (a document label only; it must not be persisted, sent on the wire, or used by tests until approved).

## Purpose and non-decision

This ADR collects contradictory evidence and turns it into owner choices. It does **not** select a ruleset, change code, freeze a card catalog, or define expected business outcomes. The next approved value should be an immutable semantic version (for example, `rules/v1.0.0`) with owner, approval date, migration scope and golden fixtures recorded.

## Evidence of divergent sources

| Subject | Physical/game guide evidence | README/source evidence | Consequence |
|---|---|---|---|
| Player count and facilitator | `game.md:127-145` says 3–8 members and each person receives coins; the physical inventory lists 8 role cards as two groups of four at `game.md:114-116`. | README declares a 16-phase game at `README.md:82-103`; `RoleManager.ts:141-146` defines 5–10 role decks and includes Narrator/Sender. | Owner must state whether narrator is included in the count and whether web beta follows physical or 16-phase flow. |
| Roles and rotation | Guide names two physical role groups only at `game.md:146-149`; it does not specify the web role taxonomy or rotation. | README lists 7 role types at `README.md:105-115`; role code rotates narrator/sender and overwrites `originalRole` at `RoleManager.ts:40-73`. | Base/current-role meaning and whether rotation is lawful are undecided. |
| Phase flow | Physical guide gives story → response/gift → reflection/self-care → end at `game.md:152-178`. | 16 named phases are listed at `README.md:84-103`; current manager loops `reward` to `role-reveal` at `TurnManager.ts:4-20,34-48`. | Do not infer that every physical step maps one-to-one to a web phase. |
| Initial/red coin | Physical guide: yellow equals number of players; each person gets 3 red, and red is retained after gifting at `game.md:142-145,169-170,183-185`. | `RoleManager.ts:114-132` sets red to 3, yellow randomly 5–10, and comments that red resets each round. README says red is received each round at `README.md:117-123`. | Red spending/reset and yellow initialization conflict. |
| Rewards and mute | Physical ending is a score/count ceremony at `game.md:179-195`. | README specifies automatic yellow rewards at `README.md:125-130`; calculator awards immediate/end-round values and uses one found Silencer at `RewardCalculator.ts:4-22,25-45`. | Reward stacking, mute treatment, tie and multi-Silencer semantics are not approved. |
| Privacy and EMPASS | EMPASS/skip right and keeping stories in the circle are explicit at `game.md:201-207`; reflection may remain private at `game.md:171-174`. | README phase list has no stated EMPASS/secret-reflection outcome at `README.md:84-103`. | Contract/UI must not invent skip, disclosure or retention behavior. |
| Card counts | Physical guide says 32 situation, 24 emotion, 12 reflection and 10 self-care cards at `game.md:102-113`. | Both FE/BE constants have 32 situations, 32 emotion IDs, 14 reflection and 15 self-care IDs at `be/src/constants/cards.ts:5-23` and `fe/src/constants/cards.ts:5-23`. | Canonical IDs, front/back pairings and content rights require catalog-owner approval. |

The master plan records the same conflict as a P0 decision gate and identifies the owner questions at `REFACTOR_MASTER_PLAN.md:13,213-217,231`.

## Decisions required

| ID | Owner must choose | Options to review — none is selected | Required approval artifact |
|---|---|---|---|
| OQ-01 | Beta ruleset, count semantics, EMPASS and reflection privacy | A. physical guide as beta baseline; B. existing 16-phase web variant; C. approved hybrid with a written step mapping. For each, state whether 5–10 includes narrator and what skip/private reflection means. | Signed/dated rules version + phase/visibility table. |
| OQ-02 | Multi-Silencer, healing and vote denominator | A. one shared target; B. independent targets; C. another documented resolver. Specify heal scope, ties, zero votes and disconnected players. | Night-action truth table for every applicable size. |
| OQ-03 | Coin lifecycle and reward composition | State red spend/reset/retention, yellow initialization, whether NTG + role rewards stack, and mute eligibility. | Ledger examples with exact before/after values. |
| OQ-04 | Role identity/rotation and Guide capability | A. base role remains fixed; B. role rotates; C. separate narrator/sender assignment from base role. State Guide behavior while muted. | Role/seat table for each size and round. |
| OQ-05 | Rollback boundary after information disclosure | A. no rollback after reveal; B. only same-round pre-reveal; C. other audited boundary. State behavior after gifts/round advance and disclosure warning. | Permitted-boundary table and player-facing warning. |

## Parameterized golden-scenario skeletons

These are test **templates**, not expected outcomes. Populate `approved.*` only after owner approval; tests must reject an absent rulesVersion rather than pick a default.

| Scenario ID | Parameters | Assertions to fill after approval |
|---|---|---|
| `room-size-{n}` | `n ∈ {5,6,7,8,9,10}`, whether narrator counts | role-deck composition, sender/narrator assignment, number of rounds and visibility |
| `round-{n}-roles` | stable seat IDs, base/current-role policy | rotation result, capability projection and secrecy |
| `night-{n}-{case}` | one/two Silencers, same/different target, heal target, disconnected actor, tie/zero vote | accepted intents, resolved targets, mute/protection and rewards |
| `coins-{n}-{case}` | initial red/yellow/green, gift type/amount, NTG/role/mute conditions | validated deltas, operation keys, balances and non-stacking/stacking result |
| `reflection-empass-{case}` | sender chooses share/write/private/skip; recipient class | transition, content visibility and no unintended persistence/broadcast |
| `rollback-{boundary}` | pre/post reveal, pre/post gift, same/new round | accept/reject, compensation and facts that remain disclosed |
| `catalog-{version}` | canonical card IDs/categories/front-back | selection validity, counts, legacy mapping and asset ownership |

## Downstream impact once approved

| Task | Must consume the approved artifact; must not infer it |
|---|---|
| R04 | Versioned phase/capability, action and projection contracts. |
| R06 | Registry transitions, skip/completion, terminal and rollback guards. |
| R12 | Player-count role deck, base/current role and narrator/sender semantics. |
| R13 | Actor-scoped night resolver, healing, ties and disconnect policy. |
| R14 | Coin ledger reason/amount, reward stacking and compensation boundaries. |
| R15 | Canonical catalog/version, counts, ID migration and face-pair evidence. |

## Approval and next step

| Field | Value |
|---|---|
| Product/gameplay owner | _unassigned_ |
| Rules version approved | _not approved_ |
| Approval date | _not approved_ |
| Golden fixture source | _not created; placeholders only_ |
| Migration impact reviewed by R04/R06/R12–R15 owners | _not reviewed_ |

**Next safe action:** product/gameplay owner chooses and signs OQ-01..OQ-05. Only then create concrete golden fixtures and move R01 toward review/ready.

