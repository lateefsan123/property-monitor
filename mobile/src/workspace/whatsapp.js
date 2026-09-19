import { supabase } from "../supabase";
export async function connectWhatsAppAccount(body) {
  const { data, error } = await supabase.functions.invoke(
    "whatsapp-connect-account",
    { body: { provider: "baileys", ...body }, timeout: 25000 },
  );
  if (error) {
    let message = error.message;
    try {
      const payload = await error.context?.json();
      message = payload?.error || payload?.message || message;
    } catch {
      /* Use original error when the response is not JSON. */
    }
    throw new Error(message || "Could not connect WhatsApp.");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
