import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_HOST = "uae-real-estate2.p.rapidapi.com";
const BASE_URL = `https://${API_HOST}`;
const PAGE_SIZE = 25;
const MAX_PAGES = 20;
const MAX_LISTINGS_PER_BUILDING = 500;
const MAX_SEARCH_RESULTS = 8;
const MAX_WATCHED_BUILDINGS = 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeToken(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function toList(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  return payload.hits || payload.results || payload.transactions || [];
}

function extractLocationId(location: any) {
  return location?.id || location?.externalID || location?.location_id || null;
}

function extractLocationName(location: any) {
  return location?.name || location?.title || location?.name_l1 || "Unknown";
}

function extractFullPath(location: any) {
  return location?.full_name
    || location?.path
    || (Array.isArray(location?.location) ? location.location.join(" | ") : null)
    || null;
}

function scoreLocation(location: any, query: string) {
  const target = normalizeToken(query);
  const name = extractLocationName(location);
  const fullPath = extractFullPath(location) || "";
  const normalizedName = normalizeToken(name);
  const normalizedFullPath = normalizeToken(fullPath);

  let score = 0;
  if (normalizedName === target) score += 120;
  if (normalizedName.includes(target) || target.includes(normalizedName)) score += 70;
  if (normalizedFullPath.includes(target)) score += 35;
  score += Math.max(0, 20 - Math.abs(name.length - query.length));

  return score;
}

function parseVerifiedAt(value: unknown) {
  if (!value) return 0;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function buildHeaders(apiKey: string) {
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };
}

async function fetchJson(url: string, options: RequestInit, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);

    if (response.ok) return response.json();

    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      const delay = 1200 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    const text = await response.text();
    throw new Error(`Bayut API ${response.status}: ${text.slice(0, 240)}`);
  }

  throw new Error("Bayut request failed");
}

function simplifySearchLocation(location: any) {
  const locationId = extractLocationId(location);
  if (!locationId) return null;

  return {
    locationId: String(locationId),
    buildingName: extractLocationName(location),
    searchName: extractLocationName(location),
    fullPath: extractFullPath(location),
  };
}

function simplifyListing(listing: any) {
  return {
    id: listing?.id ?? null,
    title: listing?.title || "",
    price: listing?.price ?? null,
    beds: listing?.details?.bedrooms ?? null,
    baths: listing?.details?.bathrooms ?? null,
    areaSqft: listing?.area?.built_up ?? null,
    bayutUrl: listing?.meta?.url || null,
    coverPhoto: listing?.media?.cover_photo || listing?.media?.photos?.[0] || null,
    verifiedAt: listing?.verification?.verified_at || null,
    isVerified: Boolean(listing?.verification?.is_verified),
    referenceNumber: listing?.reference_number || null,
    cluster: listing?.location?.cluster?.name || null,
    community: listing?.location?.community?.name || null,
  };
}

function buildEmptyBuilding(location: any, fetchError: string | null = null) {
  return {
    locationId: String(location.locationId),
    buildingName: location.buildingName || location.searchName || "Unknown",
    searchName: location.searchName || location.buildingName || "Unknown",
    fullPath: location.fullPath || null,
    imageUrl: null,
    listingCount: 0,
    latestVerifiedAt: null,
    lowestPrice: null,
    highestPrice: null,
    listings: [],
    fetchError,
  };
}

async function searchLocations(query: string, apiKey: string) {
  const payload = await fetchJson(
    `${BASE_URL}/locations_search?query=${encodeURIComponent(query)}`,
    { method: "GET", headers: buildHeaders(apiKey) },
  );

  const deduped = new Map<string, any>();
  for (const location of toList(payload)) {
    const simplified = simplifySearchLocation(location);
    if (!simplified || deduped.has(simplified.locationId)) continue;
    deduped.set(simplified.locationId, { ...simplified, _score: scoreLocation(location, query) });
  }

  return [...deduped.values()]
    .sort((left, right) => right._score - left._score)
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ _score, ...location }) => location);
}

async function fetchListingsForLocation(location: any, apiKey: string) {
  const deduped = new Map<number, any>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await fetchJson(
      `${BASE_URL}/properties_search?page=${page}`,
      {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          purpose: "for-sale",
          categories: ["apartments"],
          locations_ids: [location.locationId],
          index: "popular",
          is_completed: true,
        }),
      },
    );

    const results = Array.isArray(payload?.results) ? payload.results : [];
    let addedThisPage = 0;

    for (const listing of results) {
      if (listing?.id == null || deduped.has(listing.id)) continue;
      deduped.set(listing.id, simplifyListing(listing));
      addedThisPage += 1;
    }

    if (!results.length || addedThisPage === 0 || deduped.size >= MAX_LISTINGS_PER_BUILDING) break;
  }

  const listings = [...deduped.values()]
    .sort((left, right) => parseVerifiedAt(right.verifiedAt) - parseVerifiedAt(left.verifiedAt))
    .slice(0, MAX_LISTINGS_PER_BUILDING);

  const prices = listings.map((listing) => listing.price).filter((value) => Number.isFinite(value));

  return {
    ...buildEmptyBuilding(location),
    imageUrl: listings[0]?.coverPhoto || null,
    listingCount: deduped.size,
    latestVerifiedAt: listings[0]?.verifiedAt || null,
    lowestPrice: prices.length ? Math.min(...prices) : null,
    highestPrice: prices.length ? Math.max(...prices) : null,
    listings,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("RAPIDAPI_KEY") || Deno.env.get("VITE_RAPIDAPI_KEY");
    if (!apiKey) return jsonResponse({ error: "RAPIDAPI_KEY not configured" }, 500);

    const { mode, query, locations } = await req.json();

    if (mode === "search") {
      const normalizedQuery = String(query || "").trim();
      if (normalizedQuery.length < 2) return jsonResponse({ locations: [] });

      const results = await searchLocations(normalizedQuery, apiKey);
      return jsonResponse({ locations: results });
    }

    if (mode === "watchlist") {
      if (!Array.isArray(locations) || !locations.length) return jsonResponse({ buildings: [] });

      const sanitized = locations
        .slice(0, MAX_WATCHED_BUILDINGS)
        .map((location) => ({
          locationId: String(location?.locationId || "").trim(),
          buildingName: String(location?.buildingName || "").trim() || null,
          searchName: String(location?.searchName || "").trim() || null,
          fullPath: String(location?.fullPath || "").trim() || null,
        }))
        .filter((location) => location.locationId);

      const buildings = [];
      for (const location of sanitized) {
        try {
          buildings.push(await fetchListingsForLocation(location, apiKey));
        } catch (error) {
          buildings.push(buildEmptyBuilding(location, (error as Error).message));
        }
      }

      return jsonResponse({ buildings });
    }

    return jsonResponse({ error: "Unsupported mode" }, 400);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
