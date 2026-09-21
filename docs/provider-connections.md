# Provider connection implementation checkpoint

`server/integration-oauth.js` implements the server-side authorization flow for Google
and Microsoft, with a separate opt-in permission set for sheets, calendar and email.
This checkpoint requests read-only data access. Sending email, creating calendar events,
and editing files will require separately requested permissions and action approval.

Implemented: PKCE, random 10-minute state, strict provider allowlist, fixed configured
redirect URIs, one-use state contract, time-bounded token exchange, permission checks,
and AES-256-GCM token encryption bound to user/provider/feature. Tokens never appear in
the returned browser response. No retry is performed after a failed code exchange.

## Required before exposing routes

- Register/configure Google and Microsoft OAuth applications and callback URLs.
- Supply server-only client IDs/secrets and a separate 32-byte encryption key.
- Implement a durable server-only store: `putPending`, `consumePending`, `saveConnection`.
  `consumePending` must atomically match hash, authenticated user, provider and expiry,
  then delete and return the row. An in-memory map is for tests only, not production.
- Protect both begin and complete routes with a freshly verified Repeat AI session;
  derive userId from that session, never request input. Do not log callback query strings.
- Keep pending secrets and encrypted connection rows inaccessible to browser database roles.
- Implement refresh-token rotation, disconnect/revoke, cleanup and key rotation before use.
- Add Settings connection UI, provider adapters and live consent testing.

No endpoints or Connect buttons are exposed yet. No live permissions were granted and
no database migration was applied. Tests use fake providers and an in-memory store.
The local `.env` and `.env.local` contained no matching provider integration configuration
keys when checked; hosted configuration has not been inspected.

References:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Google restricted Gmail permissions may require verification before public rollout;
review the applicable provider policies before enabling email data access for users.

Validation: `node --test tests/integration-oauth.test.js`.
