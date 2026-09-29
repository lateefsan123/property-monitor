# Seller Signal MCP

Streamable HTTP MCP server for Seller Signal. It mirrors the FighterCenter MCP
connection model: Supabase OAuth protects `/mcp`, and the app serves the OAuth
consent page at `/oauth/consent`.

## Tools

The tools share the server-only action registry in `src/action-registry.js`.
Mutating tools request a user confirmation form through the connected MCP host.
The host must support form elicitation and render the exact action details to the user.
Only explicit acceptance with the approval box checked executes the action.
Unsupported hosts, cancellation, timeout and declined forms do not execute writes.
WhatsApp approvals resolve and pin the recipient and sending account first.
This does not yet add an approval screen to the Repeat AI website or live voice.
Reads remain available to authenticated users. See
`../../docs/integration-foundation.md` for the approval and provider rollout plan.

- `get_my_seller_signal_account`
- `list_my_seller_leads`
- `get_my_seller_lead`
- `add_my_seller_lead`
- `update_my_seller_lead`
- `list_my_whatsapp_accounts`
- `list_my_whatsapp_messages`
- `send_seller_signal_whatsapp_message`

## Local

```bash
npm --prefix services/seller-signal-mcp install
npm run mcp:start
```

Action execution requires a Supabase OAuth identity and access confirmed by the
app's authenticated `get-billing-access` endpoint. It covers web and mobile
subscriptions and explicitly provisioned complimentary accounts. Missing or
expired access and billing errors fail closed. The fixed-account development
provider does not issue Supabase tokens and cannot execute tools through this
production billing gate.

## Production

Required environment:

```bash
SELLER_SIGNAL_MCP_AUTH=supabase-oauth
SELLER_SIGNAL_MCP_PUBLIC_BASE_URL=https://your-mcp-service.example.com
SELLER_SIGNAL_MCP_ALLOWED_HOSTS=your-mcp-service.example.com
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
BAILEYS_SERVICE_URL=...
BAILEYS_SERVICE_TOKEN=...
```

Connector URL:

```text
https://your-mcp-service.example.com/mcp
```

Seller Signal web must also be reachable at the Supabase OAuth consent path:

```text
https://your-seller-signal-app.example.com/oauth/consent
```
