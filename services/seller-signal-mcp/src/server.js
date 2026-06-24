import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addLead,
  getAccountSummary,
  getLead,
  listLeads,
  listWhatsAppAccounts,
  listWhatsAppMessages,
  sendWhatsAppMessage,
  updateLead,
} from "./seller-signal.js";

function jsonResponse(value) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function toolAnnotationsFor(name) {
  const readOnly = name.startsWith("get_") || name.startsWith("list_");
  return {
    readOnlyHint: readOnly,
    destructiveHint: false,
    openWorldHint: name.includes("whatsapp"),
    ...(readOnly ? { idempotentHint: true } : {}),
  };
}

const leadIdSchema = z.union([z.string().min(1), z.number().int()]);
const nullableStringSchema = z.string().nullable().optional();

export function createSellerSignalMcpServer(options = {}) {
  const server = new McpServer({
    name: "seller-signal-mcp",
    version: "0.1.0",
  });

  function registerTool(name, title, description, inputSchema, handler) {
    server.registerTool(
      name,
      {
        title,
        description,
        inputSchema,
        annotations: toolAnnotationsFor(name),
      },
      async (args, extra) => jsonResponse(await handler(args, extra)),
    );
  }

  registerTool(
    "get_my_seller_signal_account",
    "Get My Seller Signal Account",
    "Return the Seller Signal account linked to this MCP OAuth connection, including subscription, lead counts, and WhatsApp connection status.",
    {},
    async () => getAccountSummary(options.authInfo),
  );

  registerTool(
    "list_my_seller_leads",
    "List My Seller Leads",
    "List Seller Signal leads for the connected account. Use status=active for unsent leads, done for sent leads, or all for both.",
    {
      limit: z.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      sourceId: z.string().uuid().optional(),
      status: z.enum(["active", "done", "all"]).optional(),
    },
    async (input) => listLeads(options.authInfo, input),
  );

  registerTool(
    "get_my_seller_lead",
    "Get My Seller Lead",
    "Get one Seller Signal lead by ID from the connected account.",
    {
      leadId: leadIdSchema,
    },
    async (input) => getLead(options.authInfo, input.leadId),
  );

  registerTool(
    "add_my_seller_lead",
    "Add My Seller Lead",
    "Create a new Seller Signal lead in the connected account. At least one of name, building, or phone is required.",
    {
      bedroom: z.string().optional(),
      building: z.string().optional(),
      lastContact: z.string().optional(),
      name: z.string().optional(),
      notes: z.string().optional(),
      phone: z.string().optional(),
      sourceId: z.string().uuid().optional(),
      status: z.string().optional(),
      unit: z.string().optional(),
    },
    async (input) => addLead(options.authInfo, input),
  );

  registerTool(
    "update_my_seller_lead",
    "Update My Seller Lead",
    "Update status, notes, last contact date, or sent state for one Seller Signal lead.",
    {
      lastContact: nullableStringSchema,
      leadId: leadIdSchema,
      markSent: z.boolean().optional(),
      notes: z.string().optional(),
      status: nullableStringSchema,
    },
    async (input) => updateLead(options.authInfo, input),
  );

  registerTool(
    "list_my_whatsapp_accounts",
    "List My WhatsApp Accounts",
    "List WhatsApp accounts connected to the Seller Signal account.",
    {},
    async () => listWhatsAppAccounts(options.authInfo),
  );

  registerTool(
    "list_my_whatsapp_messages",
    "List My WhatsApp Messages",
    "List recent WhatsApp messages sent or received through Seller Signal.",
    {
      direction: z.enum(["outbound", "inbound"]).optional(),
      leadId: leadIdSchema.optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async (input) => listWhatsAppMessages(options.authInfo, input),
  );

  registerTool(
    "send_seller_signal_whatsapp_message",
    "Send Seller Signal WhatsApp Message",
    "Send a WhatsApp text message through the connected Seller Signal WhatsApp account. Provide leadId to use the lead phone, or provide to for a direct recipient number.",
    {
      accountId: z.string().uuid().optional(),
      body: z.string().min(1),
      leadId: leadIdSchema.optional(),
      to: z.string().optional(),
    },
    async (input) => sendWhatsAppMessage(options.authInfo, input),
  );

  return server;
}
