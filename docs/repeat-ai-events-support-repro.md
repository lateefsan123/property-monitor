# Repeat AI custom MCP event is discovered but unavailable to subscription control

Submitted through the signed-in OpenAI Help Center support chat on September
30, 2026. Human escalation confirmed in the support UI.

## Support status

The initial AI support reply described built-in Gmail, Slack and GitHub event
triggers. A follow-up distinguished the documented custom MCP Events workflow
and requested technical review of the discrepancy between the docs and the
observed runtime. After confirming escalation, the UI showed **Escalation
requested** and stated that a support specialist would respond in the coming
days, with replies also sent by email. No case reference was displayed.

Proof: `outputs/plugin-review/openai-support-escalated.png`.
The report below was submitted as text; screenshots and local files were not
uploaded. No credentials were included. The initial AI reply is not treated as
a definitive explanation of custom MCP Events availability.

## Environment

- ChatGPT Work on web, personal development plugin **Repeat AI Preview**.
- App ID: `asdk_app_6abc5c9e94448191bef34f91cdd5ad03`.
- Version ID: `asdk_app_v_6abc5c9e944c81919b495d93871b37c8`.
- Authenticated MCP endpoint:
  `https://seller-signal-mcp-production.up.railway.app/mcp/preview`.
- MCP protocol: `2026-07-28`; OAuth with an isolated synthetic reviewer account.
- Event: `seller.reply_received`, delivery `["webhook"]`, optional string
  `leadId` filter. No connected WhatsApp account or real customer data is used.

## Reproduction

1. Refresh the development plugin. Server logs show successful
   `server/discover`, `tools/list`, `events/list`, and `resources/read`.
2. Open the plugin page and its Apps detail dialog. `seller.reply_received`
   appears under Events alongside the nine tools.
3. Choose **Try in chat**, which opens a fresh Work chat with the plugin selected.
4. Request an event-triggered task for `seller.reply_received`,
   `leadId: "54014"`, summarising new replies without sending messages or editing
   records. Explicitly request native webhook subscriptions and no polling.
5. The activity shows "Listing Automation Event Sources". The response says the
   subscription control lists only Gmail and GitHub and does not expose Repeat
   AI Preview's event. No subscription is created.
6. Service logs show no `events/subscribe` request.

## Expected and observed

Expected: ChatGPT calls `events/subscribe` with the discovered event, filter,
callback URL, and signing secret, as described in the official test workflow:
https://developers.openai.com/plugins/build/mcp-events#test-in-chatgpt

Observed: discovery succeeds and the event is visible, but the host never starts
the subscription handshake. Consequently, callback verification and actual
delivery to ChatGPT have not been tested. Backend unit tests cover subscription,
signing, retries, expiry, access revocation, and unsubscribe, but do not establish
host compatibility.

Can custom MCP event subscriptions be enabled for this development plugin or
account? Is there an additional rollout requirement or supported entry point
beyond discovery and **Try in chat**?

## Evidence available

- Chat: https://chatgpt.com/c/6abc6362-8ae4-83eb-ae5c-dc56edf023e1
- Event catalog: `outputs/plugin-review/chatgpt-event-discovered.png`.
- Response: `outputs/plugin-review/event-subscription-capability-result.png`.
- Deployment: `d63d98f9-cdca-46f9-bb33-834c5e379a57`.

The provider restriction is reported by the Work session; we have not inspected
OpenAI's internal capability registry. This report does not claim a general
outage. The separately submitted public plugin and its legacy endpoint remain
unchanged. Do not include account passwords, tokens, callback signing secrets,
or raw OAuth traffic when sending this report.
