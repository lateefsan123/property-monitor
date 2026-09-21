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
- Save the prepared Microsoft localhost redirect after approval. Both providers' server
  credentials and a persistent 32-byte encryption key are configured for Vercel
  production and development, but Microsoft currently registers only the production URI.
- Test concurrent state consumption on Postgres. Catalog privilege checks passed;
  the MCP SQL connection rejected a rollback-only mutation smoke test as read-only.
- Configure hosting logs to redact callback query strings and authorization headers.
- Wire the read endpoint into selected-file imports, calendar/email UI and assistant tools.
  Automatic sync, complete pagination, file imports and Microsoft workbook values are
  not implemented. No real provider account has been read by these adapters yet.
- Add durable action approvals for email/calendar writes and the GPT Live interface.
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

Unit tests still use fake providers and mocked storage; no real provider account
has completed consent. The live local endpoint rejects unauthenticated requests
with HTTP 401.

Microsoft Azure signup is complete in the owner's Default Directory. The `Repeat AI`
application supports organizational and personal Microsoft accounts. Its client ID is
`41b4520e-68c4-4884-8dd4-5ef196c682e9`; the production Web redirect is
`https://repeatai.org/integrations/callback/microsoft`. The server secret was created
and stored in Vercel on 2026-09-21, expiring 2027-03-20. Rotate it before expiry.
The local callback `http://localhost:5182/integrations/callback/microsoft` is prepared
in Azure but not saved yet. No tenant-wide admin consent or user data access was granted.
Local configuration checks report both providers configured and a 32-byte vault key;
this is not proof of successful live consent or token exchange.

References:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Google restricted Gmail permissions may require verification before public rollout;
review the applicable provider policies before enabling email data access for users.

Validation: `node --test tests/integration-oauth.test.js tests/integration-api.test.js
tests/integration-reads.test.js tests/integration-actions.test.js tests/action-confirmation.test.js`, targeted ESLint
and `npm run build`. Browser fixture: `/docs/design/integrations-preview/index.html`;
this preview explicitly uses sample states and never connects an account.
