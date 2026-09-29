import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createActionRegistry } from "./action-registry.js";
import { createMcpConfirmation } from "./action-confirmation.js";

export function createSellerSignalMcpServer(options = {}) {
  const server = new McpServer({ name: "seller-signal-mcp", version: "0.1.0" });
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
      return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
    });
  }
  return server;
}
