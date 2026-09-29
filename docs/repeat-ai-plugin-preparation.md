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

- The public MCP endpoint is configured in both manifests. The portable format uses
  `streamable-http`; the Codex compatibility format uses `http`.
- Complete production OAuth before upload. Live inspection on 2026-09-29 found
  Railway health reporting `dev-oauth` and Supabase discovery returning
  `feature_disabled`. The OAuth settings are prepared in the dashboard but are
  not saved; dynamic registration awaits the user's confirmation.
- Deploy and verify the billing changes. The local MCP now calls the same
  authenticated `get-billing-access` endpoint as the app, covering Stripe,
  App Store, Play Store, and the existing fixed-ID complimentary access rule.
  Missing identity, sandbox/expired subscriptions and billing errors fail closed.
  Fixed-account identity fallback and the subscription bypass are removed from
  the active tool path. OAuth identity comes from Supabase's verified user result.
  Each MCP request uses its current verified token after refresh.
- Confirm the publishing account on the OpenAI sign-in page. No account has been
  selected, and no package has been uploaded or submitted.
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
them. Local service changes are not yet deployed. Production billing, OAuth, WhatsApp and app branding have not been changed by this work.

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

## Production preparation checkpoint (2026-09-29)

- Confirmed Railway CLI is authenticated and the existing MCP service is reachable.
- 23 automated tests passed across integration OAuth, action approval/account
  isolation, and the new MCP billing/refresh cases. These use controlled test data;
  they are not a substitute for the pending live OAuth and client acceptance tests.
- Targeted ESLint and plugin validation passed. MCP syntax checks passed.
- Existing uncommitted edits to the legacy Stripe-only helper are preserved and
  excluded from this checkpoint's commit.
- Remaining: save approved OAuth configuration, deploy the scoped MCP service,
  run live paid/unpaid and cross-account tests, verify actual host confirmations,
  prepare review accounts/recording, upload, resolve dashboard findings and submit.
