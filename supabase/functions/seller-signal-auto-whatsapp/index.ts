import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auto-whatsapp-token",
};

const ACTIVE_MESSAGE_STATUSES = ["queued", "sending", "sent", "delivered", "read"];
const DATA_PAGE_SIZE = 1000;
// DLD labels fractional/nominal transfers (share transfers, installment
// registrations) as "Sale" with tiny amounts (e.g. AED 3,318 for a 1-bed).
// Never surface them as market comps in seller messages.
const MIN_SALE_AMOUNT = 100_000;
const RECENT_TRANSACTIONS_LIMIT = 2;
const DEFAULT_MAX_SENDS_PER_RUN = 2;
const DEFAULT_DAILY_CAP = 40;
// Zero means scan every eligible lead. PostgREST caps a single response at
// 1,000 rows, so fetchScannableLeads paginates until the full set is loaded.
const DEFAULT_MAX_LEADS_PER_RUN = 0;
const DEFAULT_LOOKBACK_DAYS = 2;
// Per-seller cooldown: hot buildings trade several times a week, and unlimited
// per-date alerts meant the same sellers got 3-4 messages a fortnight while
// the daily cap starved everyone else (max observed: 4 in 14 days).
const DEFAULT_COOLDOWN_HOURS = 7 * 24;
// Quiet-hours guard: no overnight sends. Evening sends are standard practice
// in Dubai real estate, so the window runs to 21:00 (the ~19:00 DLD batch
// still goes out the same evening). Override via
// SELLER_SIGNAL_AUTO_WHATSAPP_SEND_WINDOW_START/END env vars.
const DEFAULT_SEND_WINDOW_START_HOUR = 9;
const DEFAULT_SEND_WINDOW_END_HOUR = 21;
const TEMPLATE_IMAGE_BUCKET = "seller-signal-template-images";
const TEMPLATE_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;
const WHATSAPP_IMAGE_CAPTION_MAX_LENGTH = 1024;
const DEFAULT_MESSAGE_TEMPLATE = `Hi {{name}}, quick update on recent transactions in {{building}}.

{{transactions}}

Buyer activity remains strong, and your unit is in hot demand.

If you would like to further discuss the sale of your unit, please let me know.`;

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

function getNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cleanString(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
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

function getDubaiDayBoundsUtc(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const start = new Date(`${dateKey}T00:00:00+04:00`);
  if (Number.isNaN(start.getTime())) return null;
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function getDubaiHour(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Dubai",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return Number.isFinite(hour) ? hour % 24 : null;
}

// Mirrors the app's not_interested status rule so opted-out sellers are never
// auto-messaged, in line with UAE telemarketing rules (no contact after rejection).
function isNotInterestedStatus(status: unknown) {
  const normalized = normalizeToken(status);
  if (!normalized) return false;
  return ["notinterested", "ni", "cold"].some((keyword) => normalized.includes(keyword));
}

function getDubaiStartDateKey(inputValue: unknown) {
  const value = cleanString(inputValue) || cleanString(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_START_DUBAI_DATE"));
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(500, "SELLER_SIGNAL_AUTO_WHATSAPP_START_DUBAI_DATE must use YYYY-MM-DD.");
  }
  return value;
}

function formatDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" });
}

function formatPriceShort(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M AED`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K AED`;
  return `${Math.round(amount)} AED`;
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value || "").replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBeds(transaction: any) {
  for (const value of [transaction?.beds, transaction?.bedrooms, transaction?.rooms, transaction?.property?.beds]) {
    const numeric = parseNumber(value);
    if (numeric !== null && numeric >= 0) return Math.round(numeric);

    const match = String(value || "").match(/(\d+)/);
    if (match) return Number(match[1]);
  }

  return null;
}

function extractTransactionLocationLabel(transaction: any, fallback: string | null = null) {
  const fullLocation = transaction?.full_location || transaction?.location?.full_location;
  if (typeof fullLocation === "string" && fullLocation.trim()) {
    const parts = fullLocation.split("->").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  for (const value of [transaction?.location_name, transaction?.building_name, transaction?.project_name, transaction?.tower_name, transaction?.property_name, transaction?.area_name]) {
    const label = String(value || "").trim();
    if (label) return label;
  }

  return fallback || "-";
}

function buildRecentTransactions(transactions: any[], fallbackLocation: string | null) {
  return transactions
    .map((transaction, index) => {
      const price = parseNumber(transaction?.amount ?? transaction?.price ?? transaction?.sale_price);
      if (!price) return null;
      const area = parseNumber(transaction?.builtup_area_sqft ?? transaction?.area ?? transaction?.sqft);

      return {
        id: transaction?.id || `${index}-${price}`,
        date: transaction?.date,
        price,
        beds: extractBeds(transaction),
        area,
        locationLabel: extractTransactionLocationLabel(transaction, fallbackLocation),
        floor: transaction?.floor || null,
      };
    })
    .filter((transaction): transaction is {
      area: number | null;
      beds: number | null;
      date: unknown;
      floor: unknown;
      id: unknown;
      locationLabel: string;
      price: number;
    } => Boolean(transaction))
    .sort((left, right) => String(right?.date || "").localeCompare(String(left?.date || "")))
    .slice(0, RECENT_TRANSACTIONS_LIMIT);
}

function buildMessage(
  lead: any,
  transactions: any[],
  fallbackLocation: string | null,
  templateContent = DEFAULT_MESSAGE_TEMPLATE,
) {
  const name = cleanString(lead.name) || "there";
  const cleanedBuilding = cleanBuildingName(lead.building) || "your building";
  const transactionLines: string[] = [];

  for (const transaction of buildRecentTransactions(transactions, fallbackLocation)) {
    const parts = [];
    if (transaction.locationLabel && transaction.locationLabel !== "-") parts.push(transaction.locationLabel);
    if (transaction.beds !== null && transaction.beds !== undefined) {
      parts.push(transaction.beds === 0 ? "Studio" : `${transaction.beds} Bed`);
    }
    parts.push(formatPriceShort(transaction.price));
    if (transaction.area) parts.push(`${Math.round(transaction.area).toLocaleString("en-US")} sqft`);
    if (transaction.date) parts.push(formatDate(transaction.date));
    transactionLines.push(`- ${parts.join(" | ")}`);
  }

  const safeTemplate = String(templateContent || DEFAULT_MESSAGE_TEMPLATE).includes("{{transactions}}")
    ? String(templateContent || DEFAULT_MESSAGE_TEMPLATE)
    : DEFAULT_MESSAGE_TEMPLATE;

  return safeTemplate
    .replaceAll("{{name}}", name)
    .replaceAll("{{building}}", cleanedBuilding)
    .replaceAll("{{transactions}}", transactionLines.join("\n"))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchDefaultMessageTemplates(adminClient: any, userIds: string[]) {
  const templatesByUser = new Map<string, { content: string; imagePath: string | null }>();
  if (!userIds.length) return templatesByUser;

  const { data, error } = await adminClient
    .from("seller_signal_message_templates")
    .select("user_id, content, image_path")
    .in("user_id", userIds)
    .eq("is_default", true);

  if (error) {
    if (error.code === "42P01") return templatesByUser;
    throw new HttpError(500, error.message);
  }

  for (const template of data || []) {
    if (String(template.content || "").includes("{{transactions}}")) {
      templatesByUser.set(template.user_id, {
        content: template.content,
        imagePath: cleanString(template.image_path),
      });
    }
  }
  return templatesByUser;
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

function buildGraphPayload(input: { body: string; imageUrl?: string | null; to: string }) {
  if (input.imageUrl) {
    if (input.body.length > WHATSAPP_IMAGE_CAPTION_MAX_LENGTH) {
      throw new HttpError(400, "Image captions must be 1,024 characters or fewer after placeholders are filled.");
    }
    return {
      messaging_product: "whatsapp",
      to: input.to,
      type: "image",
      image: {
        link: input.imageUrl,
        caption: input.body,
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    to: input.to,
    type: "text",
    text: {
      body: input.body,
      preview_url: false,
    },
  };
}

function buildBaileysPayload(input: { body: string; imageUrl?: string | null; to: string }) {
  if (input.imageUrl) {
    if (input.body.length > WHATSAPP_IMAGE_CAPTION_MAX_LENGTH) {
      throw new HttpError(400, "Image captions must be 1,024 characters or fewer after placeholders are filled.");
    }
    return {
      to: input.to,
      type: "image",
      image: {
        url: input.imageUrl,
        caption: input.body,
      },
    };
  }
  return {
    to: input.to,
    type: "text",
    text: {
      body: input.body,
      preview_url: false,
    },
  };
}

async function createTemplateImageUrl(adminClient: any, imagePath: string | null) {
  if (!imagePath) return null;
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

function chunkArray<T>(items: T[], size: number) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

async function fetchScannableLeads(adminClient: any, userIds: string[], maxLeads: number) {
  const leads: any[] = [];
  if (!userIds.length) return leads;

  while (maxLeads === 0 || leads.length < maxLeads) {
    const remaining = maxLeads > 0 ? maxLeads - leads.length : DATA_PAGE_SIZE;
    const pageSize = Math.min(DATA_PAGE_SIZE, remaining);
    const from = leads.length;
    // Never-contacted sellers first, then longest-since-contacted, so the
    // daily cap spreads across the pipeline instead of repeatedly hitting the
    // same low-id sellers in hot buildings.
    const { data, error } = await adminClient
      .from("leads")
      .select("id, user_id, name, phone, building, sent_at, status")
      .in("user_id", userIds)
      .not("phone", "is", null)
      .neq("phone", "")
      .not("building", "is", null)
      .neq("building", "")
      .order("sent_at", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new HttpError(500, error.message);
    const page = data || [];
    leads.push(...page);
    if (page.length < pageSize) break;
  }

  return leads;
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

// Even split across buildings, random within: group leads by building,
// shuffle each group (never-contacted sellers keep priority inside it), then
// round-robin one lead per building. Prevents a single hot tower's sellers -
// consecutive ids from import - from monopolising the daily cap as a block.
function interleaveLeadsAcrossBuildings(leads: any[]) {
  const groups = new Map<string, any[]>();
  for (const lead of leads) {
    const key = normalizeToken(cleanBuildingName(lead.building)) || "unknown";
    const list = groups.get(key) || [];
    list.push(lead);
    groups.set(key, list);
  }

  const buckets = shuffleInPlace([...groups.values()]);
  for (const bucket of buckets) {
    shuffleInPlace(bucket);
    // Stable partition: never-contacted sellers first within their building.
    bucket.sort((left, right) => Number(Boolean(left.sent_at)) - Number(Boolean(right.sent_at)));
  }

  const interleaved: any[] = [];
  for (let round = 0; ; round += 1) {
    let added = false;
    for (const bucket of buckets) {
      if (round < bucket.length) {
        interleaved.push(bucket[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return interleaved;
}

function isMissingBuildingAliasesTableError(error: any) {
  const message = String(error?.message || "");
  return error?.code === "42P01" || message.includes("building_aliases");
}

function getAliasLookupKey(userId: string, aliasKey: string) {
  return `${userId}:${aliasKey}`;
}

const GLOBAL_ALIAS_USER_KEY = "*";

async function fetchBuildingAliasLookup(adminClient: any, userIds: string[], aliasKeys: string[]) {
  const lookup = new Map<string, Set<string>>();
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  const uniqueAliasKeys = [...new Set(aliasKeys)].filter(Boolean);
  if (!uniqueAliasKeys.length) return lookup;

  const addAliases = (aliases: any[], scope: "global" | "user") => {
    for (const alias of aliases || []) {
      const canonicalName = cleanString(alias.canonical_name);
      const aliasKey = cleanString(alias.alias_key);
      const userId = scope === "global" ? GLOBAL_ALIAS_USER_KEY : cleanString(alias.user_id);
      if (!canonicalName || !aliasKey || !userId) continue;

      const lookupKey = getAliasLookupKey(userId, aliasKey);
      const names = lookup.get(lookupKey) || new Set<string>();
      names.add(canonicalName);
      lookup.set(lookupKey, names);
    }
  };

  for (const keyBatch of chunkArray(uniqueAliasKeys, 100)) {
    const { data, error } = await adminClient
      .from("building_aliases")
      .select("alias_key, canonical_name")
      .eq("is_global", true)
      .in("alias_key", keyBatch);

    if (error) {
      if (isMissingBuildingAliasesTableError(error)) return lookup;
      throw new HttpError(500, error.message);
    }

    addAliases(data || [], "global");
  }

  if (!uniqueUserIds.length) return lookup;

  for (const userBatch of chunkArray(uniqueUserIds, 100)) {
    for (const keyBatch of chunkArray(uniqueAliasKeys, 100)) {
      const { data, error } = await adminClient
        .from("building_aliases")
        .select("user_id, alias_key, canonical_name")
        .in("user_id", userBatch)
        .in("alias_key", keyBatch);

      if (error) {
        if (isMissingBuildingAliasesTableError(error)) return lookup;
        throw new HttpError(500, error.message);
      }

      addAliases(data || [], "user");
    }
  }

  return lookup;
}

function expandLeadBuildingKeysWithAliases(lead: any, baseKeys: string[], aliasLookup: Map<string, Set<string>>) {
  const keys = new Set(baseKeys);
  for (const aliasKey of baseKeys) {
    const userCanonicalNames = aliasLookup.get(getAliasLookupKey(String(lead.user_id || ""), aliasKey));
    const canonicalNames = userCanonicalNames?.size
      ? userCanonicalNames
      : aliasLookup.get(getAliasLookupKey(GLOBAL_ALIAS_USER_KEY, aliasKey));
    if (!canonicalNames?.size) continue;

    for (const canonicalName of canonicalNames) {
      for (const key of getBuildingKeyVariants(canonicalName)) keys.add(key);
    }
  }

  return [...keys];
}

async function fetchRecentTransactions(adminClient: any, buildingKeys: string[], dateKeys: string[]) {
  const transactionsByKey = new Map<string, any[]>();
  for (const batch of chunkArray([...new Set(buildingKeys)].filter(Boolean), 100)) {
    const { data, error } = await adminClient
      .from("transactions")
      .select("*")
      .in("building_key", batch)
      .in("date", dateKeys);

    if (error) throw new HttpError(500, error.message);
    for (const transaction of data || []) {
      const amount = Number(transaction?.amount);
      if (!Number.isFinite(amount) || amount < MIN_SALE_AMOUNT) continue;
      const list = transactionsByKey.get(transaction.building_key) || [];
      list.push(transaction);
      transactionsByKey.set(transaction.building_key, list);
    }
  }
  return transactionsByKey;
}

async function fetchExistingMarketMessagePairs(adminClient: any, leadIds: number[], dateKeys: string[]) {
  const existing = new Set<string>();
  for (const batch of chunkArray(leadIds, 100)) {
    const { data, error } = await adminClient
      .from("whatsapp_messages")
      .select("lead_id, market_transaction_date")
      .eq("direction", "outbound")
      .in("market_transaction_date", dateKeys)
      .in("status", ACTIVE_MESSAGE_STATUSES)
      .in("lead_id", batch);

    if (error) throw new HttpError(500, error.message);
    for (const row of data || []) {
      if (row.lead_id != null && row.market_transaction_date) {
        existing.add(`${Number(row.lead_id)}:${row.market_transaction_date}`);
      }
    }
  }
  return existing;
}

function getRecipientDateKey(userId: unknown, phone: unknown, transactionDate: unknown) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const dateKey = cleanString(transactionDate);
  const normalizedUserId = cleanString(userId);
  if (!normalizedUserId || !normalizedPhone || !dateKey) return null;
  return `${normalizedUserId}:${normalizedPhone}:${dateKey}`;
}

async function fetchExistingMarketRecipientDateKeys(adminClient: any, userIds: string[], dateKeys: string[]) {
  const existing = new Set<string>();

  for (const userBatch of chunkArray([...new Set(userIds)].filter(Boolean), 100)) {
    let from = 0;
    while (true) {
      const { data, error } = await adminClient
        .from("whatsapp_messages")
        .select("id, user_id, recipient_phone, market_transaction_date")
        .eq("direction", "outbound")
        .in("market_transaction_date", dateKeys)
        .in("status", ACTIVE_MESSAGE_STATUSES)
        .in("user_id", userBatch)
        .order("id", { ascending: true })
        .range(from, from + DATA_PAGE_SIZE - 1);

      if (error) throw new HttpError(500, error.message);
      const page = data || [];
      for (const row of page) {
        const key = getRecipientDateKey(row.user_id, row.recipient_phone, row.market_transaction_date);
        if (key) existing.add(key);
      }

      if (page.length < DATA_PAGE_SIZE) break;
      from += DATA_PAGE_SIZE;
    }
  }

  return existing;
}

async function fetchDailyAutoMessageCounts(
  adminClient: any,
  userIds: string[],
  dayStartUtc: string,
  dayEndUtc: string,
) {
  const counts = new Map<string, number>();

  for (const userBatch of chunkArray([...new Set(userIds)].filter(Boolean), 100)) {
    let from = 0;
    while (true) {
      const { data, error } = await adminClient
        .from("whatsapp_messages")
        .select("id, user_id")
        .eq("direction", "outbound")
        .eq("send_source", "auto")
        .in("status", ACTIVE_MESSAGE_STATUSES)
        .in("user_id", userBatch)
        .gte("created_at", dayStartUtc)
        .lt("created_at", dayEndUtc)
        .order("id", { ascending: true })
        .range(from, from + DATA_PAGE_SIZE - 1);

      if (error) throw new HttpError(500, error.message);
      const page = data || [];
      for (const row of page) {
        counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
      }

      if (page.length < DATA_PAGE_SIZE) break;
      from += DATA_PAGE_SIZE;
    }
  }

  return counts;
}

async function claimAutoSend(adminClient: any, input: {
  accountId: string;
  leadId: number;
  runId: string;
  transactionDate: string;
  userId: string;
}) {
  const { data, error } = await adminClient
    .from("seller_signal_auto_whatsapp_events")
    .insert({
      user_id: input.userId,
      lead_id: input.leadId,
      account_id: input.accountId,
      transaction_date: input.transactionDate,
      status: "sending",
      run_id: input.runId,
      attempted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error?.code === "23505") return null;
  if (error) throw new HttpError(500, error.message);
  return data;
}

async function markAutoEvent(adminClient: any, eventId: string, updates: Record<string, unknown>) {
  const { error } = await adminClient
    .from("seller_signal_auto_whatsapp_events")
    .update(updates)
    .eq("id", eventId);
  if (error) throw new HttpError(500, error.message);
}

async function insertMessageRow(adminClient: any, input: {
  account: any;
  body: string;
  dailyCap: number;
  eventId: string;
  lead: any;
  payload: any;
  to: string;
  transactionDate: string;
}) {
  const { data, error } = await adminClient
    .rpc("claim_seller_signal_automation_message", {
      p_user_id: input.lead.user_id,
      p_account_id: input.account.id,
      p_lead_id: input.lead.id,
      p_recipient_phone: input.to,
      p_message_type: input.payload.type,
      p_body: input.body,
      p_raw_request: input.payload,
      p_market_transaction_date: input.transactionDate,
      p_auto_send_event_id: input.eventId,
      p_daily_cap: input.dailyCap,
      p_automation_kind: "transaction_updates",
    })
    .single();

  if (error?.code === "23505") return { duplicate: true, claimed: false, id: null, dailyCount: null };
  if (error) throw new HttpError(500, error.message);
  return {
    duplicate: false,
    claimed: Boolean(data?.claimed),
    id: data?.message_id || null,
    dailyCount: Number(data?.daily_count || 0),
  };
}

async function sendMessage(
  adminClient: any,
  account: any,
  to: string,
  body: string,
  imageUrl: string | null,
  payload: any,
) {
  if (account.provider === "baileys") {
    const providerPayload = await sendViaBaileys(account, to, body, imageUrl);
    return {
      providerMessageId: providerPayload?.messageId || null,
      providerPayload,
    };
  }

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

  const providerPayload = await graphResponse.json().catch(() => null);
  if (!graphResponse.ok) {
    const message = providerPayload?.error?.message || `WhatsApp API request failed with ${graphResponse.status}`;
    throw new HttpError(502, message);
  }

  return {
    providerMessageId: providerPayload?.messages?.[0]?.id || null,
    providerPayload,
  };
}

function isAuthorized(req: Request) {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN");
  const apikey = req.headers.get("apikey");
  const auth = req.headers.get("authorization") || "";
  const customToken = req.headers.get("x-auto-whatsapp-token");

  return Boolean(
    (serviceRoleKey && (apikey === serviceRoleKey || auth === `Bearer ${serviceRoleKey}`))
    || (token && customToken === token),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  if (!isAuthorized(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const runId = crypto.randomUUID();
  const startedAt = new Date();

  try {
    const input = await req.json().catch(() => ({}));
    const dryRun = Boolean(input?.dryRun);
    const enabled = Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_ENABLED") === "true";
    const maxSends = Math.max(1, Math.floor(getNumber(input?.maxSends, getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_MAX_SENDS_PER_RUN"), DEFAULT_MAX_SENDS_PER_RUN))));
    const dailyCap = Math.max(1, Math.min(DEFAULT_DAILY_CAP, Math.floor(getNumber(input?.dailyCap, getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_DAILY_CAP"), DEFAULT_DAILY_CAP)))));
    const maxLeads = Math.max(0, Math.floor(getNumber(input?.maxLeads, getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_MAX_LEADS_PER_RUN"), DEFAULT_MAX_LEADS_PER_RUN))));
    // Any contact (auto or manual, tracked via leads.sent_at) pauses further
    // auto-alerts to that seller for the cooldown window; the next alert after
    // the pause carries the freshest transaction data anyway.
    const cooldownHours = Math.max(0, getNumber(input?.cooldownHours, getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_COOLDOWN_HOURS"), DEFAULT_COOLDOWN_HOURS)));
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const todayDateKey = getDubaiDateKey(startedAt);
    if (!todayDateKey) throw new HttpError(500, "Could not resolve today's Dubai date.");
    // The DLD export lands twice a day (12:00 and 18:00 Dubai); the evening
    // batch arrives after the send window closes, so keep a two-day recovery
    // window. Lead/date and recipient/date dedupe still prevent repeat sends.
    const lookbackDays = Math.max(0, Math.floor(getNumber(input?.lookbackDays, getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_LOOKBACK_DAYS"), DEFAULT_LOOKBACK_DAYS))));
    const activeDateKeys: string[] = [];
    for (let offset = 0; offset <= lookbackDays; offset += 1) {
      const key = getDubaiDateKey(new Date(startedAt.getTime() - offset * 24 * 60 * 60 * 1000));
      if (key) activeDateKeys.push(key);
    }
    const startDubaiDateKey = getDubaiStartDateKey(input?.startDubaiDate);

    if (!enabled && !dryRun) {
      return jsonResponse({
        runId,
        enabled: false,
        dryRun,
        maxSends,
        dailyCap,
        cooldownHours,
        todayDateKey,
        startDubaiDateKey,
        message: "Auto WhatsApp is disabled. Set SELLER_SIGNAL_AUTO_WHATSAPP_ENABLED=true to allow sends.",
      });
    }

    const enforceSendWindow = input?.enforceSendWindow !== false
      && Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_ENFORCE_SEND_WINDOW") !== "false";
    const sendWindowStart = getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_SEND_WINDOW_START"), DEFAULT_SEND_WINDOW_START_HOUR);
    const sendWindowEnd = getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_SEND_WINDOW_END"), DEFAULT_SEND_WINDOW_END_HOUR);
    const dubaiHour = getDubaiHour(startedAt);
    if (!dryRun && enforceSendWindow && (dubaiHour === null || dubaiHour < sendWindowStart || dubaiHour >= sendWindowEnd)) {
      return jsonResponse({
        runId,
        enabled,
        dryRun,
        dailyCap,
        todayDateKey,
        dubaiHour,
        sent: 0,
        skipped: { outsideSendWindow: true },
        message: `Outside the ${sendWindowStart}:00-${sendWindowEnd}:00 Dubai send window.`,
      });
    }

    if (!dryRun && startDubaiDateKey && todayDateKey < startDubaiDateKey) {
      return jsonResponse({
        runId,
        active: false,
        enabled,
        dryRun,
        maxSends,
        dailyCap,
        cooldownHours,
        todayDateKey,
        startDubaiDateKey,
        message: `Auto WhatsApp is scheduled to start on ${startDubaiDateKey} Dubai date.`,
      });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: accountRows, error: accountsError } = await adminClient
      .from("whatsapp_accounts")
      .select("id, user_id, provider, phone_number_id, display_phone_number, connection_status, raw_account, connected_at")
      .eq("connection_status", "connected")
      .order("connected_at", { ascending: false });

    if (accountsError) throw new HttpError(500, accountsError.message);

    const accountByUser = new Map<string, any>();
    for (const account of accountRows || []) {
      if (!accountByUser.has(account.user_id)) accountByUser.set(account.user_id, account);
    }

    const connectedUserIds = [...accountByUser.keys()];
    const { data: disabledSettings, error: disabledSettingsError } = connectedUserIds.length
      ? await adminClient
        .from("seller_signal_automation_settings")
        .select("user_id")
        .in("user_id", connectedUserIds)
        .eq("auto_whatsapp_enabled", false)
      : { data: [], error: null };

    if (disabledSettingsError) throw new HttpError(500, disabledSettingsError.message);

    const automationDisabledUserIds = new Set(
      (disabledSettings || []).map((settings: any) => String(settings.user_id)),
    );
    for (const userId of automationDisabledUserIds) accountByUser.delete(userId);

    if (!accountByUser.size) {
      return jsonResponse({
        runId,
        enabled,
        dryRun,
        maxSends,
        dailyCap,
        cooldownHours,
        todayDateKey,
        startDubaiDateKey,
        sent: 0,
        skipped: automationDisabledUserIds.size
          ? { automationDisabledUsers: automationDisabledUserIds.size }
          : { noConnectedAccount: true },
      });
    }

    const leads = interleaveLeadsAcrossBuildings(
      await fetchScannableLeads(adminClient, [...accountByUser.keys()], maxLeads),
    );

    const templatesByUser = await fetchDefaultMessageTemplates(adminClient, [...accountByUser.keys()]);

    const baseKeysByLead = new Map<number, string[]>();
    const baseBuildingKeys = new Set<string>();
    for (const lead of leads || []) {
      const keys = getBuildingKeyVariants(lead.building);
      baseKeysByLead.set(Number(lead.id), keys);
      for (const key of keys) baseBuildingKeys.add(key);
    }

    const aliasLookup = await fetchBuildingAliasLookup(
      adminClient,
      [...accountByUser.keys()],
      [...baseBuildingKeys],
    );

    const keysByLead = new Map<number, string[]>();
    const allBuildingKeys = new Set<string>();
    for (const lead of leads || []) {
      const keys = expandLeadBuildingKeysWithAliases(lead, baseKeysByLead.get(Number(lead.id)) || [], aliasLookup);
      keysByLead.set(Number(lead.id), keys);
      for (const key of keys) allBuildingKeys.add(key);
    }

    const transactionsByKey = await fetchRecentTransactions(adminClient, [...allBuildingKeys], activeDateKeys);
    const existingMessagePairs = await fetchExistingMarketMessagePairs(
      adminClient,
      leads.map((lead: any) => Number(lead.id)),
      activeDateKeys,
    );
    const existingRecipientDateKeys = await fetchExistingMarketRecipientDateKeys(
      adminClient,
      [...accountByUser.keys()],
      activeDateKeys,
    );
    const dailyBounds = getDubaiDayBoundsUtc(todayDateKey);
    if (!dailyBounds) throw new HttpError(500, "Could not resolve today's Dubai day boundaries.");
    const dailyAutoMessageCounts = await fetchDailyAutoMessageCounts(
      adminClient,
      [...accountByUser.keys()],
      dailyBounds.start,
      dailyBounds.end,
    );

    const summary = {
      runId,
      enabled,
      dryRun,
      todayDateKey,
      startDubaiDateKey,
      maxSends,
      dailyCap,
      maxLeads,
      cooldownHours,
      automationDisabledUsers: automationDisabledUserIds.size,
      scanned: leads.length,
      eligible: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: {
        alreadySentForDate: 0,
        cooldown: 0,
        noPhone: 0,
        noTodayTransactions: 0,
        notInterested: 0,
        duplicateClaim: 0,
        duplicateRecipientDate: 0,
        dailyCap: 0,
      },
      failures: [] as Array<{ leadId: number; error: string }>,
      dryRunMatches: [] as Array<{ leadId: number; transactionCount: number; transactionDate: string }>,
      activeDateKeys,
      lookbackDays,
      dailyActiveByUser: Object.fromEntries(dailyAutoMessageCounts),
    };

    for (const lead of leads || []) {
      if (!dryRun && summary.attempted >= maxSends) break;

      const leadId = Number(lead.id);

      if (isNotInterestedStatus(lead.status)) {
        summary.skipped.notInterested += 1;
        continue;
      }

      const to = normalizeWhatsAppPhone(lead.phone);
      if (!to) {
        summary.skipped.noPhone += 1;
        continue;
      }

      const keys = keysByLead.get(leadId) || [];
      // Prefer the freshest transaction date that has not been messaged yet
      // (today first, then the lookback days).
      let matchedTransactions: any[] = [];
      let matchedDateKey: string | null = null;
      for (const key of keys) {
        const transactions = transactionsByKey.get(key) || [];
        if (!transactions.length) continue;
        for (const dateKey of activeDateKeys) {
          if (existingMessagePairs.has(`${leadId}:${dateKey}`)) continue;
          const forDate = transactions.filter((transaction: any) => transaction.date === dateKey);
          if (forDate.length) {
            matchedTransactions = forDate;
            matchedDateKey = dateKey;
            break;
          }
        }
        if (matchedDateKey) break;
      }

      if (!matchedTransactions.length || !matchedDateKey) {
        const hadAnyTransactions = keys.some((key) => (transactionsByKey.get(key) || []).length > 0);
        if (hadAnyTransactions) summary.skipped.alreadySentForDate += 1;
        else summary.skipped.noTodayTransactions += 1;
        continue;
      }

      const recipientDateKey = getRecipientDateKey(lead.user_id, to, matchedDateKey);
      if (!recipientDateKey || existingRecipientDateKeys.has(recipientDateKey)) {
        summary.skipped.duplicateRecipientDate += 1;
        continue;
      }

      const userId = String(lead.user_id || "");
      const currentDailyCount = dailyAutoMessageCounts.get(userId) || 0;
      if (currentDailyCount >= dailyCap) {
        summary.skipped.dailyCap += 1;
        continue;
      }

      const sentAtMs = lead.sent_at ? new Date(lead.sent_at).getTime() : 0;
      if (sentAtMs && cooldownMs > 0 && startedAt.getTime() - sentAtMs < cooldownMs) {
        summary.skipped.cooldown += 1;
        continue;
      }

      summary.eligible += 1;

      if (dryRun) {
        summary.dryRunMatches.push({ leadId, transactionCount: matchedTransactions.length, transactionDate: matchedDateKey });
        existingRecipientDateKeys.add(recipientDateKey);
        const projectedDailyCount = currentDailyCount + 1;
        dailyAutoMessageCounts.set(userId, projectedDailyCount);
        summary.dailyActiveByUser[userId] = projectedDailyCount;
        continue;
      }

      const account = accountByUser.get(lead.user_id);
      const claim = await claimAutoSend(adminClient, {
        accountId: account.id,
        leadId,
        runId,
        transactionDate: matchedDateKey,
        userId: lead.user_id,
      });

      if (!claim?.id) {
        summary.skipped.duplicateClaim += 1;
        continue;
      }

      let messageRowId: string | null = null;
      let providerAccepted = false;
      try {
        const template = templatesByUser.get(lead.user_id);
        const body = buildMessage(
          lead,
          matchedTransactions,
          cleanBuildingName(lead.building),
          template?.content,
        );
        const imageUrl = await createTemplateImageUrl(adminClient, template?.imagePath || null);
        const payload = account.provider === "baileys"
          ? buildBaileysPayload({ body, imageUrl, to })
          : buildGraphPayload({ body, imageUrl, to });
        const messageRow = await insertMessageRow(adminClient, {
          account,
          body,
          dailyCap,
          eventId: claim.id,
          lead,
          payload,
          to,
          transactionDate: matchedDateKey,
        });
        if (!messageRow.claimed && !messageRow.duplicate) {
          const cappedDailyCount = Number(messageRow.dailyCount || currentDailyCount);
          summary.skipped.dailyCap += 1;
          dailyAutoMessageCounts.set(userId, cappedDailyCount);
          summary.dailyActiveByUser[userId] = cappedDailyCount;
          await markAutoEvent(adminClient, claim.id, {
            status: "skipped",
            reason: `Daily automatic WhatsApp cap of ${dailyCap} reached for the Dubai day.`,
          });
          continue;
        }
        if (!messageRow?.id) {
          summary.skipped.duplicateRecipientDate += 1;
          existingRecipientDateKeys.add(recipientDateKey);
          await markAutoEvent(adminClient, claim.id, {
            status: "skipped",
            reason: "A WhatsApp message already exists for this recipient and transaction date.",
          });
          continue;
        }
        messageRowId = messageRow.id;
        const claimedDailyCount = Number(messageRow.dailyCount || currentDailyCount + 1);
        summary.attempted += 1;
        dailyAutoMessageCounts.set(userId, claimedDailyCount);
        summary.dailyActiveByUser[userId] = claimedDailyCount;
        await markAutoEvent(adminClient, claim.id, { message_id: messageRowId });

        const { providerMessageId, providerPayload } = await sendMessage(
          adminClient,
          account,
          to,
          body,
          imageUrl,
          payload,
        );
        providerAccepted = true;
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
        await markLeadSent(adminClient, lead.user_id, lead.id, sentAt);
        await markAutoEvent(adminClient, claim.id, { status: "sent", sent_at: sentAt });
        existingMessagePairs.add(`${leadId}:${matchedDateKey}`);
        existingRecipientDateKeys.add(recipientDateKey);
        summary.sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        summary.failed += 1;
        summary.failures.push({ leadId, error: message });
        if (messageRowId && !providerAccepted) {
          await adminClient
            .from("whatsapp_messages")
            .update({
              status: "failed",
              error_message: message,
              failed_at: new Date().toISOString(),
            })
            .eq("id", messageRowId);
        }
        await markAutoEvent(adminClient, claim.id, {
          status: providerAccepted ? "sending" : "failed",
          error_message: message,
        });
      }
    }

    return jsonResponse(summary);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ runId, error: message }, status);
  }
});
