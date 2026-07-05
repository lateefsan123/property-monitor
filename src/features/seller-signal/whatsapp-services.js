import { supabase } from "../../supabase";
import { formatPhoneForWhatsApp } from "./insight-utils";

export async function fetchWhatsAppAccounts(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("whatsapp_accounts")
    .select("id, provider, display_phone_number, business_name, connection_status, connected_at, last_error, raw_account")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  return data || [];
}

export function getConnectedWhatsAppAccount(accounts = []) {
  return accounts.find((account) => account.connection_status === "connected") || null;
}

export async function connectWhatsAppAccount({
  accountId,
  action,
  businessId,
  code,
  customPairingCode,
  phoneNumberId,
  phoneNumber,
  provider = "meta",
  quiet,
  rawSignup,
  wabaId,
}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-connect-account", {
    body: {
      accountId,
      action,
      businessId,
      code,
      customPairingCode,
      phoneNumberId,
      phoneNumber,
      provider,
      quiet,
      rawSignup,
      wabaId,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.account) throw new Error("WhatsApp account was not returned");

  return data;
}

export async function sendLeadWhatsAppMessage({
  accountId,
  leadId,
  message,
  phone,
}) {
  const to = formatPhoneForWhatsApp(phone);
  if (!to) throw new Error("Lead does not have a valid WhatsApp phone number");

  const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
    body: {
      accountId,
      leadId,
      to,
      body: message,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return data;
}
