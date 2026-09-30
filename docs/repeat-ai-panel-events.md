# Repeat AI seller panel and reply events

## Preview release

The submitted plugin uses `/mcp` (eight tools). The next version is available on
`/mcp/preview` when `MCP_PREVIEW_ENABLED=1`. It adds a ninth, read-only tool,
`get_my_seller_workspace`, with sidebar and conversation panel entrypoints.
The preview supports both the existing MCP transport and MCP 2.0 requests
(`2026-07-28`). Events require MCP 2.0. Do not replace the submitted endpoint
until the preview has passed the ChatGPT tests below.

The panel searches up to 50 recent matching sellers, reads seller details and
the latest 20 messages, and sends explicit summary/monitoring requests to the
conversation. All data uses existing authenticated, subscription-gated tools.
It does not send WhatsApp messages or edit records. Existing write tools retain
their approval flow. HTML, credentials and customer data are never interpolated
together: the static panel renders returned text using textContent.

## Reply monitoring

Event: `seller.reply_received`. Optional `leadId` filters one seller. Otherwise
the subscription covers the authenticated user's sellers. Only new inbound,
received WhatsApp messages linked to that user's lead are queued. A database
trigger queues each message once for each matching subscription. Historical
messages and outbound sends do not trigger alerts.

ChatGPT chooses a callback and signing secret when the user asks to monitor.
The server verifies that callback before storing the subscription. A worker
checks every five seconds, with five jobs per batch, a two-minute lease, and
at most six attempts. Transient failures use exponential backoff; HTTP 410
removes the subscription and HTTP 413 is not retried. Retries retain the event
ID. Events contain up to 8,000 characters of message text and a truncation flag;
the existing message tool retrieves fuller context.

The host receives event data and follows the user's summarisation instructions.
The service does not purchase inference or automatically message sellers.

## Storage and access

Apply `supabase/migrations/20260930000400_repeat_plugin_events.sql` first.
`mcp_event_subscriptions` and `mcp_event_deliveries` have RLS enabled, with no
client policies and no grants to anon/authenticated. Only service_role can use
them. The auth-state RPC is service-only and returns a boolean.

Set `MCP_EVENTS_ENCRYPTION_KEY` to a stable random 32-byte base64 key, kept only
in server secrets. AES-256-GCM encrypts callback secrets and OAuth access tokens,
bound to the subscription ID. Never log or rotate this key casually: a rotation
requires re-encrypting or explicitly recreating existing subscriptions.

Lifetime is the shorter of the requested TTL (default one hour) and the current
OAuth access-token expiry minus 30 seconds. No offline refresh token is stored.
ChatGPT must refresh the subscription with a current OAuth token before expiry.
Delivery rechecks OAuth consent, session/client/user status, subscription access,
lead ownership, and the connected WhatsApp account. Revoked access stops delivery.
Unsubscribe deletes encrypted credentials and queued deliveries. Expired
subscriptions are removed; delivery records are retained for at most one day.
There is no protocol replay of replies missed while monitoring was inactive.

Callbacks must be public HTTPS on port 443. Both verification and delivery
resolve DNS on each connection, reject private/reserved addresses and pin the
socket to a validated IP while retaining TLS hostname verification. Redirects
are never followed. Signatures use Standard Webhooks; key refresh allows a
one-minute overlap. Payloads cannot exceed 256 KiB.

## Verification

Run from the repository root:

```sh
npm --prefix services/seller-signal-mcp run build:panel
npm --prefix services/seller-signal-mcp test
npm --prefix services/seller-signal-mcp run check
node --test tests/integration-actions.test.js tests/action-confirmation.test.js tests/browser-approval.test.js tests/mcp-billing-access.test.js
npm --prefix services/seller-signal-mcp run preview:panel
```

The local visual preview at `http://127.0.0.1:8791` uses explicitly synthetic
fixtures and the official MCP AppBridge. It never starts real monitoring.
Verify search, sent/unsent filters, empty/error states, seller switching, messages,
escaped text, summary/monitor requests, and wide/narrow layouts.

Database transaction tests verify matching, all-seller and cross-user filtering,
with rollback preserving existing records. Supabase security advisors report
the intended no-policy RLS tables; existing unrelated warnings remain.

Before promoting the preview:

1. Connect/rescan `/mcp/preview` in a development ChatGPT plugin.
2. Confirm nine tools, the seller panel and `seller.reply_received` discovery.
3. Ask to monitor the isolated review seller; verify callback challenge and storage.
4. Insert an isolated synthetic inbound reply and confirm a signed delivery and
   a summary in the subscribed chat. Never connect a real WhatsApp account for this test.
5. Confirm a nonmatching seller is not delivered, then stop monitoring and verify
   unsubscribe. Repeat refresh/restart and access revocation checks.

The local and database checks do not by themselves prove ChatGPT-side delivery.
