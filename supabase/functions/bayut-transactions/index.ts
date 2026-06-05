import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_HOST = "uae-real-estate2.p.rapidapi.com";
const BASE_URL = `https://${API_HOST}`;
const DLD_EXPORT_URL = "https://gateway.dubailand.gov.ae/open-data/transactions/export/csv";
const DLD_SALES_GROUP_ID = "1";
const DLD_RESIDENTIAL_USAGE_ID = "1";
const MAX_PAGES = 2;
const MAX_TRANSACTIONS = 120;
const MAX_BUILDINGS = 20;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildHeaders(apiKey: string) {
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };
}

function buildDldExportPayload(fromDate: string, toDate: string) {
  return {
    parameters: {
      P_FROM_DATE: fromDate,
      P_TO_DATE: toDate,
      P_GROUP_ID: DLD_SALES_GROUP_ID,
      P_IS_OFFPLAN: "",
      P_IS_FREE_HOLD: "",
      P_AREA_ID: "",
      P_USAGE_ID: DLD_RESIDENTIAL_USAGE_ID,
      P_PROP_TYPE_ID: "",
      P_TAKE: "-1",
      P_SKIP: "",
      P_SORT: "INSTANCE_DATE_DESC",
    },
    labels: {},
  };
}

async function fetchDldExportCsv(fromDate: string, toDate: string) {
  const response = await fetch(DLD_EXPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDldExportPayload(fromDate, toDate)),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`DLD export ${response.status}: ${text.slice(0, 240)}`);
  if (!text || text.trim().startsWith("<!DOCTYPE html")) {
    throw new Error("DLD export returned an unexpected response");
  }
  return text;
}

async function fetchJson(url: string, options: RequestInit, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);

    if (response.ok) return response.json();

    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      const delay = 1500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    const text = await response.text();
    throw new Error(`Bayut API ${response.status}: ${text.slice(0, 240)}`);
  }

  throw new Error("Bayut request failed");
}

function normalizeToken(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function extractFullPath(location: any) {
  return location?.full_name
    || location?.path
    || (Array.isArray(location?.location) ? location.location.join(" | ") : "")
    || "";
}

function isUsableLocationLabel(value: unknown) {
  const label = String(value || "").replace(/\s+/g, " ").trim();
  return Boolean(label && label !== "0" && label.toLowerCase() !== "unknown");
}

function extractLocationPathParts(location: any) {
  const rawParts = Array.isArray(location?.location)
    ? location.location
    : extractFullPath(location).split(/\s*(?:\||>|,|\/)\s*/);

  return rawParts
    .map((part: unknown) => String(part || "").replace(/\s+/g, " ").trim())
    .filter(isUsableLocationLabel);
}

function extractLocationName(location: any) {
  const direct = [
    location?.name,
    location?.title,
    location?.name_l1,
    location?.name_l2,
    location?.location_name,
  ].find(isUsableLocationLabel);
  if (direct) return String(direct).replace(/\s+/g, " ").trim();

  const pathParts = extractLocationPathParts(location);
  return pathParts.at(-1) || "Unknown";
}

function scoreLocation(location: any, query: string) {
  const target = normalizeToken(query);
  const name = extractLocationName(location);
  const fullPath = extractFullPath(location);
  const normalizedName = normalizeToken(name);
  const normalizedFullPath = normalizeToken(fullPath);

  let score = 0;
  if (normalizedName === target) score += 120;
  if (normalizedName.includes(target) || target.includes(normalizedName)) score += 70;
  if (normalizedFullPath.includes(target)) score += 35;
  score += Math.max(0, 20 - Math.abs(name.length - query.length));
  return score;
}

function toList(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

function cleanBuildingName(rawValue: string) {
  let value = String(rawValue || "").trim();

  const apartmentMatch = value.match(/^(?:\[.*?\]\s*)?Apartment\s+[\w-]+(?:\s*\(.*?\))?\s*,\s*(.+)/i);
  if (apartmentMatch) {
    const parts = apartmentMatch[1].split(",").map((part) => part.trim());
    value = parts[0] || value;
  }

  value = value
    .replace(/\b(one|two|three|four|five|1|2|3|4|5)\s*[-\s]?\s*bed(room)?s?\b/gi, "")
    .replace(/\bstudio\b/gi, "")
    .replace(/\b\d+\s*bhk\b/gi, "")
    .replace(/\b\d+\s*br\b/gi, "")
    .replace(/\((?:NOT\s+)?LIVE\)/gi, "")
    .replace(/\(FSA[^)]*\)/gi, "")
    .replace(/\(Not\s+Live\)/gi, "")
    .replace(/\(NOT\s+ON\s+PF\)/gi, "")
    .replace(/\[OFFLINE\]/gi, "")
    .replace(/\[NOT\s+LIVE\]/gi, "")
    .replace(/^(?:Villa|Unit)\s+[\w-]+\s*,?\s*/i, "")
    .replace(/[,\-/]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return value || String(rawValue || "").trim();
}

function expandBoulevard(value: string) {
  return String(value || "").replace(/\bblvd\b\.?/gi, "Boulevard");
}

function replaceNumberWords(value: string) {
  const numberMap: Record<string, string> = {
    one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  };
  let next = String(value || "");
  for (const [word, digit] of Object.entries(numberMap)) {
    next = next.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
  }
  return next;
}

function buildSearchVariants(name: string) {
  const cleaned = cleanBuildingName(name);
  const variants = new Set<string>();
  const add = (value: string) => {
    const trimmed = String(value || "").trim();
    if (trimmed) variants.add(trimmed);
  };
  add(cleaned);
  add(expandBoulevard(cleaned));
  add(replaceNumberWords(cleaned));
  add(replaceNumberWords(expandBoulevard(cleaned)));
  return [...variants];
}

async function fetchTransactionsForBuilding(buildingName: string, apiKey: string) {
  const variants = buildSearchVariants(buildingName);
  let bestLocation: any = null;

  for (const variant of variants) {
    const payload = await fetchJson(
      `${BASE_URL}/locations_search?query=${encodeURIComponent(variant)}`,
      { method: "GET", headers: buildHeaders(apiKey) },
    );

    const locations = toList(payload);
    if (!locations.length) continue;

    const scored = locations
      .map((location: any) => ({ location, score: scoreLocation(location, variant) }))
      .sort((a: any, b: any) => b.score - a.score);

    bestLocation = scored[0]?.location || null;
    if (bestLocation) break;
  }

  const locationId = bestLocation?.id || bestLocation?.externalID || bestLocation?.location_id || null;
  if (!locationId) return null;

  const allTransactions: any[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await fetchJson(
      `${BASE_URL}/transactions?page=${page}`,
      {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          locations_ids: [locationId],
          purpose: "for-sale",
          category: "residential",
          completion_status: "completed",
          sort_by: "date",
          order: "desc",
        }),
      },
    );

    const results = toList(payload);
    if (!results.length) break;
    allTransactions.push(...results);
    if (allTransactions.length >= MAX_TRANSACTIONS) break;
  }

  return {
    locationName: extractLocationName(bestLocation),
    transactions: allTransactions.slice(0, MAX_TRANSACTIONS),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    if (body?.mode === "dld-export") {
      const fromDate = String(body.fromDate || "").trim();
      const toDate = String(body.toDate || "").trim();
      if (!fromDate || !toDate) return jsonResponse({ error: "fromDate and toDate are required" }, 400);

      const csvText = await fetchDldExportCsv(fromDate, toDate);
      return jsonResponse({ csvText });
    }

    const apiKey = Deno.env.get("RAPIDAPI_KEY") || Deno.env.get("VITE_RAPIDAPI_KEY");
    if (!apiKey) return jsonResponse({ error: "RAPIDAPI_KEY not configured" }, 500);

    const { buildings } = body;

    if (!Array.isArray(buildings) || !buildings.length) {
      return jsonResponse({ results: {} });
    }

    const names = buildings.slice(0, MAX_BUILDINGS).map((b: any) => String(b || "").trim()).filter(Boolean);
    const results: Record<string, any> = {};

    for (const name of names) {
      const key = normalizeToken(name);
      if (!key || results[key]) continue;

      try {
        results[key] = await fetchTransactionsForBuilding(name, apiKey);
      } catch {
        results[key] = null;
      }
    }

    return jsonResponse({ results });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
