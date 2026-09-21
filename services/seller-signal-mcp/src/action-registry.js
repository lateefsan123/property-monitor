import { z } from "zod";
import {
  addLead,
  getAccountSummary,
  getLead,
  listLeads,
  listWhatsAppAccounts,
  listWhatsAppMessages,
  normalizeWhatsAppPhone,
  sendWhatsAppMessage,
  updateLead,
} from "./seller-signal.js";
import { prepareAction } from "./action-preview.js";


const leadIdSchema = z.union([z.string().min(1), z.number().int()]);
const nullableStringSchema = z.string().nullable().optional();

// Server-only: identity and approval callbacks come from the authenticated host.
export function createActionRegistry(options = {}) {
  const actions = new Map();
  function registerAction(name, title, description, inputSchema, handler) {
    const readOnly = name.startsWith("get_") || name.startsWith("list_");
    actions.set(name, { name, title, description, inputSchema, handler, readOnly });
  }
  registerAction(
    "get_my_seller_signal_account",
    "Get My Seller Signal Account",
    "Return the Seller Signal account linked to this MCP OAuth connection, including subscription, lead counts, and WhatsApp connection status.",
    {},
    async () => getAccountSummary(options.authInfo),
  );

  registerAction(
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

  registerAction(
    "get_my_seller_lead",
    "Get My Seller Lead",
    "Get one Seller Signal lead by ID from the connected account.",
    {
      leadId: leadIdSchema,
    },
    async (input) => getLead(options.authInfo, input.leadId),
  );

  registerAction(
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

  registerAction(
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

  registerAction(
    "list_my_whatsapp_accounts",
    "List My WhatsApp Accounts",
    "List WhatsApp accounts connected to the Seller Signal account.",
    {},
    async () => listWhatsAppAccounts(options.authInfo),
  );

  registerAction(
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

  registerAction(
    "send_seller_signal_whatsapp_message",
    "Send Seller Signal WhatsApp Message",
    "Send a WhatsApp text message through the connected Seller Signal WhatsApp account. Lead-based sends require a transaction dated today for that seller's building by default.",
    {
      accountId: z.string().uuid().optional(),
      body: z.string().min(1),
      leadId: leadIdSchema.optional(),
      requireTodaysTransaction: z.boolean().optional(),
      sendSource: z.enum(["manual", "bulk", "mcp", "auto"]).optional(),
      to: z.string().optional(),
    },
    async (input) => sendWhatsAppMessage(options.authInfo, input),
  );


  return {
    list: () => [...actions.values()].map(({ name, title, description, inputSchema, readOnly }) => ({ name, title, description, inputSchema, readOnly })),
    async execute(name, input = {}, context) {
      const action = actions.get(name);
      if (!action) throw new Error("Unknown action");
      const userId = options.authInfo?.extra?.userId;
      if (typeof userId !== "string" || !userId.trim()) throw new Error("Authenticated user required");
      let args = z.object(action.inputSchema).strict().parse(input);
      if (!action.readOnly) {
        if (!options.confirmAction) return { status: "confirmation_required", action: name };
        const prepared = await prepareAction(name, args, options.authInfo, { getLead, listWhatsAppAccounts, normalizeWhatsAppPhone });
        args = prepared.input;
        const approved = await options.confirmAction({ userId, action: name, input: structuredClone(args), summary: prepared.summary }, context);
        if (approved !== true) return { status: "cancelled", action: name };
        if (context?.signal?.aborted) return { status: "cancelled", action: name };
      }
      return action.handler(args);
    },
  };
}
