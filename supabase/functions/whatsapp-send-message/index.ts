import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_MARKET_MESSAGE_STATUSES = ["queued", "sending", "sent", "delivered", "read"];
const USER_SEND_SOURCES = new Set(["manual", "bulk"]);
const CLIENT_KINDS = new Set(["web", "desktop", "api"]);
const DUPLICATE_WINDOW_MS = 60_000;
const TEMPLATE_IMAGE_BUCKET = "seller-signal-template-images";
const TEMPLATE_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;
const WHATSAPP_IMAGE_CAPTION_MAX_LENGTH = 1024;

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

function normalizeToken(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanBuildingName(raw: unknown) {
  let name = String(raw || "").trim();
  const addressMatch = name.match(/^(?:\[[^\]]+\]\s*)?(?:Apartment|Apt|Flat|Unit|Villa)\s+([\w-]+)(?:\s*\([^)]*\))?\s*,\s*(.+)$/i);
  if (addressMatch) {
    name = addressMatch[2].split(",").map((part) => part.trim()).filter(Boolean)[0] || name;
  }

  name = name
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "")
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "")
    .replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "")
    .replace(/[,\-/]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return name || String(raw || "").trim();
}

function stripLocationSuffix(value: unknown) {
  return String(value || "")
    .replace(/,\s*(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC|Sheikh Zayed Road)\s*$/i, "")
    .replace(/\b(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC)\s*$/i, "")
    .replace(/\bDubai\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function expandCommonBuildingAbbreviations(value: unknown) {
  return String(value || "")
    .replace(/&/g, " and ")
    .replace(/\bblvd\.?\b/gi, "Boulevard")
    .replace(/\bbldg\.?\b/gi, "Building")
    .replace(/\btwr\.?\b/gi, "Tower")
    .replace(/\bresid\.?\b/gi, "Residence")
    .replace(/\bres\.?\b/gi, "Residence")
    .replace(/\bapts?\.?\b/gi, "Apartments")
    .replace(/\bapt\.?\b/gi, "Apartment");
}

function compressCommonBuildingAbbreviations(value: unknown) {
  return String(value || "")
    .replace(/&/g, " and ")
    .replace(/\bboulevard\b/gi, "Blvd")
    .replace(/\bbuilding\b/gi, "Bldg")
    .replace(/\btower\b/gi, "Twr")
    .replace(/\bresidence\b/gi, "Res")
    .replace(/\bapartments?\b/gi, "Apt");
}

function replaceNumberWords(value: unknown) {
  return String(value || "")
    .replace(/\bone\b/gi, "1")
    .replace(/\btwo\b/gi, "2")
    .replace(/\bthree\b/gi, "3")
    .replace(/\bfour\b/gi, "4")
    .replace(/\bfive\b/gi, "5");
}

function getBuildingKeyVariants(raw: unknown) {
  const cleaned = cleanBuildingName(raw);
  const variants = new Set<string>();
  const addVariant = (value: unknown) => {
    const trimmed = String(value || "").replace(/\s+/g, " ").trim();
    if (trimmed) variants.add(trimmed);
  };
  const addDerivedVariants = (value: unknown) => {
    const base = stripLocationSuffix(value);
    addVariant(base);
    addVariant(expandCommonBuildingAbbreviations(base));
    addVariant(compressCommonBuildingAbbreviations(base));
    addVariant(base.replace(/^the\s+/i, ""));
    addVariant(`The ${base.replace(/^the\s+/i, "")}`);
    addVariant(base.replace(/\btowers\b/gi, "Tower"));
    addVariant(base.replace(/\bresidences\b/gi, "Residence"));
    addVariant(base.replace(/\b(towers?|buildings?|blocks?|offices?|hotels?|apartments?)\b/gi, " "));
    addVariant(base.replace(/\bTower\s+A\b/gi, "Tower 1"));
    addVariant(base.replace(/\bTower\s+B\b/gi, "Tower 2"));
    addVariant(base.replace(/\bTower\s+1\b/gi, "Tower A"));
    addVariant(base.replace(/\bTower\s+2\b/gi, "Tower B"));
    addVariant(base.replace(/\bTower\s+([A-Za-z0-9]+)\b/gi, "T$1"));
    addVariant(base.replace(/\bT\s*([A-Za-z0-9]+)\b/gi, "Tower $1"));
    addVariant(base.replace(/\b([A-Za-z])\b$/i, "Tower $1"));
    addVariant(base.replace(/\s+(?:Tower\s+|T\s*)?(?:\d+|[A-Z])$/i, ""));
  };

  addDerivedVariants(cleaned);
  addDerivedVariants(replaceNumberWords(cleaned));
  for (const variant of [...variants]) {
    addDerivedVariants(variant);
  }

  const keys = new Set<string>();
  for (const variant of variants) {
    for (const candidate of [variant, stripLocationSuffix(variant), variant.replace(/^the\s+/i, "")]) {
      for (const form of [
        candidate,
        expandCommonBuildingAbbreviations(candidate),
        compressCommonBuildingAbbreviations(candidate),
        replaceNumberWords(candidate),
        replaceNumberWords(expandCommonBuildingAbbreviations(candidate)),
        replaceNumberWords(compressCommonBuildingAbbreviations(candidate)),
      ]) {
        const normalized = normalizeToken(
          form
            .replace(/\bresidences\b/gi, "Residence")
            .replace(/\btowers\b/gi, "Tower"),
        );
        if (normalized) keys.add(normalized);
      }
    }
  }

  return [...keys];
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function isMissingBuildingAliasesTableError(error: any) {
  const message = String(error?.message || "");
  return error?.code === "42P01" || message.includes("building_aliases");
}

async function getBuildingKeyVariantsWithAliases(adminClient: any, userId: string, raw: unknown) {
  const baseKeys = getBuildingKeyVariants(raw);
  const keys = new Set(baseKeys);
  if (!userId || !baseKeys.length) return [...keys];

  for (const batch of chunkArray(baseKeys, 100)) {
    const { data, error } = await adminClient
      .from("building_aliases")
      .select("user_id, alias_key, canonical_name, is_global")
      .or(`is_global.eq.true,user_id.eq.${userId}`)
      .in("alias_key", batch);

    if (error) {
      if (isMissingBuildingAliasesTableError(error)) return [...keys];
      throw new HttpError(500, error.message);
    }

    const globalNamesByAlias = new Map<string, Set<string>>();
    const userNamesByAlias = new Map<string, Set<string>>();
    for (const alias of data || []) {
      const aliasKey = cleanString(alias.alias_key);
      const canonicalName = cleanString(alias.canonical_name);
      if (!aliasKey || !canonicalName) continue;

      const target = alias.is_global === true
        ? globalNamesByAlias
        : cleanString(alias.user_id) === userId
          ? userNamesByAlias
          : null;
      if (!target) continue;

      const names = target.get(aliasKey) || new Set<string>();
      names.add(canonicalName);
      target.set(aliasKey, names);
    }

    for (const aliasKey of batch) {
      const canonicalNames = userNamesByAlias.get(aliasKey)?.size
        ? userNamesByAlias.get(aliasKey)
        : globalNamesByAlias.get(aliasKey);
      if (!canonicalNames?.size) continue;

      for (const canonicalName of canonicalNames) {
        for (const key of getBuildingKeyVariants(canonicalName)) keys.add(key);
      }
    }
  }

  return [...keys];
}

function getDubaiDateKey(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Dubai",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!values.year || !values.month || !values.day) return null;
  return `${values.year}-${values.month}-${values.day}`;
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
  imageUrl?: string | null;
  templateLanguage?: string | null;
  templateName?: string | null;
  templateParameters?: unknown;
  to: string;
  type?: string | null;
}) {
  const envTemplateName = Deno.env.get("WHATSAPP_DEFAULT_TEMPLATE_NAME");
  const templateName = input.templateName || envTemplateName || null;
  const messageType = input.imageUrl
    ? "image"
    : input.type === "template" || (!input.type && templateName)
      ? "template"
      : "text";

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
  if (input.imageUrl) {
    if (body.length > WHATSAPP_IMAGE_CAPTION_MAX_LENGTH) {
      throw new HttpError(400, "Image captions must be 1,024 characters or fewer after placeholders are filled.");
    }
    return {
      messaging_product: "whatsapp",
      to: input.to,
      type: "image",
      image: {
        link: input.imageUrl,
        caption: body,
      },
    };
  }
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

function buildBaileysPayload(input: { body?: string | null; imageUrl?: string | null; to: string }) {
  const body = String(input.body || "").trim();
  if (!body) throw new HttpError(400, "message body is required");
  if (input.imageUrl) {
    if (body.length > WHATSAPP_IMAGE_CAPTION_MAX_LENGTH) {
      throw new HttpError(400, "Image captions must be 1,024 characters or fewer after placeholders are filled.");
    }
    return {
      to: input.to,
      type: "image",
      image: {
        url: input.imageUrl,
        caption: body,
      },
    };
  }
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
    .select("id, user_id, name, phone, building")
    .eq("user_id", userId)
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Lead not found");

  return data;
}

async function assertLeadHasTodaysTransaction(adminClient: any, userId: string, lead: any) {
  if (!lead) return null;

  const buildingKeys = await getBuildingKeyVariantsWithAliases(adminClient, userId, lead.building);
  if (!buildingKeys.length) {
    throw new HttpError(409, "This seller has no building to match against today's transactions.");
  }

  const todayDateKey = getDubaiDateKey();
  if (!todayDateKey) throw new HttpError(500, "Could not resolve today's transaction date.");

  const { data, error } = await adminClient
    .from("transactions")
    .select("id")
    .in("building_key", buildingKeys)
    .eq("date", todayDateKey)
    .limit(1);

  if (error) throw new HttpError(500, error.message);
  if (!data?.length) {
    throw new HttpError(409, `No transaction dated ${todayDateKey} was found for this seller's building.`);
  }

  return todayDateKey;
}

async function assertNoLeadMessageForMarketDate(adminClient: any, userId: string, leadId: string | number, transactionDate: string) {
  const { data, error } = await adminClient
    .from("whatsapp_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .eq("direction", "outbound")
    .eq("market_transaction_date", transactionDate)
    .in("status", ACTIVE_MARKET_MESSAGE_STATUSES)
    .limit(1);

  if (error) throw new HttpError(500, error.message);
  if (data?.length) {
    throw new HttpError(409, `A WhatsApp message already exists for this seller's ${transactionDate} transaction update.`);
  }
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

async function resolveTemplateImageUrl(adminClient: any, userId: string, rawImagePath: unknown) {
  const imagePath = cleanString(rawImagePath);
  if (!imagePath) return null;
  if (!imagePath.startsWith(`${userId}/`)) {
    throw new HttpError(400, "Invalid template image path");
  }

  const { data: template, error: templateError } = await adminClient
    .from("seller_signal_message_templates")
    .select("id")
    .eq("user_id", userId)
    .eq("image_path", imagePath)
    .maybeSingle();
  if (templateError) throw new HttpError(500, templateError.message);
  if (!template) throw new HttpError(400, "Template image was not found");

  const { data, error } = await adminClient.storage
    .from(TEMPLATE_IMAGE_BUCKET)
    .createSignedUrl(imagePath, TEMPLATE_IMAGE_SIGNED_URL_TTL_SECONDS);
  if (error) throw new HttpError(500, error.message);
  if (!data?.signedUrl) throw new HttpError(500, "Could not create a template image URL");
  return data.signedUrl;
}

async function sendViaBaileys(account: any, to: string, body: string, imageUrl: string | null) {
  const sessionId = getBaileysSessionId(account);
  if (!sessionId) throw new HttpError(409, "Baileys session is not configured");

  return baileysFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ imageUrl, text: body, to }),
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

function normalizeUuid(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null;
}

function getInitiatedVia(input: any, sendSource: string) {
  const clientKind = String(input?.clientKind || "").trim().toLowerCase();
  return CLIENT_KINDS.has(clientKind) ? clientKind : "api";
}

async function findClientRequest(adminClient: any, userId: string, clientRequestId: string | null) {
  if (!clientRequestId) return null;
  const { data, error } = await adminClient
    .from("whatsapp_messages")
    .select("id, meta_message_id, sent_at, status")
    .eq("user_id", userId)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  return data || null;
}

async function assertNoRapidRepeat(adminClient: any, userId: string, to: string) {
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data, error } = await adminClient
    .from("whatsapp_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .eq("recipient_phone", to)
    .in("status", ["sending", "sent", "delivered", "read"])
    .gte("created_at", cutoff)
    .limit(1);

  if (error) throw new HttpError(500, error.message);
  if (data?.length) {
    throw new HttpError(409, "Duplicate WhatsApp send blocked: this recipient was contacted less than 60 seconds ago.");
  }
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
    const clientRequestId = normalizeUuid(input.clientRequestId);
    const existingRequest = await findClientRequest(adminClient, userId, clientRequestId);
    if (existingRequest) {
      return jsonResponse({
        duplicateRequest: true,
        messageId: existingRequest.id,
        metaMessageId: existingRequest.meta_message_id,
        sentAt: existingRequest.sent_at,
        status: existingRequest.status,
      });
    }
    const lead = await getLead(adminClient, userId, input.leadId || null);
    let marketTransactionDate: string | null = null;
    if (lead && input.requireTodaysTransaction !== false) {
      marketTransactionDate = await assertLeadHasTodaysTransaction(adminClient, userId, lead);
      if (marketTransactionDate) await assertNoLeadMessageForMarketDate(adminClient, userId, lead.id, marketTransactionDate);
    }
    const account = await getConnectedAccount(adminClient, userId, input.accountId || null);
    const to = normalizeWhatsAppPhone(input.to || lead?.phone);
    if (!to) throw new HttpError(400, "Recipient phone number is required");
    const requestedSource = String(input.sendSource || "");
    const sendSource = USER_SEND_SOURCES.has(requestedSource) ? requestedSource : "manual";
    const initiatedVia = getInitiatedVia(input, sendSource);
    await assertNoRapidRepeat(adminClient, userId, to);
    const imageUrl = await resolveTemplateImageUrl(adminClient, userId, input.imagePath);

    const isBaileys = account.provider === "baileys";
    const payload = isBaileys
      ? buildBaileysPayload({ body: input.body, imageUrl, to })
      : buildGraphPayload({
          body: input.body,
          imageUrl,
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
        send_source: sendSource,
        market_transaction_date: marketTransactionDate,
        initiated_by: userId,
        initiated_via: initiatedVia,
        client_request_id: clientRequestId,
      })
      .select("id")
      .single();

    if (insertError?.code === "23505" && marketTransactionDate) {
      throw new HttpError(409, `A WhatsApp message already exists for this seller's ${marketTransactionDate} transaction update.`);
    }
    if (insertError) throw new HttpError(500, insertError.message);
    messageRowId = messageRow.id;

    let providerPayload: any = null;
    let providerMessageId: string | null = null;

    if (isBaileys) {
      providerPayload = await sendViaBaileys(account, to, input.body, imageUrl);
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

    return jsonResponse({
      clientRequestId,
      initiatedVia,
      messageId: messageRowId,
      metaMessageId: providerMessageId,
      sendSource,
      sentAt,
    });
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
