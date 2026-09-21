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
  service-role-only state-consumption function. It has NOT been applied to any database.
- Settings → Integrations lists six provider/feature connections, error/retry states
  and disabled setup states. No connection is simulated in the actual Settings panel.
- `/integrations/callback/google` and `/integrations/callback/microsoft` finish consent
  using the existing Repeat AI session. Query parameters are removed from history;
  React StrictMode does not duplicate the code exchange. Sign in before connecting.
- Disconnect deletes Repeat AI's stored connection; it does NOT revoke the provider's
  account-wide grant. The confirmation explains where to remove that grant as well.
- Vite serves the same endpoint locally via `integration-dev-plugin.js`.

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

- Register/configure Google and Microsoft OAuth applications and callback URLs.
- Supply server-only client IDs/secrets and a separate 32-byte encryption key.
- Apply and verify the migration against the intended database; test role access and
  concurrent state consumption on Postgres. No local Docker database was available.
- Configure hosting logs to redact callback query strings and authorization headers.
- Add token refresh/rotation, provider read adapters, selected-file imports and calendar/
  email workflows. This connection-management layer does not yet read or sync data.
- Add durable action approvals for email/calendar writes and the GPT Live interface.
  Existing MCP WhatsApp actions already use the shared confirmation layer.
- Add retention maintenance for abandoned users' expired states and a key-rotation procedure.
- Test real provider consent, permission denial, expiration and disconnection before launch.

Endpoints and Settings are implemented locally. No live permissions were granted and
no database migration was applied. Tests use fake providers and mocked storage.
The local `.env` and `.env.local` contained no matching provider integration configuration
keys when checked; hosted configuration has not been inspected.

References:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Google restricted Gmail permissions may require verification before public rollout;
review the applicable provider policies before enabling email data access for users.

Validation: `node --test tests/integration-oauth.test.js tests/integration-api.test.js
tests/integration-actions.test.js tests/action-confirmation.test.js`, targeted ESLint
and `npm run build`. Browser fixture: `/docs/design/integrations-preview/index.html`;
this preview explicitly uses sample states and never connects an account.
