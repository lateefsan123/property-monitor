# Repeat AI plugin preparation

## Local draft

Source package: `plugins/repeat-ai`. Uses the existing product icon, eight MCP
tools and an onboarding/workflow skill. Includes five positive and three negative
review scenarios. These are planned review cases, not evidence of completed tests.

`plugin.json` is the authoritative portable submission manifest, including
OpenAI's review fields. `.codex-plugin/plugin.json` is a compatibility manifest
accepted by the bundled local validator. OpenAI reads `extensions.com.openai`
from the portable manifest first; keep shared listing text consistent between them.

The existing black-and-white connected-records mark remains the recommended
listing icon for this release. It matches the mobile app and is legible at small
sizes. Repeat the fox remains the assistant mascot. A simplified fox-head mark
could be explored separately; the full suit-and-tie character is better suited
to assistant screens and marketing than a small composer icon.

## Required before upload

- Set the same verified public MCP endpoint in `mcp.json` and `.mcp.json`. The current empty server
  map deliberately makes this an incomplete draft; do not upload it as skills-only.
  OpenAI does not currently allow adding MCP to a published skills-only plugin.
- Confirm production OAuth, account isolation and the deployed subscription gate.
  All eight local service handlers call `assertUserHasSubscription`; it can be
  disabled by `SELLER_SIGNAL_MCP_REQUIRE_SUBSCRIPTION=0`. Production must not use
  that bypass or private development OAuth.
- Verify billing parity. The current MCP gate queries `billing_subscriptions` for
  active/trialing status, `raw.livemode === true`, and a future period end. This
  inspection does not prove Apple/Google entitlements work or that production uses
  this code. Do not advertise mobile subscription compatibility until tested.
- Validate the native confirmation form in actual ChatGPT and Codex clients.
  Existing automated tests use a simulated MCP client. Unsupported hosts fail
  closed and therefore cannot use the three mutating tools.
- Create dedicated sample-data reviewer accounts: eligible subscriber and unpaid
  account. Seed Review Tower plus synthetic WhatsApp history. Do not reuse real
  customer records. Use only a reviewer-controlled recipient for any send test.
- Execute all eight review scenarios and cover all eight tools, including add,
  WhatsApp-account lookup and approved/declined sends; record actual results.
- Provide the reviewer-accessible demo recording URL after recording it. Enter
  credentials only in the secure dashboard, never in this package or repository.
- Verify developer identity, public support/privacy/terms URLs, domain challenge,
  selected category and country availability in the publishing dashboard.
- Resolve required automated findings, then submit. Approval and publication are
  separate steps. Nothing has been uploaded, installed or published by this draft.

## References

- https://developers.openai.com/plugins/deploy/submission
- `services/seller-signal-mcp/README.md`
- `docs/integration-foundation.md`

The service file has pre-existing uncommitted changes; this preparation preserves
them. The draft does not change production billing, OAuth, WhatsApp or app branding.

## Checks performed

- Bundled plugin validator passed for the Codex compatibility manifest.
- Skill validator passed.
- Existing integration-action and confirmation tests passed (9/9).
- `npm run mcp:check` passed.
- Manifest parity, review-case counts, asset paths and PNG dimensions passed.
- Viewed the existing logo and fox artwork; copied the original 1254-square PNG
  without modification. This is a branding recommendation, not an icon usability test.
- No live account/subscription test, review recording, dashboard validation or
  submission was performed. No release ZIP is produced while MCP setup is incomplete.
