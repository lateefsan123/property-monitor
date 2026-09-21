# Shared integration actions

The server-only registry at `services/seller-signal-mcp/src/action-registry.js`
is the common entry point for MCP and future authenticated app/voice adapters.
It reuses the existing seller and WhatsApp services, including their ownership,
subscription and sending checks. Do not import this module into a browser bundle.

## Current checkpoint

- Eight existing seller/WhatsApp actions have one definition and validation schema.
- Identity comes from the verified host session (`authInfo.extra.userId`), never tool arguments.
- Unknown input fields are rejected, including caller-supplied user IDs and approval flags.
- Mutations require a trusted host `confirmAction(request, context)` callback returning exactly true.
- The MCP adapter now supplies a callback using the connected host's native form elicitation.
  Only explicit acceptance with `approve: true` executes. Unsupported clients fail closed.
- The prompt includes the exact validated payload. WhatsApp resolves the recipient/account
  before confirmation and pins them in the execution payload. Cancellation and timeout do not execute.
- MCP sessions are bound to both the authenticated user and OAuth client on POST/GET/DELETE.
- Confirmation was verified over the installed SDK's in-memory transport with a simulated client.
  A real client-rendered form and real provider send have not been tested.

The confirmation host must show the exact action, recipient/resource and payload, bind its
response to the authenticated session and individual invocation, and return true only after
the user approves. Do not expose a model-callable confirmation tool or trust transcript text
as approval. A future voice adapter must apply this same gate. Approval is not a substitute
for provider authorization. Do not automatically retry sends after ambiguous provider failures.

## Next implementation stages

1. Durable, expiring, single-use approval records and authenticated review UI for the website/voice;
   idempotency for writes. MCP's current approval is inline per invocation, not stored or reusable.
2. Google and Microsoft OAuth connections, encrypted server-side token storage, revocation,
   minimum required permissions and per-user connection status.
3. Sheets/Excel read/import adapters; explicit sync conflict policy before enabling writes.
4. Calendar availability and confirmed viewing creation; email read/draft and confirmed send.
5. Realtime voice session transport using the same registry and confirmation UI.

Google Sheets live sync, Gmail, Outlook, Calendar and live voice are **not implemented** by
this checkpoint. Existing manual imports are unchanged. No credentials, provider permissions,
database schemas or production deployments were modified. Local tests stub external services.

Checks: `node --test tests/integration-actions.test.js tests/action-confirmation.test.js`
and `npm run mcp:check`. Installing the existing service lockfile reported five dependency
advisories (two high, three moderate); resolve/review these before production rollout.

Native confirmation reference: https://ts.sdk.modelcontextprotocol.io/capabilities
