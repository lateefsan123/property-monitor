# Provider connection implementation checkpoint

`server/integration-oauth.js` implements the server-side authorization flow for Google
and Microsoft, with a separate opt-in permission set for sheets, calendar and email.
This checkpoint requests read-only data access. Sending email, creating calendar events,
and editing files will require separately requested permissions and action approval.

Implemented: PKCE, random 10-minute state, strict provider allowlist, fixed configured
redirect URIs, one-use state contract, time-bounded token exchange, permission checks,
and AES-256-GCM token encryption bound to user/provider/feature. Tokens never appear in
the returned browser response. No retry is performed after a failed code exchange.

## Connection management implemented

- `POST /api/integrations` handles status, begin, complete and disconnect. Every
  operation verifies the bearer session with Supabase `auth.getUser`; request bodies
  cannot supply an owner. Responses are non-cacheable and contain no provider tokens.
- `server/integration-store.js` persists encrypted records using a server-only client.
  The migration creates RLS-enabled tables with no browser-role access and an atomic,
  service-role-only state-consumption function. Applied to the Repeat AI database on
  2026-09-21; catalog checks confirm RLS and server-only table/function privileges.
- Settings → Integrations lists six provider/feature connections, error/retry states
  and disabled setup states. No connection is simulated in the actual Settings panel.
- `/integrations/callback/google` and `/integrations/callback/microsoft` finish consent
  using the existing Repeat AI session. Query parameters are removed from history;
  React StrictMode does not duplicate the code exchange. Sign in before connecting.
- Disconnect deletes Repeat AI's stored connection; it does NOT revoke the provider's
  account-wide grant. The confirmation explains where to remove that grant as well.
- Vite serves the same endpoint locally via `integration-dev-plugin.js`.

## Read-only data access implemented

`POST /api/integrations` also accepts `action: "read"`, `provider`, `feature`, and
optional `input`. Identity still comes exclusively from the verified bearer session.
This is a backend endpoint, not yet a visible inbox/calendar/import screen or AI tool.

| Provider / feature | Current read result | Input |
| --- | --- | --- |
| Google / email | Up to 10 inbox message headers and snippets | `{}` |
| Microsoft / email | Up to 10 inbox message previews | `{}` |
| Either / calendar | Up to 10 events in the next 30 days | `{}` |
| Google / sheets | Selected sheet preview, at most 100 rows × 26 columns | `{ "spreadsheetId": "...", "sheetName": "optional tab name" }` |
| Microsoft / sheets | Up to 10 OneDrive child files/folders, no file contents | `{ "folderId": "optional folder ID" }` |

The Microsoft workbook range API requires `Files.ReadWrite`, even for GET requests.
The current connection requests only `Files.Read`; this implementation deliberately
does not broaden permissions. A download-and-parse import flow or separately consented
workbook permissions remains future work. See
[Microsoft's permission table](https://learn.microsoft.com/en-us/graph/api/worksheet-range?view=graph-rest-1.0).

Token refresh happens on demand, one minute before expiry. Rotated tokens are encrypted
and updated only if the original ciphertext still matches. A deleted connection is never
upserted during refresh. Concurrent requests share a refresh within one server process;
cross-instance conflicts reread the winner instead of overwriting it. This is not a
distributed refresh lock. Missing scopes or rejected credentials fail closed.

Read adapters use fixed HTTPS endpoints, reject redirects, never follow provider-supplied
pagination URLs, and cap each response at 2 MiB with a 15-second timeout. Output omits raw
messages, attachments, download URLs and credentials. All content remains untrusted data;
future AI consumers must not treat email, event or cell text as action authorization.

Example request (using the signed-in user's bearer session, never a provider token):

```json
{ "action": "read", "provider": "google", "feature": "calendar", "input": {} }
```

## Server configuration

Never prefix these secrets with `VITE_` and never paste them into chat:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
INTEGRATION_ENCRYPTION_KEY
GOOGLE_INTEGRATION_CLIENT_ID
GOOGLE_INTEGRATION_CLIENT_SECRET
GOOGLE_INTEGRATION_REDIRECT_URI
MICROSOFT_INTEGRATION_CLIENT_ID
MICROSOFT_INTEGRATION_CLIENT_SECRET
MICROSOFT_INTEGRATION_REDIRECT_URI
```

The encryption key must be a persistent, random 32-byte key encoded as base64, stored
in the deployment's secret manager. Losing it requires reconnecting every account.
Redirect URIs must exactly match the registered callback routes on the same origin as
the signed-in app. Local Google example:
`http://localhost:5182/integrations/callback/google`.
Production uses HTTPS. Provider console configuration/consent remains a separate step.

## Remaining before live rollout

- Finish Google test-user consent and real-account connection testing for both providers.
- Both providers' server
  credentials and a persistent 32-byte encryption key are configured for Vercel
  production and development, with production and localhost redirects registered.
- Test concurrent state consumption on Postgres. Catalog privilege checks passed;
  the MCP SQL connection rejected a rollback-only mutation smoke test as read-only.
- Configure hosting logs to redact callback query strings and authorization headers.
- Complete selected-seller imports, calendar UI and assistant-tool wiring.
  Automatic sync, complete pagination and seller imports are not implemented.
  Settings now includes inbox previews, email compose/reply, and spreadsheet previews.
- Add calendar writes and the GPT Live interface. Email sending uses encrypted,
  five-minute single-use previews consumed atomically before sending.
  Existing MCP WhatsApp actions already use the shared confirmation layer.
- Add retention maintenance for abandoned users' expired states and a key-rotation procedure.
- Test real provider consent, permission denial, expiration and disconnection before launch.

Endpoints and Settings are implemented locally; this setup does not deploy them.
The Google Cloud project is `repeat-ai`, with OAuth branding/support contact
`repeataiorg@gmail.com` and client `Repeat AI Web`, in external testing mode.
Its registered callbacks are `https://repeatai.org/integrations/callback/google` and
`http://localhost:5182/integrations/callback/google`. The brand account has only
OAuth Config Editor; the existing owner session manages API/client console pages
that additionally require service-usage or service-account-list permissions.
Google Sheets, Gmail and Google Calendar APIs are enabled and were verified in
the Cloud console. API enablement is not user consent to read an account.

Vercel production stores both provider client secrets and the encryption key as sensitive
secrets. Development values are retrievable for local use; `.env.development.local`
was pulled into an ignored, untracked file without overwriting `.env.local`.
Preview is not configured. Local and production currently share the same database,
so their encryption key must stay aligned; use separate databases before isolating
keys. Production environment changes require a deployment to take effect.

Unit tests use fake providers and mocked storage. Microsoft Excel has now completed
real consent and token exchange locally. The live local endpoint rejects unauthenticated requests
with HTTP 401.

Microsoft Azure signup is complete in the owner's Default Directory. The `Repeat AI`
application supports organizational and personal Microsoft accounts. Its client ID is
`41b4520e-68c4-4884-8dd4-5ef196c682e9`; the production Web redirect is
`https://repeatai.org/integrations/callback/microsoft`. The server secret was created
and stored in Vercel on 2026-09-21, expiring 2027-03-20. Rotate it before expiry.
The local callback `http://localhost:5182/integrations/callback/microsoft` is saved
and verified in Azure. No tenant-wide admin consent was granted.
Local configuration checks report both providers configured and a 32-byte vault key;
this is not proof of successful live consent or token exchange.
The authenticated local Settings panel loads all six enabled Connect buttons. Starting
Microsoft Excel reaches Microsoft's real sign-in screen with PKCE, the registered
localhost callback, and `offline_access Files.Read`. On 2026-09-21 the user completed
Microsoft consent. An incorrectly captured accessibility label (`field `) in the saved
client secret caused token exchange failures; the development and production values
were corrected, local configuration refreshed, and the local server restarted.
A fresh authorization successfully persisted the test user's Microsoft sheets
connection. Outlook read-only email consent and token exchange also succeeded.
Google and Outlook Calendar consent remain outstanding, as do the new optional
email-send and workbook-reading permission upgrades.
Callback errors now distinguish expired attempts, provider rejection, missing scopes
and missing offline access without exposing provider responses or credentials.
Restart the connection from Settings if the ten-minute pending authorization expires.

## Email and spreadsheet workspace (local implementation)

- Gmail/Outlook can prepare new plain-text emails and single-recipient replies.
  Reply recipients are resolved server-side from the original message's Reply-To or
  From fields. Gmail replies preserve the original thread and message headers.
- The web UI must show the exact recipient, subject and body, then require
  `Confirm and send`. Editing the draft invalidates its visible preview. The server
  accepts only the opaque preview token for confirmation, never replacement contents.
- Preview contents are encrypted in the existing service-role-only pending table,
  using an `email-send:` hash namespace distinct from OAuth states. They are bound
  to the authenticated user, provider and connection ciphertext. Reconnection,
  disconnection, expiry and replay reject the send. Token refresh between preview
  and confirmation conservatively requires a fresh preview too.
- Provider timeouts are ambiguous: check Sent before composing again. There is no
  automatic send retry. An accepted response is not proof of recipient delivery.
- `begin` supports explicit `capability: send` for Gmail/Outlook, or `workbook` for
  Microsoft sheets. Existing read-only connections keep working without upgrades.
- Microsoft workbook reads require Files.ReadWrite according to Graph's range API;
  the UI explains this, but the implementation exposes no spreadsheet writes.
  Users select a workbook and worksheet. Google accepts a spreadsheet ID and
  optional sheet name. Both previews are bounded to A1:Z100, with local search.
- Inbox/file/worksheet lists show at most ten entries and disclose truncation.
  No attachments, reply-all, spreadsheet edits, full sync or automatic imports.
- These send endpoints are not exposed as assistant tools. GPT Live needs a separate
  trusted human-approval flow before it can use them.
- Tested with mocked providers and sample-data browser workflows. No live email was
  sent, and upgraded live workbook access has not yet been verified. Not deployed.

Additional references:
- https://learn.microsoft.com/en-us/graph/api/worksheet-range?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/message-reply?view=graph-rest-1.0
- https://developers.google.com/workspace/gmail/api/guides/threads

References:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Google restricted Gmail permissions may require verification before public rollout;
review the applicable provider policies before enabling email data access for users.

Validation: `node --test tests/integration-oauth.test.js tests/integration-api.test.js
tests/integration-reads.test.js tests/integration-actions.test.js tests/action-confirmation.test.js`, targeted ESLint
and `npm run build`. Browser fixture: `/docs/design/integrations-preview/index.html`;
this preview explicitly uses sample states and never connects an account.
