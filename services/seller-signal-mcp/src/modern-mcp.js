import { z } from "zod";
import { createActionRegistry } from "./action-registry.js";
import { PANEL_URI, PANEL_META, panelResource, toolResult } from "./seller-panel.js";
import { EVENT_DEFINITION } from "./events.js";

export const MODERN_VERSION = "2026-07-28";
const protocolKey = "io.modelcontextprotocol/protocolVersion";
const capabilitiesKey = "io.modelcontextprotocol/clientCapabilities";
function decodeHeader(value) {
  if (typeof value !== "string") return value;
  const match = /^=\?base64\?([A-Za-z0-9+/]*={0,2})\?=$/.exec(value);
  return match ? Buffer.from(match[1], "base64").toString("utf8") : value;
}

// Modern requests have per-request identity/capabilities and no MCP session.
// Keep the legacy SDK transport intact for the submitted plugin version.
export function createModernHandler({ events, approvalStore, origin, registry = createActionRegistry }) {
  return async (req, res) => {
    const body = req.body;
    // Log protocol operations only: never tokens, arguments, account data or callbacks.
    const diagnosticMethod = ["server/discover", "tools/list", "tools/call", "resources/list", "resources/read", "events/list", "events/subscribe", "events/unsubscribe", "ping"].includes(body?.method) ? body.method : "other";
    res.on?.("finish", () => console.info("Preview MCP", diagnosticMethod, res.statusCode));
    const error = (code, message, status = 400, data) => res.status(status).json({ jsonrpc: "2.0", id: body?.id ?? null, error: { code, message, ...(data ? { data } : {}) } });
    res.set("Cache-Control", "no-store");
    if (req.headers.origin && req.headers.origin !== origin) return error(-32600, "Origin not allowed", 403);
    if (!body || Array.isArray(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string" || !(typeof body.id === "string" || (typeof body.id === "number" && Number.isInteger(body.id)))) return error(-32600, "Invalid request");
    const params = body.params || {};
    const version = params._meta?.[protocolKey];
    if (req.headers["mcp-protocol-version"] !== version || req.headers["mcp-method"] !== body.method || !version) return error(-32020, "Required headers must match request metadata");
    if (version !== MODERN_VERSION) return error(-32022, "Unsupported protocol version", 400, { supported: [MODERN_VERSION] });
    const capabilities = params._meta?.[capabilitiesKey];
    if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) return error(-32602, "Client capabilities are required");
    if (["tools/call", "resources/read", "prompts/get"].includes(body.method) && decodeHeader(req.headers["mcp-name"]) !== (params.name ?? params.uri)) return error(-32020, "Mcp-Name must match the request");
    const actions = registry({ authInfo: req.auth, enablePanel: true, confirmAction: async () => false,
      deferConfirmation: approvalStore ? (request, execute) => approvalStore.create(request, execute) : undefined });
    try {
      let result;
      const { _meta: _metadata, ...args } = params;
      switch (body.method) {
        case "server/discover": result = { supportedVersions: [MODERN_VERSION], capabilities: { tools: {}, resources: {}, ...(events ? { events: {} } : {}) }, _meta: { "io.modelcontextprotocol/serverInfo": { name: "repeat-ai-preview", version: "0.2.0" } } }; break;
        case "tools/list": result = { tools: actions.list().map(action => ({ name: action.name, title: action.title, description: action.description,
          inputSchema: z.toJSONSchema(z.object(action.inputSchema).strict()),
          annotations: { readOnlyHint: action.readOnly, destructiveHint: ["update_my_seller_lead", "send_seller_signal_whatsapp_message"].includes(action.name), openWorldHint: action.name === "send_seller_signal_whatsapp_message", ...(action.readOnly ? { idempotentHint: true } : {}) },
          ...(action.name === "get_my_seller_workspace" ? { _meta: PANEL_META } : action.readOnly ? { _meta: { "openai/widgetAccessible": true } } : {}),
        })) }; break;
        case "tools/call":
          if (!actions.list().some(action => action.name === args.name)) return error(-32602, "Unknown tool");
          try { result = toolResult(await actions.execute(args.name, args.arguments || {})); }
          catch { result = { isError: true, content: [{ type: "text", text: "Could not complete this action. Check the arguments and account access, then try again." }] }; }
          break;
        case "resources/list": result = { resources: [{ uri: PANEL_URI, name: "seller-workspace", mimeType: "text/html;profile=mcp-app" }] }; break;
        case "resources/read": if (args.uri !== PANEL_URI) return error(-32602, "Unknown resource"); result = panelResource(); break;
        case "events/list": if (!events) return error(-32601, "Events unavailable", 404); result = { events: [EVENT_DEFINITION] }; break;
        case "events/subscribe": if (!events) return error(-32601, "Events unavailable", 404); result = await events.subscribe(req.auth, args); break;
        case "events/unsubscribe": if (!events) return error(-32601, "Events unavailable", 404); result = await events.unsubscribe(req.auth, args); break;
        case "ping": result = {}; break;
        default: return error(-32601, "Method not found", 404);
      }
      return res.json({ jsonrpc: "2.0", id: body.id, result: { ...result, resultType: "complete" } });
    } catch (cause) {
      return error(cause.code === -32015 ? cause.code : -32602, cause.code === -32015 ? cause.message : "Could not process request. Check arguments, callback URL and account access.", 400, cause.data);
    }
  };
}
