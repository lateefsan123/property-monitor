import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `${name} is not configured`);
  return value;
}

function cleanString(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

function getBaileysSessionId(account: any) {
  const rawSessionId = cleanString(account?.raw_account?.baileys?.session_id);
  if (rawSessionId) return rawSessionId;

  const phoneNumberId = cleanString(account?.phone_number_id);
  if (phoneNumberId?.startsWith("baileys:")) return phoneNumberId.slice("baileys:".length);
  return null;
}

async function baileysFetch(path: string, options: RequestInit = {}) {
  const serviceUrl = requireEnv("BAILEYS_SERVICE_URL").replace(/\/+$/, "");
  const serviceToken = requireEnv("BAILEYS_SERVICE_TOKEN");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${serviceToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${serviceUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(502, payload?.error || `Baileys service request failed with ${response.status}`);
  }

  return payload;
}

function createSupabaseClients(authHeader: string | null) {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { userClient, adminClient };
}

async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) throw new HttpError(401, "Missing Authorization header");

  const { userClient, adminClient } = createSupabaseClients(authHeader);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Invalid auth token");

  return { adminClient, user: data.user };
}

function normalizeWhatsAppPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  return digits || null;
}

function getTemplateComponents(parameters: unknown) {
  if (!Array.isArray(parameters) || parameters.length === 0) return undefined;

  return [{
    type: "body",
    parameters: parameters.map((parameter) => ({
      type: "text",
      text: String(parameter ?? ""),
    })),
  }];
}

function buildGraphPayload(input: {
  body?: string | null;
  templateLanguage?: string | null;
  templateName?: string | null;
  templateParameters?: unknown;
  to: string;
  type?: string | null;
}) {
  const envTemplateName = Deno.env.get("WHATSAPP_DEFAULT_TEMPLATE_NAME");
  const templateName = input.templateName || envTemplateName || null;
  const messageType = input.type === "template" || (!input.type && templateName) ? "template" : "text";

  if (messageType === "template") {
    if (!templateName) throw new HttpError(400, "templateName is required for template messages");
    return {
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: templateName,
        language: { code: input.templateLanguage || Deno.env.get("WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE") || "en_US" },
        components: getTemplateComponents(input.templateParameters),
      },
    };
  }

  const body = String(input.body || "").trim();
  if (!body) throw new HttpError(400, "message body is required");
  return {
    messaging_product: "whatsapp",
    to: input.to,
    type: "text",
    text: {
      body,
      preview_url: false,
    },
  };
}

function buildBaileysPayload(input: { body?: string | null; to: string }) {
  const body = String(input.body || "").trim();
  if (!body) throw new HttpError(400, "message body is required");
  return {
    to: input.to,
    type: "text",
    text: {
      body,
      preview_url: false,
    },
  };
}

async function getConnectedAccount(adminClient: any, userId: string, accountId: string | null) {
  let query = adminClient
    .from("whatsapp_accounts")
    .select("id, user_id, provider, phone_number_id, display_phone_number, connection_status, raw_account")
    .eq("user_id", userId)
    .eq("connection_status", "connected");

  if (accountId) query = query.eq("id", accountId);

  const { data, error } = await query.order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(409, "No connected WhatsApp account");

  return data;
}

async function getLead(adminClient: any, userId: string, leadId: string | null) {
  if (!leadId) return null;

  const { data, error } = await adminClient
    .from("leads")
    .select("id, user_id, name, phone")
    .eq("user_id", userId)
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Lead not found");

  return data;
}

async function getAccountSecret(adminClient: any, accountId: string) {
  const { data, error } = await adminClient
    .from("whatsapp_account_secrets")
    .select("access_token")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data?.access_token) throw new HttpError(409, "WhatsApp account token is not configured");

  return data.access_token;
}

async function sendViaBaileys(account: any, to: string, body: string) {
  const sessionId = getBaileysSessionId(account);
  if (!sessionId) throw new HttpError(409, "Baileys session is not configured");

  return baileysFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: body, to }),
  });
}

async function markLeadSent(adminClient: any, userId: string, leadId: string | number, sentAt: string) {
  const { error: leadError } = await adminClient
    .from("leads")
    .update({ sent_at: sentAt })
    .eq("user_id", userId)
    .eq("id", leadId);

  if (leadError) throw new HttpError(500, leadError.message);

  const { error: sentLeadError } = await adminClient
    .from("sent_leads")
    .upsert({ user_id: userId, lead_id: leadId, sent_at: sentAt }, { onConflict: "user_id,lead_id" });

  if (sentLeadError) throw new HttpError(500, sentLeadError.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let messageRowId: string | null = null;
  let adminClient: any = null;

  try {
    const auth = await getAuthenticatedUser(req.headers.get("Authorization"));
    adminClient = auth.adminClient;
    const userId = auth.user.id;
    const input = await req.json();
    const lead = await getLead(adminClient, userId, input.leadId || null);
    const account = await getConnectedAccount(adminClient, userId, input.accountId || null);
    const to = normalizeWhatsAppPhone(input.to || lead?.phone);
    if (!to) throw new HttpError(400, "Recipient phone number is required");

    const isBaileys = account.provider === "baileys";
    const payload = isBaileys
      ? buildBaileysPayload({ body: input.body, to })
      : buildGraphPayload({
          body: input.body,
          templateLanguage: input.templateLanguage,
          templateName: input.templateName,
          templateParameters: input.templateParameters,
          to,
          type: input.messageType,
        });
    const templatePayload = payload.type === "template" && "template" in payload ? payload.template : null;

    const { data: messageRow, error: insertError } = await adminClient
      .from("whatsapp_messages")
      .insert({
        user_id: userId,
        account_id: account.id,
        lead_id: lead?.id || null,
        direction: "outbound",
        recipient_phone: to,
        message_type: payload.type,
        template_name: templatePayload?.name || null,
        template_language: templatePayload?.language?.code || "en_US",
        template_parameters: input.templateParameters || [],
        body: input.body || null,
        status: "sending",
        raw_request: payload,
      })
      .select("id")
      .single();

    if (insertError) throw new HttpError(500, insertError.message);
    messageRowId = messageRow.id;

    let providerPayload: any = null;
    let providerMessageId: string | null = null;

    if (isBaileys) {
      providerPayload = await sendViaBaileys(account, to, input.body);
      providerMessageId = providerPayload?.messageId || null;
    } else {
      const accessToken = await getAccountSecret(adminClient, account.id);
      const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION") || "v25.0";
      const graphResponse = await fetch(
        `https://graph.facebook.com/${graphVersion}/${account.phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      providerPayload = await graphResponse.json().catch(() => null);
      if (!graphResponse.ok) {
        const message = providerPayload?.error?.message || `WhatsApp API request failed with ${graphResponse.status}`;
        throw new HttpError(502, message);
      }
      providerMessageId = providerPayload?.messages?.[0]?.id || null;
    }

    const sentAt = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("whatsapp_messages")
      .update({
        status: "sent",
        meta_message_id: providerMessageId,
        raw_response: providerPayload || {},
        sent_at: sentAt,
      })
      .eq("id", messageRowId);

    if (updateError) throw new HttpError(500, updateError.message);
    if (lead?.id) await markLeadSent(adminClient, userId, lead.id, sentAt);

    return jsonResponse({ messageId: messageRowId, metaMessageId: providerMessageId, sentAt });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";

    if (adminClient && messageRowId) {
      await adminClient
        .from("whatsapp_messages")
        .update({
          status: "failed",
          error_message: message,
          failed_at: new Date().toISOString(),
        })
        .eq("id", messageRowId);
    }

    return jsonResponse({ error: message }, status);
  }
});
