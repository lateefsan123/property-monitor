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
- Without that callback, MCP mutations now return `confirmation_required` and do not execute.
- No approval callback or approval UI is wired yet. Reads remain available. Do not deploy this
  checkpoint expecting existing MCP write workflows to continue unchanged.

The confirmation host must show the exact action, recipient/resource and payload, bind its
response to the authenticated session and individual invocation, and return true only after
the user approves. Do not expose a model-callable confirmation tool or trust transcript text
as approval. A future voice adapter must apply this same gate. Approval is not a substitute
for provider authorization. Do not automatically retry sends after ambiguous provider failures.

## Next implementation stages

1. Durable, expiring, single-use approval records and authenticated review UI; idempotency for writes.
2. Google and Microsoft OAuth connections, encrypted server-side token storage, revocation,
   minimum required permissions and per-user connection status.
3. Sheets/Excel read/import adapters; explicit sync conflict policy before enabling writes.
4. Calendar availability and confirmed viewing creation; email read/draft and confirmed send.
5. Realtime voice session transport using the same registry and confirmation UI.

Google Sheets live sync, Gmail, Outlook, Calendar and live voice are **not implemented** by
this checkpoint. Existing manual imports are unchanged. No credentials, provider permissions,
database schemas or production deployments were modified. Local tests stub external services.

Checks: `node --test tests/integration-actions.test.js` and `npm run mcp:check`.
