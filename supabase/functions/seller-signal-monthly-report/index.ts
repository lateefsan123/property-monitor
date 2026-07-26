import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Sends each active-pipeline seller a once-a-month recap of sales and Ejari
// rentals registered in their building. Sends share the automatic WhatsApp
// daily cap via claim_seller_signal_automation_message, so transaction
// alerts always keep priority over recap sends.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-monthly-report-token",
};

const DATA_PAGE_SIZE = 1000;
// DLD labels fractional/nominal transfers as "Sale" with tiny amounts; keep
// them out of the recap stats (a 3K row would wreck the month's price range).
const MIN_SALE_AMOUNT = 100_000;
const DEFAULT_MAX_SENDS_PER_RUN = 1;
const DEFAULT_DAILY_CAP = 40;
const DEFAULT_REPORT_DAILY_BUDGET = 40;
const DEFAULT_SEND_WINDOW_START_HOUR = 9;
const DEFAULT_SEND_WINDOW_END_HOUR = 21;

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

// Active pipeline = prospects and appraisals. For-sale sellers already talk to
// the broker weekly and stale/unknown statuses stay out of automated sends.
function isActivePipelineStatus(status: unknown) {
  const normalized = normalizeToken(status);
  if (!normalized) return false;
  if (isNotInterestedStatus(status)) return false;
  return normalized.includes("prospect")
    || normalized.includes("appraisal")
    || normalized.includes("valuation");
}

function resolveReportMonth(input: unknown, now: Date) {
  const explicit = cleanString(input);
  if (explicit) {
    if (!/^\d{4}-\d{2}$/.test(explicit)) {
      throw new HttpError(400, "reportMonth must use YYYY-MM.");
    }
    return explicit;
  }

  const todayKey = getDubaiDateKey(now);
  if (!todayKey) throw new HttpError(500, "Could not resolve the Dubai date.");
  const [year, month] = todayKey.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthBounds(reportMonth: string) {
  const [year, month] = reportMonth.split("-").map(Number);
  const start = `${reportMonth}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start, end: `${reportMonth}-${String(lastDay).padStart(2, "0")}` };
}

function getMonthLabel(reportMonth: string) {
  const [year, month] = reportMonth.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return formatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatAed(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `AED ${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) return `AED ${Math.round(value / 1_000)}K`;
  return `AED ${Math.round(value)}`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function isMissingTableError(error: any, tableName: string) {
  return error?.code === "42P01" || String(error?.message || "").includes(tableName);
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

async function sendViaBaileys(account: any, to: string, body: string) {
  const sessionId = getBaileysSessionId(account);
  if (!sessionId) throw new HttpError(409, "Baileys session is not configured");

  return baileysFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: body, to }),
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

function buildGraphPayload(input: { body: string; to: string }) {
  return {
    messaging_product: "whatsapp",
    to: input.to,
    type: "text",
    text: { body: input.body, preview_url: false },
  };
}

function buildBaileysPayload(input: { body: string; to: string }) {
  return {
    to: input.to,
    type: "text",
    text: { body: input.body, preview_url: false },
  };
}

async function sendMessage(adminClient: any, account: any, to: string, body: string, payload: any) {
  if (account.provider === "baileys") {
    const providerPayload = await sendViaBaileys(account, to, body);
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

const GLOBAL_ALIAS_USER_KEY = "*";

function getAliasLookupKey(userId: string, aliasKey: string) {
  return `${userId}:${aliasKey}`;
}

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
      if (isMissingTableError(error, "building_aliases")) return lookup;
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
        if (isMissingTableError(error, "building_aliases")) return lookup;
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

async function fetchScannableLeads(adminClient: any, userIds: string[]) {
  const leads: any[] = [];
  if (!userIds.length) return leads;

  let from = 0;
  while (true) {
    const { data, error } = await adminClient
      .from("leads")
      .select("id, user_id, name, phone, building, status")
      .in("user_id", userIds)
      .not("phone", "is", null)
      .neq("phone", "")
      .not("building", "is", null)
      .neq("building", "")
      .order("id", { ascending: true })
      .range(from, from + DATA_PAGE_SIZE - 1);

    if (error) throw new HttpError(500, error.message);
    const page = data || [];
    leads.push(...page);
    if (page.length < DATA_PAGE_SIZE) break;
    from += DATA_PAGE_SIZE;
  }

  return leads;
}

async function fetchMonthRows(adminClient: any, input: {
  buildingKeys: string[];
  dateColumn: string;
  monthEnd: string;
  monthStart: string;
  select: string;
  table: string;
}) {
  const rowsByKey = new Map<string, any[]>();

  for (const batch of chunkArray([...new Set(input.buildingKeys)].filter(Boolean), 100)) {
    let from = 0;
    while (true) {
      const { data, error } = await adminClient
        .from(input.table)
        .select(input.select)
        .in("building_key", batch)
        .gte(input.dateColumn, input.monthStart)
        .lte(input.dateColumn, input.monthEnd)
        .order("id", { ascending: true })
        .range(from, from + DATA_PAGE_SIZE - 1);

      if (error) {
        if (isMissingTableError(error, input.table)) return rowsByKey;
        throw new HttpError(500, error.message);
      }
      const page = data || [];
      for (const row of page) {
        const list = rowsByKey.get(row.building_key) || [];
        list.push(row);
        rowsByKey.set(row.building_key, list);
      }
      if (page.length < DATA_PAGE_SIZE) break;
      from += DATA_PAGE_SIZE;
    }
  }

  return rowsByKey;
}

function collectRowsForKeys(rowsByKey: Map<string, any[]>, keys: string[]) {
  const rows: any[] = [];
  const seenIds = new Set<number>();
  for (const key of keys) {
    for (const row of rowsByKey.get(key) || []) {
      const id = Number(row.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      rows.push(row);
    }
  }
  return rows;
}

function summarizeSales(rows: any[]) {
  const prices: number[] = [];
  const psfValues: number[] = [];
  for (const row of rows) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount < MIN_SALE_AMOUNT) continue;
    prices.push(amount);
    const area = Number(row.builtup_area_sqft);
    if (Number.isFinite(area) && area > 0) psfValues.push(amount / area);
  }

  if (!prices.length) return null;
  return {
    count: prices.length,
    avg: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    psf: psfValues.length ? psfValues.reduce((sum, psf) => sum + psf, 0) / psfValues.length : null,
  };
}

function summarizeRentals(rows: any[]) {
  const amounts: number[] = [];
  let newCount = 0;
  let renewedCount = 0;
  for (const row of rows) {
    const amount = Number(row.annual_amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    amounts.push(amount);
    const version = normalizeToken(row.version);
    if (version.includes("renew")) renewedCount += 1;
    else newCount += 1;
  }

  if (!amounts.length) return null;
  return {
    count: amounts.length,
    avg: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
    newCount,
    renewedCount,
  };
}

function buildReportMessage(input: {
  buildingLabel: string;
  monthLabel: string;
  name: string;
  rentals: ReturnType<typeof summarizeRentals>;
  sales: ReturnType<typeof summarizeSales>;
}) {
  const lines = [
    `Hi ${input.name}, here is your ${input.monthLabel} market recap for ${input.buildingLabel}.`,
    "",
  ];

  if (input.sales) {
    lines.push(`Sales - ${input.sales.count} ${input.sales.count === 1 ? "transaction" : "transactions"} registered:`);
    const rangeLine = input.sales.count === 1
      ? `- Sold for ${formatAed(input.sales.avg)}`
      : `- Average ${formatAed(input.sales.avg)} | Range ${formatAed(input.sales.min)} - ${formatAed(input.sales.max)}`;
    lines.push(rangeLine);
    if (input.sales.psf) lines.push(`- Around AED ${Math.round(input.sales.psf).toLocaleString("en-US")} per sqft`);
  } else {
    lines.push(`Sales: no transfers registered in ${input.monthLabel}.`);
  }

  lines.push("");

  if (input.rentals) {
    lines.push(`Rentals - ${input.rentals.count} ${input.rentals.count === 1 ? "contract" : "contracts"} registered:`);
    lines.push(`- Average ${formatAed(input.rentals.avg)} per year`);
    if (input.rentals.newCount || input.rentals.renewedCount) {
      lines.push(`- ${input.rentals.newCount} new, ${input.rentals.renewedCount} ${input.rentals.renewedCount === 1 ? "renewal" : "renewals"}`);
    }
  } else {
    lines.push(`Rentals: no contracts registered in ${input.monthLabel}.`);
  }

  lines.push("");
  lines.push("If you would like to know what this means for your unit's value, just reply here.");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function claimReportEvent(adminClient: any, input: {
  accountId: string;
  leadId: number;
  reportMonth: string;
  runId: string;
  userId: string;
}) {
  const { data, error } = await adminClient
    .from("seller_signal_monthly_report_events")
    .insert({
      user_id: input.userId,
      lead_id: input.leadId,
      account_id: input.accountId,
      report_month: `${input.reportMonth}-01`,
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

async function markReportEvent(adminClient: any, eventId: string, updates: Record<string, unknown>) {
  const { error } = await adminClient
    .from("seller_signal_monthly_report_events")
    .update(updates)
    .eq("id", eventId);
  if (error) throw new HttpError(500, error.message);
}

// Rotation: with ~30 spare sends/day against ~900 eligible sellers, whoever
// is processed first wins the day's budget. Order by longest-since-reported
// (never-reported first) so coverage rotates fairly instead of the same
// low-lead-id sellers winning every month.
async function fetchLastReportTimes(adminClient: any, userIds: string[]) {
  const lastSentByLead = new Map<number, string>();

  for (const userBatch of chunkArray([...new Set(userIds)].filter(Boolean), 100)) {
    let from = 0;
    while (true) {
      const { data, error } = await adminClient
        .from("seller_signal_monthly_report_events")
        .select("id, lead_id, sent_at")
        .in("user_id", userBatch)
        .eq("status", "sent")
        .order("id", { ascending: true })
        .range(from, from + DATA_PAGE_SIZE - 1);

      if (error) {
        if (isMissingTableError(error, "seller_signal_monthly_report_events")) return lastSentByLead;
        throw new HttpError(500, error.message);
      }
      const page = data || [];
      for (const row of page) {
        if (row.lead_id == null || !row.sent_at) continue;
        const leadId = Number(row.lead_id);
        const previous = lastSentByLead.get(leadId);
        if (!previous || row.sent_at > previous) lastSentByLead.set(leadId, row.sent_at);
      }
      if (page.length < DATA_PAGE_SIZE) break;
      from += DATA_PAGE_SIZE;
    }
  }

  return lastSentByLead;
}

function sortLeadsForRotation(leads: any[], lastSentByLead: Map<number, string>) {
  return [...leads].sort((left, right) => {
    const leftSent = lastSentByLead.get(Number(left.id)) || "";
    const rightSent = lastSentByLead.get(Number(right.id)) || "";
    if (leftSent !== rightSent) return leftSent < rightSent ? -1 : 1;
    return Number(left.id) - Number(right.id);
  });
}

async function fetchHandledLeadIds(adminClient: any, userIds: string[], reportMonth: string) {
  const handled = new Set<number>();

  for (const userBatch of chunkArray([...new Set(userIds)].filter(Boolean), 100)) {
    let from = 0;
    while (true) {
      const { data, error } = await adminClient
        .from("seller_signal_monthly_report_events")
        .select("id, lead_id, status")
        .in("user_id", userBatch)
        .eq("report_month", `${reportMonth}-01`)
        .in("status", ["sending", "sent", "skipped"])
        .order("id", { ascending: true })
        .range(from, from + DATA_PAGE_SIZE - 1);

      if (error) {
        if (isMissingTableError(error, "seller_signal_monthly_report_events")) return handled;
        throw new HttpError(500, error.message);
      }
      const page = data || [];
      for (const row of page) {
        if (row.lead_id != null) handled.add(Number(row.lead_id));
      }
      if (page.length < DATA_PAGE_SIZE) break;
      from += DATA_PAGE_SIZE;
    }
  }

  return handled;
}

async function insertMessageRow(adminClient: any, input: {
  account: any;
  body: string;
  dailyCap: number;
  lead: any;
  payload: any;
  to: string;
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
      p_market_transaction_date: null,
      p_auto_send_event_id: null,
      p_daily_cap: input.dailyCap,
      p_automation_kind: "monthly_reports",
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

function isAuthorized(req: Request) {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = Deno.env.get("SELLER_SIGNAL_MONTHLY_REPORT_TOKEN")
    || Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN");
  const apikey = req.headers.get("apikey");
  const auth = req.headers.get("authorization") || "";
  const customToken = req.headers.get("x-monthly-report-token");

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
    const enabled = Deno.env.get("SELLER_SIGNAL_MONTHLY_REPORT_ENABLED") === "true";
    const maxSends = Math.max(1, Math.floor(getNumber(input?.maxSends, getNumber(Deno.env.get("SELLER_SIGNAL_MONTHLY_REPORT_MAX_SENDS_PER_RUN"), DEFAULT_MAX_SENDS_PER_RUN))));
    const dailyCap = Math.max(1, Math.min(DEFAULT_DAILY_CAP, Math.floor(getNumber(input?.dailyCap, getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_DAILY_CAP"), DEFAULT_DAILY_CAP)))));
    // Reports claim against a lower ceiling than the full cap: once the day's
    // combined auto sends reach this budget, reports yield and the remaining
    // headroom belongs to same-day transaction alerts alone.
    const reportDailyBudget = Math.max(1, Math.min(dailyCap, Math.floor(getNumber(input?.reportDailyBudget, getNumber(Deno.env.get("SELLER_SIGNAL_MONTHLY_REPORT_DAILY_BUDGET"), DEFAULT_REPORT_DAILY_BUDGET)))));
    const reportMonth = resolveReportMonth(input?.reportMonth, startedAt);
    const monthBounds = getMonthBounds(reportMonth);
    const monthLabel = getMonthLabel(reportMonth);

    if (!enabled && !dryRun) {
      return jsonResponse({
        runId,
        enabled: false,
        dryRun,
        reportMonth,
        message: "Monthly report is disabled. Set SELLER_SIGNAL_MONTHLY_REPORT_ENABLED=true to allow sends.",
      });
    }

    const enforceSendWindow = input?.enforceSendWindow !== false
      && Deno.env.get("SELLER_SIGNAL_MONTHLY_REPORT_ENFORCE_SEND_WINDOW") !== "false";
    const sendWindowStart = getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_SEND_WINDOW_START"), DEFAULT_SEND_WINDOW_START_HOUR);
    const sendWindowEnd = getNumber(Deno.env.get("SELLER_SIGNAL_AUTO_WHATSAPP_SEND_WINDOW_END"), DEFAULT_SEND_WINDOW_END_HOUR);
    const dubaiHour = getDubaiHour(startedAt);
    if (!dryRun && enforceSendWindow && (dubaiHour === null || dubaiHour < sendWindowStart || dubaiHour >= sendWindowEnd)) {
      return jsonResponse({
        runId,
        enabled,
        dryRun,
        reportMonth,
        dubaiHour,
        sent: 0,
        skipped: { outsideSendWindow: true },
        message: `Outside the ${sendWindowStart}:00-${sendWindowEnd}:00 Dubai send window.`,
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
    const { data: enabledSettings, error: enabledSettingsError } = connectedUserIds.length
      ? await adminClient
        .from("seller_signal_automation_settings")
        .select("user_id")
        .in("user_id", connectedUserIds)
        .eq("monthly_reports_enabled", true)
      : { data: [], error: null };

    if (enabledSettingsError) throw new HttpError(500, enabledSettingsError.message);

    const monthlyReportUserIds = new Set(
      (enabledSettings || []).map((settings: any) => String(settings.user_id)),
    );
    for (const userId of accountByUser.keys()) {
      if (!monthlyReportUserIds.has(userId)) accountByUser.delete(userId);
    }

    if (!accountByUser.size) {
      return jsonResponse({
        runId,
        enabled,
        dryRun,
        reportMonth,
        sent: 0,
        skipped: connectedUserIds.length
          ? { monthlyReportsDisabledUsers: connectedUserIds.length }
          : { noConnectedAccount: true },
      });
    }

    const userIds = [...accountByUser.keys()];
    const allLeads = await fetchScannableLeads(adminClient, userIds);
    const handledLeadIds = await fetchHandledLeadIds(adminClient, userIds, reportMonth);
    const lastSentByLead = await fetchLastReportTimes(adminClient, userIds);

    const leads = sortLeadsForRotation(
      allLeads.filter((lead: any) => isActivePipelineStatus(lead.status)),
      lastSentByLead,
    );

    const baseKeysByLead = new Map<number, string[]>();
    const baseBuildingKeys = new Set<string>();
    for (const lead of leads) {
      const keys = getBuildingKeyVariants(lead.building);
      baseKeysByLead.set(Number(lead.id), keys);
      for (const key of keys) baseBuildingKeys.add(key);
    }

    const aliasLookup = await fetchBuildingAliasLookup(adminClient, userIds, [...baseBuildingKeys]);

    const keysByLead = new Map<number, string[]>();
    const allBuildingKeys = new Set<string>();
    for (const lead of leads) {
      const keys = expandLeadBuildingKeysWithAliases(lead, baseKeysByLead.get(Number(lead.id)) || [], aliasLookup);
      keysByLead.set(Number(lead.id), keys);
      for (const key of keys) allBuildingKeys.add(key);
    }

    const salesByKey = await fetchMonthRows(adminClient, {
      buildingKeys: [...allBuildingKeys],
      dateColumn: "date",
      monthEnd: monthBounds.end,
      monthStart: monthBounds.start,
      select: "id, building_key, amount, builtup_area_sqft",
      table: "transactions",
    });
    const rentsByKey = await fetchMonthRows(adminClient, {
      buildingKeys: [...allBuildingKeys],
      dateColumn: "registration_date",
      monthEnd: monthBounds.end,
      monthStart: monthBounds.start,
      select: "id, building_key, annual_amount, version",
      table: "rent_contracts",
    });

    const summary = {
      runId,
      enabled,
      dryRun,
      reportMonth,
      monthLabel,
      maxSends,
      dailyCap,
      reportDailyBudget,
      scanned: allLeads.length,
      activePipeline: leads.length,
      eligible: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: {
        alreadyHandled: 0,
        noMarketData: 0,
        noPhone: 0,
        dailyCap: 0,
        duplicateClaim: 0,
      },
      failures: [] as Array<{ leadId: number; error: string }>,
      dryRunMatches: [] as Array<{ leadId: number; salesCount: number; rentalCount: number }>,
    };

    // Budget exhaustion is per user: skip only that user's remaining leads so
    // other users' queues keep draining in the same run.
    const budgetReachedUsers = new Set<string>();

    for (const lead of leads) {
      if (summary.sent >= maxSends) break;
      if (budgetReachedUsers.size >= accountByUser.size) break;

      const leadUserId = String(lead.user_id || "");
      if (budgetReachedUsers.has(leadUserId)) {
        summary.skipped.dailyCap += 1;
        continue;
      }

      const leadId = Number(lead.id);
      if (handledLeadIds.has(leadId)) {
        summary.skipped.alreadyHandled += 1;
        continue;
      }

      const to = normalizeWhatsAppPhone(lead.phone);
      if (!to) {
        summary.skipped.noPhone += 1;
        continue;
      }

      const keys = keysByLead.get(leadId) || [];
      const sales = summarizeSales(collectRowsForKeys(salesByKey, keys));
      const rentals = summarizeRentals(collectRowsForKeys(rentsByKey, keys));
      if (!sales && !rentals) {
        summary.skipped.noMarketData += 1;
        continue;
      }

      summary.eligible += 1;

      if (dryRun) {
        summary.dryRunMatches.push({
          leadId,
          salesCount: sales?.count || 0,
          rentalCount: rentals?.count || 0,
        });
        continue;
      }

      const account = accountByUser.get(lead.user_id);
      const claim = await claimReportEvent(adminClient, {
        accountId: account.id,
        leadId,
        reportMonth,
        runId,
        userId: lead.user_id,
      });

      if (!claim?.id) {
        summary.skipped.duplicateClaim += 1;
        continue;
      }

      let messageRowId: string | null = null;
      let providerAccepted = false;
      try {
        const name = cleanString(lead.name)?.split(/\s+/)[0] || "there";
        const body = buildReportMessage({
          buildingLabel: cleanBuildingName(lead.building) || "your building",
          monthLabel,
          name,
          rentals,
          sales,
        });
        const payload = account.provider === "baileys"
          ? buildBaileysPayload({ body, to })
          : buildGraphPayload({ body, to });

        const messageRow = await insertMessageRow(adminClient, {
          account,
          body,
          dailyCap: reportDailyBudget,
          lead,
          payload,
          to,
        });

        if (!messageRow.claimed) {
          summary.skipped.dailyCap += 1;
          budgetReachedUsers.add(leadUserId);
          // Release the claim so the next run (or next day) can retry this
          // lead; the unique constraint would otherwise block it for the month.
          const { error: releaseError } = await adminClient
            .from("seller_signal_monthly_report_events")
            .delete()
            .eq("id", claim.id);
          if (releaseError) throw new HttpError(500, releaseError.message);
          continue;
        }

        messageRowId = messageRow.id;
        summary.attempted += 1;
        await markReportEvent(adminClient, claim.id, { message_id: messageRowId });

        const { providerMessageId, providerPayload } = await sendMessage(adminClient, account, to, body, payload);
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
        await markReportEvent(adminClient, claim.id, { status: "sent", sent_at: sentAt });
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
        await markReportEvent(adminClient, claim.id, {
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
