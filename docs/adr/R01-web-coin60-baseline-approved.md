# R01 — Approved web/60-Coin baseline

Status: approved baseline, 2026-10-01. Owner: project owner, confirmation “đúng” in this chat.
Runtime version: `web-16-coin60/v1`; coin ledger version: `coin-cycle-60/v1`.

## Decision

Keep existing web rules for role assignment, night actions, rotation and manual narrator progression. Apply the owner's 20 red / 20 green / 20 yellow allocation and round collection rules. Received coins are recorded appreciation, not spendable again. Reject previous-phase after any gift or round collection. No additional automatic coin rewards. This supersedes the temporary-policy label in earlier implementation notes.

## Executable baseline

5–10 seats include narrator and sender; totalRounds equals seat count. Narrator and sender are distinct. Existing deck: 5 seats = Narrator, Sender, Silencer, Connector, Opener; 6 adds Guide; 7 adds Healer; 8 adds second Silencer; 9 adds second Connector; 10 adds second Opener. Preserve circular narrator/sender rotation and current displacement of non-public roles, without redefining originalRole as an immutable base-role field.

Phase sequence: role-reveal → night → healer-turn → silencer-turn → situation-card → emotion-card → story-telling → group-response → reflection-card → reflection-sharing → selfcare-card → hug-action → guess-silencer → reveal-silencer → give-coins → reward. Skip healer-turn if no Healer. Reward advances to the next round; final reward ends the game. No new phase timer or automatic skip is enabled by this approval.

Existing night behavior is frozen, not silently replaced with independent multi-Silencer targets or a new vote/tie resolver. Preserve the existing shared night-action slot and current target restrictions while characterization/security work proceeds. Any different night outcome requires a separate explicit rule change. Approval of the baseline does not certify that legacy code is bug-free.

## Compatibility and limits

New games use this baseline. Existing unversioned active rooms and explicit legacy/v0 fixtures keep old compatibility; do not rewrite persisted historical games. Coin tests cover counts 5–10 and full recorded round histories. Follow-up tests must freeze deck/rotation, applicable transitions and terminal/rollback boundaries.

This approval does not approve a different physical-card catalog, content rights, EMPASS/private reflection features, retention/deletion policy, disclosure to other recipients, production deployment, signing or store submission. These decisions remain separately scoped; do not reopen the approved baseline merely because other product questions remain.
