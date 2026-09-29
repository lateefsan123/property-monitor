# Repeat AI plugin release preparation

## Current state (2026-09-29)

The Personal organization is identity verified. A Repeat AI 0.1.0 draft has been
created under the user-selected lateefsanusi68@gmail.com account. Listing fields,
directory/composer icons, prompts, reviewer tests and the seller-workspace skill are uploaded.
Nothing has been submitted, approved, or published.

- Draft app: `asdk_app_6abc34a9bfb8819187668196e47b6952`.
- Draft version: `asdk_app_v_6abc34ab3b008191adc45fe66660692e`.
- Verified developer: Lateef Ayomide Sanusi.
- OpenAI's OAuth tool scan succeeded using the isolated reviewer account after
  explicit user approval. All eight current tool justifications were imported.
- The seller-workspace safety scan shows Passed. The directory icon was uploaded
  again and its light/dark previews were verified after the original upload did
  not persist. Release notes are saved. All six final attestations remain unchecked.
- The user approved sharing the isolated test login/password with OpenAI reviewers.
  Credentials and sign-in/sample-data instructions are saved in the secure review
  form; its value is browser-redacted and the credentials issue is cleared.
- The remaining dashboard issues are a required demo recording URL and unchecked
  final declarations. No legal attestations have been accepted.
- The installed ChatGPT `seller signal` plugin has an older seven-tool definition.
  A separate `Repeat AI Review` MCP connection form is prepared for the current
  endpoint, awaiting permission to create/connect the isolated test workspace.
- OpenAI shows the MCP domain as verified. The challenge is served from
  `/.well-known/openai-apps-challenge` using `OPENAI_APPS_DOMAIN_CHALLENGE`.
- Latest Railway deployment `2b2ef833-4a98-4609-b998-b572401583ac` is SUCCESS,
  from service-only archive of `d57f6de5`. It includes the challenge route and
  corrected destructive/open-world annotations. The endpoint returned HTTP 200
  with the exact expected token and text/plain content type.
- Six billing/session tests, MCP syntax checks and targeted ESLint passed for
  these changes. The OpenAI rescan confirms the corrected annotations live.
- `scripts/build-plugin-submission.mjs` generates the separate dashboard import
  `plugins/repeat-ai/chatgpt-app-submission.json` with five positive cases and
  three out-of-scope invocation cases. It contains no reviewer credentials.

- Source: `plugins/repeat-ai`.
- Local upload ZIP: `outputs/plugin-review/repeat-ai-0.1.0.zip`.
- ZIP SHA256: `05b723a1e353103c21dee2dea39876eccc7e42e65a390630568133a88afd716f`.
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

## Remaining before submission

1. Complete final attestations after reviewing the finished demo and submission.
   Identity verification, draft creation, OAuth tool scanning, and MCP domain
   verification are complete; the uploaded skill passed scanning.
2. Verify the confirmation experience in real ChatGPT/Codex UI. Live SDK protocol
   tests do not establish that those hosts render and accept the form correctly.
3. Connect a reviewer-controlled WhatsApp test number before claiming successful
   delivery coverage. No real send test has been performed.
4. Record a reviewer-accessible demo of the actual host flow, add secure review
   credentials and any required video URL, and verify developer/domain settings.
5. Upload the ZIP, resolve dashboard findings, and complete required attestations
   before submitting. Approval and publication are separate from submission.

## References

- https://developers.openai.com/plugins/deploy/submission
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- `services/seller-signal-mcp/README.md`

Unrelated working-tree changes, including the legacy Stripe-only helper edits,
were preserved and excluded from plugin commits and the Railway upload.
