import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createActionRegistry } from "./action-registry.js";
import { createMcpConfirmation } from "./action-confirmation.js";

export function createSellerSignalMcpServer(options = {}) {
  const server = new McpServer({ name: "seller-signal-mcp", version: "0.1.0" });
  const actions = createActionRegistry({ ...options, confirmAction: options.confirmAction ?? createMcpConfirmation(server.server) });
  for (const action of actions.list()) {
    server.registerTool(action.name, {
      title: action.title,
      description: action.description,
      inputSchema: action.inputSchema,
      annotations: {
        readOnlyHint: action.readOnly,
        destructiveHint: !action.readOnly,
        openWorldHint: action.name.includes("whatsapp"),
        ...(action.readOnly ? { idempotentHint: true } : {}),
      },
    }, async (args, extra) => {
      const value = await actions.execute(action.name, args, extra);
      return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
    });
  }
  return server;
}
