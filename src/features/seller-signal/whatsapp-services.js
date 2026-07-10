import { supabase } from "../../supabase";
import { formatPhoneForWhatsApp } from "./insight-utils";

const WHATSAPP_CONNECT_TIMEOUT_MS = 25_000;
const WHATSAPP_SEND_TIMEOUT_MS = 30_000;

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

function isReadableResponse(value) {
  return (
    value &&
    typeof value.clone === "function" &&
    typeof value.json === "function" &&
    typeof value.text === "function"
  );
}

async function getFunctionErrorMessage(error, response, fallback) {
  const contextMessage = String(error?.context?.message || error?.message || "");
  const contextName = String(error?.context?.name || error?.name || "");
  if (/abort|timeout/i.test(`${contextName} ${contextMessage}`)) {
    return "WhatsApp request timed out. Check that the WhatsApp service is running and try again.";
  }

  const errorResponse = isReadableResponse(response)
    ? response
    : isReadableResponse(error?.context)
      ? error.context
      : null;

  if (errorResponse) {
    const clone = errorResponse.clone();

    try {
      const payload = await clone.json();
      const message = payload?.error || payload?.message;
      if (message) return message;
    } catch {
      try {
        const text = await errorResponse.clone().text();
        if (text) return text;
      } catch {
        // Fall through to the Supabase error message below.
      }
    }
  }

  return error?.message || fallback;
}

export async function connectWhatsAppAccount({
  accountId,
  action,
  businessId,
  code,
  customPairingCode,
  pairingMode,
  phoneNumberId,
  phoneNumber,
  provider = "meta",
  quiet,
  rawSignup,
  resetSession,
  wabaId,
}) {
  const { data, error, response } = await supabase.functions.invoke("whatsapp-connect-account", {
    body: {
      accountId,
      action,
      businessId,
      code,
      customPairingCode,
      pairingMode,
      phoneNumberId,
      phoneNumber,
      provider,
      quiet,
      rawSignup,
      resetSession,
      wabaId,
    },
    timeout: WHATSAPP_CONNECT_TIMEOUT_MS,
  });

  if (error) throw new Error(await getFunctionErrorMessage(error, response, "WhatsApp connection failed"));
  if (data?.error) throw new Error(data.error);
  if (!data?.account) throw new Error("WhatsApp account was not returned");

  return data;
}

export async function sendLeadWhatsAppMessage({
  accountId,
  leadId,
  message,
  phone,
  requireTodaysTransaction = true,
  sendSource = "manual",
}) {
  const to = formatPhoneForWhatsApp(phone);
  if (!to) throw new Error("Lead does not have a valid WhatsApp phone number");

  const { data, error, response } = await supabase.functions.invoke("whatsapp-send-message", {
    body: {
      accountId,
      leadId,
      to,
      body: message,
      requireTodaysTransaction,
      sendSource,
    },
    timeout: WHATSAPP_SEND_TIMEOUT_MS,
  });

  if (error) throw new Error(await getFunctionErrorMessage(error, response, "WhatsApp message failed"));
  if (data?.error) throw new Error(data.error);

  return data;
}
