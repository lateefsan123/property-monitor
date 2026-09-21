// Resolve mutable defaults before approval so the approved recipient/account are pinned.
export async function prepareAction(name, input, authInfo, services) {
  const args = structuredClone(input);
  if (name !== "send_seller_signal_whatsapp_message") return { input: args };
  const lead = args.leadId ? await services.getLead(authInfo, args.leadId) : null;
  args.to = services.normalizeWhatsAppPhone(args.to || lead?.phone);
  if (!args.to) throw new Error("Recipient phone number is required");
  args.body = args.body.trim();
  if (!args.body) throw new Error("Message cannot be blank");
  const accounts = await services.listWhatsAppAccounts(authInfo);
  const account = accounts.find(item => item.connection_status === "connected" && (!args.accountId || item.id === args.accountId));
  if (!account) throw new Error("No connected WhatsApp account");
  args.accountId = account.id;
  args.sendSource = "mcp";
  return { input: args, summary: `Send WhatsApp to ${lead?.name || "recipient"} (+${args.to}) from ${account.display_phone_number || account.id}.` };
}
