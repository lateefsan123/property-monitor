import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `${name} is not configured`);
  return value;
}

function createAdminClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function verifyMetaSignature(payload: string, signatureHeader: string | null) {
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  const digestHex = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(signatureHeader.slice("sha256=".length), digestHex);
}

function metaTimestampToIso(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function statusPatch(status: any) {
  const nextStatus = String(status?.status || "");
  const timestamp = metaTimestampToIso(status?.timestamp);
  const errorMessage = Array.isArray(status?.errors)
    ? status.errors.map((error: any) => error?.message || error?.title || error?.code).filter(Boolean).join("; ")
    : null;

  if (nextStatus === "delivered") return { status: "delivered", delivered_at: timestamp, raw_response: status };
  if (nextStatus === "read") return { status: "read", read_at: timestamp, raw_response: status };
  if (nextStatus === "failed") return { status: "failed", failed_at: timestamp, error_message: errorMessage, raw_response: status };
  if (nextStatus === "sent") return { status: "sent", sent_at: timestamp, raw_response: status };
  return { raw_response: status };
}

function extractMessageBody(message: any) {
  if (message?.type === "text") return message.text?.body || "";
  if (message?.type === "button") return message.button?.text || message.button?.payload || "";
  if (message?.type === "interactive") {
    return message.interactive?.button_reply?.title
      || message.interactive?.list_reply?.title
      || "";
  }
  return "";
}

async function findAccountByPhoneNumberId(adminClient: any, phoneNumberId: string | null) {
  if (!phoneNumberId) return null;

  const { data, error } = await adminClient
    .from("whatsapp_accounts")
    .select("id, user_id")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  return data || null;
}

async function handleStatus(adminClient: any, status: any) {
  const metaMessageId = status?.id;
  if (!metaMessageId) return;

  const { error } = await adminClient
    .from("whatsapp_messages")
    .update(statusPatch(status))
    .eq("meta_message_id", metaMessageId);

  if (error) throw new HttpError(500, error.message);
}

async function handleInboundMessage(adminClient: any, account: any, message: any) {
  const metaMessageId = message?.id;
  const from = message?.from;
  if (!metaMessageId || !from) return;

  const { error } = await adminClient
    .from("whatsapp_messages")
    .insert({
      user_id: account.user_id,
      account_id: account.id,
      direction: "inbound",
      recipient_phone: from,
      message_type: message?.type === "text" ? "text" : "text",
      body: extractMessageBody(message),
      status: "received",
      meta_message_id: metaMessageId,
      raw_response: message,
    });

  if (error && error.code !== "23505") throw new HttpError(500, error.message);
}

Deno.serve(async (req) => {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === requireEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN") && challenge) {
        return new Response(challenge, { status: 200 });
      }

      return jsonResponse({ error: "Invalid verification request" }, 403);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const payloadText = await req.text();
    const validSignature = await verifyMetaSignature(payloadText, req.headers.get("x-hub-signature-256"));
    if (!validSignature) throw new HttpError(400, "Invalid webhook signature");

    const event = JSON.parse(payloadText);
    const adminClient = createAdminClient();

    for (const entry of event?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};
        const account = await findAccountByPhoneNumberId(adminClient, value?.metadata?.phone_number_id || null);

        for (const status of value?.statuses || []) {
          await handleStatus(adminClient, status);
        }

        if (account) {
          for (const message of value?.messages || []) {
            await handleInboundMessage(adminClient, account, message);
          }
        }
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, status);
  }
});
