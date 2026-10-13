# Owner decision — native identity and independent communication moderation

Owner confirms2026-10-13:

- Package/bundle ID: `cloud.emcoin.app`; prepare native shell, Android first.
- Game-role silence/healing affects gameplay only. Chat/micro moderation is
  separate, controlled by the moderator; healing never clears safety mute/block.
  This supersedes the earlier2026-10-12 game-role communication restriction.
- Previously approved: invitation-only voice, microphone opt-in, mute/block/report,
  no recording or stranger matching; report retention at most7days/admin-only.
- No store account/payment/signing/upload authority inferred from local shell
  implementation. SDK/device/macOS/signing/privacy/provider gates stay explicit.

Native shell foundation must bundle reviewed web assets, retain the existing
guest-session and pending/overlay protections, use HTTPS/WSS, and not register
the web service worker in native WebViews. Native microphone permission and
provider credentials are not enabled until communication implementation/testing.
