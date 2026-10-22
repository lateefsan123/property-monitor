# Repeat AI plugin release preparation

## Current state (2026-10-22): corrected package, resubmission blocked

OpenAI rejected version 0.1.0 on 13 October because the plugin name or
description did not meet its quality standards. The live dashboard confirms
`Changes required` and `Not published`; the rejection email gives no more
specific wording feedback.

Version 0.1.1 keeps the Repeat AI display name and changes the subtitle to
`Manage property seller leads`. The description now explains saved seller
contacts, notes/status changes and confirmed individual WhatsApp actions in
plain language. Subscription wording and implementation details were removed
from the public listing. Billing enforcement and the existing confirmation
requirements remain in the unchanged seller-workspace skill and service.

The portable and compatibility manifests match, and the generated legacy
submission JSON was refreshed. The manifests use the existing portal package
identifier `app-6abc34a9bfb8819187668196e47b6952`, as required by upload validation.
The demo recording URL and version-specific release notes are included in the
portable manifest so the new ZIP flow preserves those review materials.

- Corrected upload: `outputs/plugin-review/repeat-ai-0.1.1-resubmission.zip`.
- SHA256: `3c8dcb20f0624474856f98b3956e900d3e3b29633ed3787390e8c6878c686a68`.
- Local checks passed for JSON, matching metadata/versions, published field
  limits, reviewer-case counts, referenced assets/URLs and six-file ZIP integrity.
  Reviewer credentials and the legacy JSON import are excluded from the ZIP.
- OpenAI blocked the corrected ZIP with: `Keep the existing MCP connection` /
  `Configure the existing MCP app before updating its plugin ZIP.`
- The existing MCP pane shows `Configuration unavailable`, `Endpoint unavailable`,
  authentication/domain verification unavailable, and no MCP key. Rescan and
  diagnostics download are disabled; the pane offers no setup or edit control.
- The production service health, advertised OAuth resource metadata, domain
  challenge and privacy page returned HTTP 200. Unauthenticated MCP returned
  HTTP 401 as expected, and the review video returned HTTP 206 with `video/mp4`.
  These public availability checks do not establish authenticated reviewer access.
- No new draft was accepted or submitted, and nothing was published. Existing
  plugin/service configuration and unrelated working-tree changes were preserved.

### Prepared request to the review team (not sent)

> Hello OpenAI review team,
>
> We have addressed the name/description feedback for Repeat AI 0.1.0 in
> version 0.1.1. The display name remains our product brand, Repeat AI. The new
> subtitle is "Manage property seller leads", and the description now explains
> saved seller contacts, follow-up notes and confirmed WhatsApp actions in plain
> language, without subscription wording or implementation details.
>
> We cannot resubmit the corrected ZIP for the existing plugin
> `asdk_app_6abc34a9bfb8819187668196e47b6952`. Upload validation says: "Keep the
> existing MCP connection. Configure the existing MCP app before updating its
> plugin ZIP." The MCP pane shows Configuration unavailable and Endpoint
> unavailable; there is no configuration control, and rescan is disabled.
>
> Our production service and advertised OAuth resource metadata are reachable,
> and the domain challenge and review recording remain available. Please restore
> the existing MCP configuration or provide the supported steps to upload and
> resubmit the corrected package while preserving this plugin and endpoint.
>
> Thank you,
> Lateef Sanusi

## Initial submission (2026-09-30)

The Personal organization is identity verified. Repeat AI 0.1.0 was submitted
under the user-selected lateefsanusi68@gmail.com account. Listing fields,
directory/composer icons, prompts, reviewer tests and the seller-workspace skill are uploaded.
The user completed the final declarations and submission. The live dashboard
confirms "Repeat AI submitted for review" and says a decision notification will
follow. The version is read-only and all six declarations are checked. Approval
and publication are not yet confirmed.

- Draft app: `asdk_app_6abc34a9bfb8819187668196e47b6952`.
- Draft version: `asdk_app_v_6abc34ab3b008191adc45fe66660692e`.
- Verified developer: Lateef Ayomide Sanusi.
- OpenAI's OAuth tool scan succeeded using the isolated reviewer account after
  explicit user approval. All eight current tool justifications were imported.
- The seller-workspace safety scan shows Passed. The directory icon was uploaded
  again and its light/dark previews were verified after the original upload did
  not persist. Release notes are saved. All six final attestations are checked.
- The user approved sharing the isolated test login/password with OpenAI reviewers.
  Credentials and sign-in/sample-data instructions are saved in the secure review
  form; its value is browser-redacted and the credentials issue is cleared.
- The demo recording URL and plugin privacy URL are saved in the submitted version.
- Submission proof: `outputs/plugin-review/submitted-for-review.png`.
- Final service deployment `08de91d3-5e30-4d01-a22a-535fd75fc561` is SUCCESS,
  built from the service-only archive of `b84cbb31`. The public video supports
  HTTP byte ranges (206, video/mp4), and the plugin privacy page returns 200 and
  was visually checked. The video played in Chrome with no media error.
- Demo: `https://seller-signal-mcp-production.up.railway.app/review/repeat-ai-demo-20260929.mp4`.
- Plugin privacy: `https://seller-signal-mcp-production.up.railway.app/privacy`.
  It discloses OpenAI/host sharing, service providers, approval sign-in, the
  ten-minute approval lifetime, deletion controls and external-provider copies.
- The installed ChatGPT `seller signal` plugin has an older seven-tool definition.
  A separate `Repeat AI Review` connection is created and connected to the isolated
  reviewer after explicit approval. Real ChatGPT reads passed. The host does not
  support native MCP form elicitation, so an authenticated browser approval
  fallback was implemented and verified for accepted and declined writes.
- OpenAI shows the MCP domain as verified. The challenge is served from
  `/.well-known/openai-apps-challenge` using `OPENAI_APPS_DOMAIN_CHALLENGE`.
- Railway deployment `50a49879-2e03-4254-9c7c-9e97c1dfd0f2` is SUCCESS,
  from service-only archive of `109df202`. It includes the browser approval
  fallback. Approved notes saved and declined notes did not change, with actual
  ChatGPT readback. The original synthetic notes were restored and verified.
- Six billing/session tests, MCP syntax checks and targeted ESLint passed for
  these changes. The OpenAI rescan confirms the corrected annotations live.
- `scripts/build-plugin-submission.mjs` generates the separate dashboard import
  `plugins/repeat-ai/chatgpt-app-submission.json` with five positive cases and
  three out-of-scope invocation cases. It contains no reviewer credentials.
- Updated listing, test cases, reviewer instructions and skill are saved in the
  dashboard. The updated skill scan passed. Sixteen targeted confirmation,
  browser approval and billing/session tests passed, as did MCP syntax and ESLint.
- Review footage: `services/seller-signal-mcp/public/review-demo.mp4`, 132 seconds,
  H.264, 1920x1080. It combines captured live screens and a live browser recording
  with idle time condensed. Sign-in credentials are omitted. It shows read cases,
  accepted/declined changes and fixture restoration; no WhatsApp send is claimed.
  FFmpeg decoded the entire video without errors and selected frames were inspected.

- Source: `plugins/repeat-ai`.
- Local upload ZIP: `outputs/plugin-review/repeat-ai-0.1.0.zip`.
- ZIP SHA256: `f79cf3c372980d508aa83cb4cdb9f5818f4f27c54252d2a8ce06cbf03d127265`.
- MCP: `https://seller-signal-mcp-production.up.railway.app/mcp`.
- Railway deployment `1d6a4080-f9e0-4ef6-a13c-1ac537b85f07`: SUCCESS,
  built from service-only archive of commit `b4f89efb`.
- Production now uses Supabase OAuth. The fixed-user identity variables are empty
  and insecure development OAuth is disabled. Discovery and PKCE work live.
- Supabase OAuth server and dynamic client registration were enabled after the
  user's confirmation. Consent redirects to `https://repeatai.org/oauth/consent`.
- `get-billing-access` version 5 is deployed with JWT verification preserved.
  Only the shared complimentary-account helper changed in the existing live bundle.

## Branding and package

The existing black-and-white connected-records mark remains the listing icon.
The fox remains the assistant mascot. The original 1254-square PNG is unchanged.

`plugin.json` is the authoritative portable manifest with OpenAI review fields.
`.codex-plugin/plugin.json` is the compatibility manifest. Both MCP configs use
one public endpoint; portable transport is `streamable-http`, compatibility
transport is `http`. The ZIP contains six files and no credentials.

The package describes the eight existing seller and WhatsApp tools. It includes
five positive and three negative review cases. Listing search, spreadsheets,
calendar and email are not exposed by these tools.

## Account and billing behavior

All active tool paths use the app's authenticated billing-access endpoint. It
covers Stripe, App Store, Play Store and explicitly provisioned complimentary
access. Missing identity, expired/sandbox access and billing errors fail closed.
The old fixed-account fallback and subscription bypass no longer grant tool access.
Each request uses its verified token, including after refresh. Supabase's verified
user result supplies the identity; sessions are bound to user and OAuth client.

Three isolated Auth accounts were created, with no real contact details:

- Reviewer `50b2ccdb-5bff-4bd4-a97a-9aa12744fae0`: complimentary access expires
  2026-12-31 at 23:59:59 UTC; Alex Demo at Review Tower, unit 101.
- Isolation fixture `b53185df-f9d2-417b-ac17-e91e84b00186`: complimentary access
  expires 2026-10-06 at 23:59:59 UTC; Jordan Demo at Review Tower, unit 202.
- A separate unpaid fixture has no complimentary grant and receives HTTP 403.

Grants use immutable user IDs, not email or editable profile metadata. The
existing owner's access is unchanged. Reviewer accounts have no connected
WhatsApp accounts or messages. Credentials are stored outside the repository in
`C:/Users/lateef/.codex/private/repeat-ai-plugin/`; enter them only in the secure
review dashboard. Do not include them in plugin files or a public recording.

## Verified

- 23 tests passed for integration OAuth, action/account controls, MCP billing
  denial, and refreshed request tokens. Ten owner/reviewer/mobile-access tests
  also passed. Targeted ESLint, MCP syntax and plugin validation passed.
- Live dynamic registration, PKCE authorization, user-bound consent and token
  exchange passed using isolated accounts.
- Live missing/invalid tokens and ordinary non-OAuth sessions return HTTP 401;
  unpaid OAuth returns HTTP 403, including after the review grants were deployed.
- A real SDK client against production discovered all eight tools and read the
  reviewer account summary, scoped leads, details, and empty WhatsApp accounts/history.
- Declining the native form left notes unchanged. Accepting an add/update persisted
  the synthetic record, with readback. Temporary test data was removed and baseline
  reviewer notes restored after verification.
- Cross-account lead reads and writes failed; another account could not reuse
  the reviewer's MCP session. Customer records were not accessed by these tests.
- WhatsApp sending without a connected account failed closed. No message was sent.
- Public support, privacy and terms URLs returned HTTP 200. This is availability
  evidence, not a completed policy-content review.

The live scripts are `tmp/verify-repeat-plugin-oauth.mjs` and
`tmp/verify-repeat-plugin-live.mjs`. They use private credential fixtures and
must not print tokens/passwords. Rerun only against those isolated accounts.

## Review status and coverage limit

1. Submission is confirmed in the live OpenAI dashboard. Await its review decision.
   Identity verification, OAuth tool scanning, and MCP domain verification are
   complete; the uploaded skill passed scanning.
2. The public demo route plays in Chrome (132.266667 seconds, readyState 4).
   Its URL is saved in the draft. Footage contains only the synthetic workspace.
3. Approval and publication are separate from the completed submission.
4. A reviewer-controlled WhatsApp number is needed before claiming successful
   delivery coverage. No real send test has been performed or represented in the demo.

## References

- https://developers.openai.com/plugins/deploy/submission
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- `services/seller-signal-mcp/README.md`

Unrelated working-tree changes, including the legacy Stripe-only helper edits,
were preserved and excluded from plugin commits and the Railway upload.
