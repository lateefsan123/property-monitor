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

## Verified deployment — September 30, 2026

- Implementation commit: `7298562f`.
- Railway preview deployment: `177e92a6-2782-437b-90f8-4e67e661caca` (SUCCESS).
- Preview URL: `https://seller-signal-mcp-production.up.railway.app/mcp/preview`.
- 32 tests passed, plus targeted ESLint and service syntax checks.
- Browser checks passed in the official AppBridge harness: seller details,
  search, filters, empty/error results, escaped message text, summary/monitoring
  request forwarding and narrow layout.
- Live authenticated reviewer checks passed: MCP 2.0 discovery, nine tools,
  account-scoped panel data, UI resource, reply event definition, active OAuth
  consent/session checks, and eight-tool regression check on `/mcp`.
- Rolled-back database tests passed: matching/all-seller delivery, cross-user and
  nonmatching exclusion, expired subscription exclusion, outbound exclusion,
  and no duplicate event when a message is updated. Existing records preserved.
- Updating the old development plugin via ZIP was rejected by ChatGPT because
  it requires the existing canonical app. No plugin version was changed. A new
  `Repeat AI Preview` connection was subsequently created and authorized for
  the isolated reviewer account. The submitted plugin was not changed.

## ChatGPT verification — September 30, 2026

- Development app: `asdk_app_6abc5c9e94448191bef34f91cdd5ad03`.
- Development version: `asdk_app_v_6abc5c9e944c81919b495d93871b37c8`.
- ChatGPT successfully called the workspace tool and read only Alex Demo (#54014).
- Refreshing tools produced successful `server/discover`, `tools/list`,
  `events/list`, and `resources/read` calls in the deployed service logs.
- The ChatGPT widget request returned HTTP 404, `HTML asset not found`.
  Both the sidebar launcher and conversation widget failed to render. Reducing
  the embedded canonical logo brought the HTML from 934 KB to 440 KB, with a
  fresh resource URI, but did not resolve the host rendering failure.
- Two chats, including a fresh chat after rescan, reported that native event
  subscription controls were unavailable. No `events/subscribe` was observed;
  callback delivery and unsubscribe in ChatGPT remain unverified. No synthetic
  inbound messages were inserted because there was no active host subscription.
- The compact panel renders correctly in the local official AppBridge harness.
  The live authenticated API checks still pass, including the original eight
  tools on `/mcp`. All 32 tests and targeted ESLint passed after diagnostics;
  the five panel/protocol tests passed again after the asset changes.
- Protocol diagnostics log only an allowlisted operation name and HTTP status.
  They do not log arguments, identities, credentials or callback destinations.

This preview is not ready to replace the submitted plugin. Next work is to
resolve availability of subscription controls (the panel ingestion issue was
subsequently fixed below),
then complete the callback lifecycle checklist above. Evidence is saved under
`outputs/plugin-review/`; the event test chat is
`https://chatgpt.com/c/6abc5e3f-d5a8-83eb-98c1-a50a93482592`.

## Resource ingestion fix and public reports

The modern adapter omitted `ttlMs` and `cacheScope` on complete discovery,
tool-list and resource results. MCP 2.0 requires both fields:
https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching

Commit `8caa3a15` adds zero-TTL private cache hints without changing legacy
responses. Deployment `d63d98f9-cdca-46f9-bb33-834c5e379a57` succeeded.
After refreshing the development plugin, the ChatGPT sidebar panel rendered
successfully. Seller selection loaded the correct detail and empty message
history; search returned an empty state and restored the original seller.
Evidence: `outputs/plugin-review/chatgpt-panel-working.png`.
All 33 tests, targeted ESLint and live authenticated API checks passed.

Public reports were checked before attributing this to the host:
- https://community.openai.com/t/bug-widget-api-fails-when-requesting-resource/1381864
  reports the same error but with an incorrectly shaped resource path during
  permission prompts/model switching. Our captured path did not match that case.
- https://github.com/openai/openai-apps-sdk-examples/issues/222 describes a
  different iframe-mount failure with a frontend tree-cycle error.
- https://github.com/openai/openai-apps-sdk-examples/issues/216 describes stale
  resources/CSP after successful resource reads. It does not establish our cause.

The panel now works after correcting our protocol response. The public reports
are symptom comparisons, not evidence that the resolved panel fault was an
OpenAI outage. No matching primary report was found for our missing native
event-subscription controls.

After the cache-hint fix, the live panel's Monitor replies button successfully
sent its lead-scoped request to ChatGPT. ChatGPT again reported native MCP
Events subscriptions unavailable; deployed logs showed no subscription call.
No monitoring was activated. This is a remaining integration/host capability
question, not a verified platform-wide outage or a proven server-side cause.
