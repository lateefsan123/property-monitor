# Seller Signal MCP

Streamable HTTP MCP server for Seller Signal. It mirrors the FighterCenter MCP
connection model: Supabase OAuth protects `/mcp`, and the app serves the OAuth
consent page at `/oauth/consent`.

## Tools

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

Local unauthenticated mode is useful only for private testing. Set
`SELLER_SIGNAL_MCP_AUTH_USER_ID` to bind tools to one Supabase user.

For a private single-user deployment before Supabase OAuth Server is enabled,
use dev OAuth:

```bash
SELLER_SIGNAL_MCP_AUTH=dev-oauth
SELLER_SIGNAL_MCP_AUTH_USER_ID=<supabase-user-id>
SELLER_SIGNAL_MCP_AUTH_EMAIL=<email-shown-in-tool-output>
SELLER_SIGNAL_MCP_PUBLIC_BASE_URL=https://your-mcp-service.example.com
SELLER_SIGNAL_MCP_ALLOWED_HOSTS=your-mcp-service.example.com
SELLER_SIGNAL_MCP_ALLOW_INSECURE_DEV_OAUTH=1
SELLER_SIGNAL_MCP_DEV_TOKEN_TTL_SECONDS=7776000
```

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
