import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createActionRegistry } from "./action-registry.js";
import { createMcpConfirmation } from "./action-confirmation.js";
import { PANEL_URI, PANEL_META, panelResource, toolResult } from "./seller-panel.js";

export function createSellerSignalMcpServer(options = {}) {
  const server = new McpServer({ name: "seller-signal-mcp", version: "0.1.0" });
  if (options.enablePanel) server.registerResource("seller-workspace", PANEL_URI, { mimeType: "text/html;profile=mcp-app" }, async () => panelResource());
  const deferConfirmation = options.approvalStore
    ? (request, execute) => server.server.getClientCapabilities()?.elicitation?.form ? null : options.approvalStore.create(request, execute)
    : undefined;
  options = { ...options, deferConfirmation };
  const actions = createActionRegistry({ ...options, confirmAction: options.confirmAction ?? createMcpConfirmation(server.server) });
  for (const action of actions.list()) {
    server.registerTool(action.name, {
      title: action.title,
      description: action.description,
      inputSchema: action.inputSchema,
      ...(action.name === "get_my_seller_workspace" ? { _meta: PANEL_META } : options.enablePanel && action.readOnly ? { _meta: { "openai/widgetAccessible": true } } : {}),
      annotations: {
        readOnlyHint: action.readOnly,
        destructiveHint: action.name === "update_my_seller_lead" || action.name === "send_seller_signal_whatsapp_message",
        openWorldHint: action.name === "send_seller_signal_whatsapp_message",
        ...(action.readOnly ? { idempotentHint: true } : {}),
      },
    }, async (args, extra) => {
      // HTTP requests carry the current verified token, including after refresh.
      // Never mutate the session's auth object: requests can run concurrently.
      const requestActions = extra.authInfo
        ? createActionRegistry({ ...options, authInfo: extra.authInfo, confirmAction: options.confirmAction ?? createMcpConfirmation(server.server) })
        : actions;
      const value = await requestActions.execute(action.name, args, extra);
      return options.enablePanel ? toolResult(value) : { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
    });
  }
  return server;
}
