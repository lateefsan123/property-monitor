// Numbers that aren't on WhatsApp. The Baileys service checks each recipient
// before sending and answers 422 { code: "not_on_whatsapp" }; the seller is
// then flagged (leads.whatsapp_missing_at) so automations stop trying them.
// Editing the seller's phone clears the flag (trigger on leads).
export const NOT_ON_WHATSAPP = "not_on_whatsapp";
export const NOT_ON_WHATSAPP_MESSAGE = "This number isn't on WhatsApp.";

export function notOnWhatsAppError(status = 422) {
  return Object.assign(new Error(NOT_ON_WHATSAPP_MESSAGE), { code: NOT_ON_WHATSAPP, status });
}

export const isNotOnWhatsApp = (error) => error?.code === NOT_ON_WHATSAPP;

// For a failed Baileys response: the not-on-WhatsApp error, or null.
export const baileysReachabilityError = (payload) => (payload?.code === NOT_ON_WHATSAPP ? notOnWhatsAppError() : null);

export async function markNotOnWhatsApp(client, userId, leadId) {
  if (!userId || !leadId) return;
  const { error } = await client
    .from("leads")
    .update({ whatsapp_missing_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", leadId);
  if (error) console.warn("Could not flag a number not on WhatsApp", error.message);
}
