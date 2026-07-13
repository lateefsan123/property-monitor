import { getSupabaseAdminClient } from "./config.js";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const ACTIVE_MARKET_MESSAGE_STATUSES = ["queued", "sending", "sent", "delivered", "read"];
const SEND_SOURCES = new Set(["manual", "bulk", "mcp", "auto"]);

export class SubscriptionRequiredError extends Error {
  constructor(message = "Seller Signal subscription is required to use the ChatGPT app.") {
    super(message);
    this.name = "SubscriptionRequiredError";
  }
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || null;
}

export function normalizeWhatsAppPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("3530")) return `353${digits.slice(4)}`;
  if (digits.startsWith("9710")) return `971${digits.slice(4)}`;
  if (digits.startsWith("0")) return `971${digits.slice(1)}`;
  return digits || null;
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanBuildingName(raw) {
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

function stripLocationSuffix(value) {
  return String(value || "")
    .replace(/,\s*(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC|Sheikh Zayed Road)\s*$/i, "")
    .replace(/\b(Downtown Dubai|Downtown|Old Town Dubai|Old Town|Business Bay|City Walk|DIFC)\s*$/i, "")
    .replace(/\bDubai\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function expandCommonBuildingAbbreviations(value) {
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

function compressCommonBuildingAbbreviations(value) {
  return String(value || "")
    .replace(/&/g, " and ")
    .replace(/\bboulevard\b/gi, "Blvd")
    .replace(/\bbuilding\b/gi, "Bldg")
    .replace(/\btower\b/gi, "Twr")
    .replace(/\bresidence\b/gi, "Res")
    .replace(/\bapartments?\b/gi, "Apt");
}

function replaceNumberWords(value) {
  return String(value || "")
    .replace(/\bone\b/gi, "1")
    .replace(/\btwo\b/gi, "2")
    .replace(/\bthree\b/gi, "3")
    .replace(/\bfour\b/gi, "4")
    .replace(/\bfive\b/gi, "5");
}

function getBuildingKeyVariants(raw) {
  const cleaned = cleanBuildingName(raw);
  const variants = new Set();
  const addVariant = (value) => {
    const trimmed = String(value || "").replace(/\s+/g, " ").trim();
    if (trimmed) variants.add(trimmed);
  };
  const addDerivedVariants = (value) => {
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

  const keys = new Set();
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

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function isMissingBuildingAliasesTableError(error) {
  const message = String(error?.message || "");
  return error?.code === "42P01" || message.includes("building_aliases");
}

async function getBuildingKeyVariantsWithAliases(userId, raw) {
  const baseKeys = getBuildingKeyVariants(raw);
  const keys = new Set(baseKeys);
  if (!userId || !baseKeys.length) return [...keys];

  for (const batch of chunkArray(baseKeys, 100)) {
    const { data, error } = await getSupabaseAdminClient()
      .from("building_aliases")
      .select("user_id, alias_key, canonical_name, is_global")
      .or(`is_global.eq.true,user_id.eq.${userId}`)
      .in("alias_key", batch);

    if (error) {
      if (isMissingBuildingAliasesTableError(error)) return [...keys];
      throw new Error(error.message);
    }

    const globalNamesByAlias = new Map();
    const userNamesByAlias = new Map();
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

      const names = target.get(aliasKey) || new Set();
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

function getBaileysSessionId(account) {
  const rawSessionId = cleanString(account?.raw_account?.baileys?.session_id);
  if (rawSessionId) return rawSessionId;

  const phoneNumberId = cleanString(account?.phone_number_id);
  if (phoneNumberId?.startsWith("baileys:")) return phoneNumberId.slice("baileys:".length);
  return null;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function shouldRequireSubscription() {
  return process.env.SELLER_SIGNAL_MCP_REQUIRE_SUBSCRIPTION !== "0";
}

function getAuthenticatedUserId(authInfo) {
  const userId = authInfo?.extra?.userId || process.env.SELLER_SIGNAL_MCP_AUTH_USER_ID;
  if (typeof userId === "string" && userId.trim()) return userId.trim();
  throw new Error("Authenticated Seller Signal account required. Reconnect the MCP server with OAuth.");
}

export function getAuthenticatedEmail(authInfo) {
  const email = authInfo?.extra?.email || process.env.SELLER_SIGNAL_MCP_AUTH_EMAIL;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export function getToolUserId(authInfo) {
  return getAuthenticatedUserId(authInfo);
}

export async function isUserSubscribed(userId) {
  if (!userId) return false;

  const { data, error } = await getSupabaseAdminClient()
    .from("billing_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return false;
    throw new Error(error.message);
  }

  if (!data || !ACTIVE_SUBSCRIPTION_STATUSES.has(data.status)) return false;
  if (!data.current_period_end) return true;

  const currentPeriodEnd = Date.parse(data.current_period_end);
  return Number.isNaN(currentPeriodEnd) || currentPeriodEnd > Date.now();
}

export async function assertUserHasSubscription(userId) {
  if (!shouldRequireSubscription()) return;
  if (await isUserSubscribed(userId)) return;
  throw new SubscriptionRequiredError(
    "Seller Signal subscription is required to use the ChatGPT app. Start or restore your subscription, then reconnect the app.",
  );
}

function sanitizeIlikeTerm(value) {
  return String(value || "").trim().replace(/[%_,]/g, " ");
}

function compactLead(row) {
  return {
    id: row.id,
    name: row.name || "",
    building: row.building || "",
    bedroom: row.bedroom || "",
    unit: row.unit || "",
    phone: row.phone || "",
    status: row.status || "",
    lastContact: row.last_contact || null,
    notes: row.notes || "",
    sentAt: row.sent_at || null,
    sourceId: row.source_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function normalizeDateInput(value) {
  const text = cleanString(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("lastContact must be a valid date, preferably YYYY-MM-DD.");
  }
  return parsed.toISOString().slice(0, 10);
}

async function validateLeadSource(userId, sourceId) {
  const id = cleanString(sourceId);
  if (!id) return null;

  const { data, error } = await getSupabaseAdminClient()
    .from("lead_sources")
    .select("id")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Lead source not found: ${id}`);
  return data.id;
}

export async function getAccountSummary(authInfo) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);
  const client = getSupabaseAdminClient();

  const [activeLeads, doneLeads, whatsappAccounts] = await Promise.all([
    client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("sent_at", null),
    client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("sent_at", "is", null),
    client
      .from("whatsapp_accounts")
      .select("id, provider, display_phone_number, business_name, connection_status, connected_at")
      .eq("user_id", userId)
      .order("connected_at", { ascending: false }),
  ]);

  for (const result of [activeLeads, doneLeads, whatsappAccounts]) {
    if (result.error && result.error.code !== "42P01") throw new Error(result.error.message);
  }

  return {
    userId,
    email: getAuthenticatedEmail(authInfo),
    subscriptionRequired: shouldRequireSubscription(),
    leadCounts: {
      active: activeLeads.count || 0,
      done: doneLeads.count || 0,
    },
    whatsappAccounts: whatsappAccounts.data || [],
  };
}

export async function addLead(authInfo, input = {}) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);

  const row = {
    user_id: userId,
    name: cleanString(input.name),
    building: cleanString(input.building),
    bedroom: cleanString(input.bedroom),
    unit: cleanString(input.unit),
    phone: cleanString(input.phone),
    status: cleanString(input.status),
    last_contact: normalizeDateInput(input.lastContact),
    notes: input.notes === undefined ? null : String(input.notes || ""),
    source_id: await validateLeadSource(userId, input.sourceId),
  };

  if (!row.name && !row.building && !row.phone) {
    throw new Error("At least one of name, building, or phone is required to add a lead.");
  }

  const { data, error } = await getSupabaseAdminClient()
    .from("leads")
    .insert(row)
    .select("id, name, building, bedroom, unit, phone, status, last_contact, notes, sent_at, source_id, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return compactLead(data);
}

export async function listLeads(authInfo, input = {}) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);
  const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 100);
  let query = getSupabaseAdminClient()
    .from("leads")
    .select("id, name, building, bedroom, unit, phone, status, last_contact, notes, sent_at, source_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(limit);

  if (input.status === "active") query = query.is("sent_at", null);
  if (input.status === "done") query = query.not("sent_at", "is", null);
  if (input.sourceId) query = query.eq("source_id", input.sourceId);

  const term = sanitizeIlikeTerm(input.search);
  if (term) {
    query = query.or([
      `name.ilike.%${term}%`,
      `building.ilike.%${term}%`,
      `phone.ilike.%${term}%`,
      `unit.ilike.%${term}%`,
    ].join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return {
    leads: (data || []).map(compactLead),
    limit,
  };
}

export async function getLead(authInfo, leadId) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);
  const id = String(leadId || "").trim();
  if (!id) throw new Error("leadId is required");

  const { data, error } = await getSupabaseAdminClient()
    .from("leads")
    .select("id, name, building, bedroom, unit, phone, status, last_contact, notes, sent_at, source_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Lead not found: ${id}`);
  return compactLead(data);
}

export async function updateLead(authInfo, input = {}) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);
  const leadId = String(input.leadId || "").trim();
  if (!leadId) throw new Error("leadId is required");

  const patch = {};
  if (input.status !== undefined) patch.status = cleanString(input.status);
  if (input.notes !== undefined) patch.notes = String(input.notes || "");
  if (input.lastContact !== undefined) patch.last_contact = cleanString(input.lastContact);
  if (input.markSent === true) patch.sent_at = new Date().toISOString();
  if (input.markSent === false) patch.sent_at = null;

  if (!Object.keys(patch).length) throw new Error("At least one field is required to update a lead");

  const { data, error } = await getSupabaseAdminClient()
    .from("leads")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", leadId)
    .select("id, name, building, bedroom, unit, phone, status, last_contact, notes, sent_at, source_id, created_at, updated_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Lead not found: ${leadId}`);
  return compactLead(data);
}

export async function listWhatsAppAccounts(authInfo) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);

  const { data, error } = await getSupabaseAdminClient()
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

export async function listWhatsAppMessages(authInfo, input = {}) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);
  const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 100);
  let query = getSupabaseAdminClient()
    .from("whatsapp_messages")
    .select("id, account_id, lead_id, direction, recipient_phone, message_type, body, status, meta_message_id, error_message, sent_at, delivered_at, read_at, failed_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.direction) query = query.eq("direction", input.direction);
  if (input.leadId) query = query.eq("lead_id", input.leadId);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return { messages: [], limit };
    throw new Error(error.message);
  }

  return { messages: data || [], limit };
}

async function baileysFetch(path, options = {}) {
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
    throw new Error(payload?.error || `Baileys service request failed with ${response.status}`);
  }
  return payload;
}

async function getConnectedAccount(userId, accountId) {
  let query = getSupabaseAdminClient()
    .from("whatsapp_accounts")
    .select("id, user_id, provider, phone_number_id, display_phone_number, connection_status, raw_account")
    .eq("user_id", userId)
    .eq("connection_status", "connected");

  if (accountId) query = query.eq("id", accountId);

  const { data, error } = await query.order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No connected WhatsApp account");
  return data;
}

async function getLeadForMessage(userId, leadId) {
  if (!leadId) return null;

  const { data, error } = await getSupabaseAdminClient()
    .from("leads")
    .select("id, user_id, name, phone, building")
    .eq("user_id", userId)
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Lead not found: ${leadId}`);
  return data;
}

async function assertLeadHasTodaysTransaction(userId, lead) {
  if (!lead) return null;

  const buildingKeys = await getBuildingKeyVariantsWithAliases(userId, lead.building);
  if (!buildingKeys.length) {
    throw new Error("This seller has no building to match against today's transactions.");
  }

  const todayDateKey = getDubaiDateKey();
  if (!todayDateKey) throw new Error("Could not resolve today's transaction date.");

  const { data, error } = await getSupabaseAdminClient()
    .from("transactions")
    .select("id")
    .in("building_key", buildingKeys)
    .eq("date", todayDateKey)
    .limit(1);

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error(`No transaction dated ${todayDateKey} was found for this seller's building.`);
  }

  return todayDateKey;
}

async function assertNoLeadMessageForMarketDate(userId, leadId, transactionDate) {
  const { data, error } = await getSupabaseAdminClient()
    .from("whatsapp_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .eq("direction", "outbound")
    .eq("market_transaction_date", transactionDate)
    .in("status", ACTIVE_MARKET_MESSAGE_STATUSES)
    .limit(1);

  if (error) throw new Error(error.message);
  if (data?.length) {
    throw new Error(`A WhatsApp message already exists for this seller's ${transactionDate} transaction update.`);
  }
}

async function getAccountSecret(accountId) {
  const { data, error } = await getSupabaseAdminClient()
    .from("whatsapp_account_secrets")
    .select("access_token")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.access_token) throw new Error("WhatsApp account token is not configured");
  return data.access_token;
}

async function sendViaBaileys(account, to, body) {
  const sessionId = getBaileysSessionId(account);
  if (!sessionId) throw new Error("Baileys session is not configured");

  return baileysFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: body, to }),
  });
}

async function sendViaMeta(account, to, body) {
  const accessToken = await getAccountSecret(account.id);
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0";
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body,
      preview_url: false,
    },
  };

  const response = await fetch(
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
  const providerPayload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(providerPayload?.error?.message || `WhatsApp API request failed with ${response.status}`);
  }
  return {
    messageId: providerPayload?.messages?.[0]?.id || null,
    raw: providerPayload,
    sent: true,
    sentAt: new Date().toISOString(),
  };
}

async function markLeadSent(userId, leadId, sentAt) {
  const client = getSupabaseAdminClient();
  const { error: leadError } = await client
    .from("leads")
    .update({ sent_at: sentAt })
    .eq("user_id", userId)
    .eq("id", leadId);

  if (leadError) throw new Error(leadError.message);

  const { error: sentLeadError } = await client
    .from("sent_leads")
    .upsert({ user_id: userId, lead_id: leadId, sent_at: sentAt }, { onConflict: "user_id,lead_id" });

  if (sentLeadError && sentLeadError.code !== "42P01") {
    console.warn("Could not sync legacy sent_leads row:", sentLeadError.message);
  }
}

export async function sendWhatsAppMessage(authInfo, input = {}) {
  const userId = getAuthenticatedUserId(authInfo);
  await assertUserHasSubscription(userId);
  const body = String(input.body || "").trim();
  if (!body) throw new Error("body is required");

  const lead = await getLeadForMessage(userId, input.leadId || null);
  let marketTransactionDate = null;
  if (lead && input.requireTodaysTransaction !== false) {
    marketTransactionDate = await assertLeadHasTodaysTransaction(userId, lead);
    if (marketTransactionDate) await assertNoLeadMessageForMarketDate(userId, lead.id, marketTransactionDate);
  }
  const account = await getConnectedAccount(userId, input.accountId || null);
  const to = normalizeWhatsAppPhone(input.to || lead?.phone);
  if (!to) throw new Error("Recipient phone number is required");
  const sendSource = SEND_SOURCES.has(String(input.sendSource || "")) ? String(input.sendSource) : "mcp";

  const client = getSupabaseAdminClient();
  const { data: messageRow, error: insertError } = await client
    .from("whatsapp_messages")
    .insert({
      user_id: userId,
      account_id: account.id,
      lead_id: lead?.id || null,
      direction: "outbound",
      recipient_phone: to,
      message_type: "text",
      body,
      status: "sending",
      raw_request: {
        to,
        type: "text",
        text: { body, preview_url: false },
      },
      send_source: sendSource,
      market_transaction_date: marketTransactionDate,
    })
    .select("id")
    .single();

  if (insertError?.code === "23505" && marketTransactionDate) {
    throw new Error(`A WhatsApp message already exists for this seller's ${marketTransactionDate} transaction update.`);
  }
  if (insertError) throw new Error(insertError.message);

  try {
    const providerPayload = account.provider === "baileys"
      ? await sendViaBaileys(account, to, body)
      : await sendViaMeta(account, to, body);
    const providerMessageId = providerPayload?.messageId || providerPayload?.raw?.messages?.[0]?.id || null;
    const sentAt = new Date().toISOString();

    const { error: updateError } = await client
      .from("whatsapp_messages")
      .update({
        status: "sent",
        meta_message_id: providerMessageId,
        raw_response: providerPayload || {},
        sent_at: sentAt,
      })
      .eq("id", messageRow.id);

    if (updateError) throw new Error(updateError.message);
    if (lead?.id) await markLeadSent(userId, lead.id, sentAt);

    return {
      messageId: messageRow.id,
      metaMessageId: providerMessageId,
      recipientPhone: to,
      leadId: lead?.id || null,
      sentAt,
      account: {
        id: account.id,
        provider: account.provider,
        displayPhoneNumber: account.display_phone_number || null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await client
      .from("whatsapp_messages")
      .update({
        status: "failed",
        error_message: message,
        failed_at: new Date().toISOString(),
      })
      .eq("id", messageRow.id);
    throw error;
  }
}
