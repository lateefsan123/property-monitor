const API_HOST = "uae-real-estate3.p.rapidapi.com";
const BASE_URL = `https://${API_HOST}`;
const MAX_PAGES = 7;
const MAX_LISTINGS_PER_BUILDING = 175;
const MAX_SEARCH_RESULTS = 8;

type LocationInput = {
  locationId: string;
  buildingName?: string | null;
  searchName?: string | null;
  fullPath?: string | null;
};

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = record.en || record.name || record.title;
    if (typeof preferred === "string") return preferred;
    const firstString = Object.values(record).find((entry) => typeof entry === "string");
    if (typeof firstString === "string") return firstString;
  }
  return "";
}

function normalizeToken(value: unknown) {
  return textValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function toLocationList(payload: any) {
  if (Array.isArray(payload)) return payload;
  return payload?.data?.locations || payload?.locations || payload?.hits || payload?.results || [];
}

function toPropertyList(payload: any) {
  if (Array.isArray(payload)) return payload;
  return payload?.data?.properties || payload?.properties || payload?.hits || payload?.results || [];
}

function extractLocationId(location: any) {
  return location?.externalID || location?.location_id || location?.id || null;
}

function extractLocationName(location: any) {
  return textValue(location?.name) || textValue(location?.title) || textValue(location?.name_l1) || "Unknown";
}

function extractFullPath(location: any) {
  return location?.path
    || location?.full_name
    || (Array.isArray(location?.location)
      ? location.location.map((entry: any) => textValue(entry?.name || entry)).filter(Boolean).join(" > ")
      : null)
    || null;
}

function scoreLocation(location: any, query: string) {
  const target = normalizeToken(query);
  const name = extractLocationName(location);
  const fullPath = extractFullPath(location) || "";
  const type = String(location?.type || "").toLowerCase();
  const normalizedName = normalizeToken(name);
  const normalizedFullPath = normalizeToken(fullPath);

  let score = 0;
  if (normalizedName === target) score += 140;
  if (normalizedName.includes(target) || target.includes(normalizedName)) score += 70;
  if (normalizedFullPath.includes(target)) score += 35;
  if (type.includes("building")) score += 15;
  score += Math.max(0, 20 - Math.abs(name.length - query.length));

  return score;
}

function parseTimestamp(value: unknown) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseVerifiedAt(value: unknown) {
  const iso = parseTimestamp(value);
  return iso ? new Date(iso).getTime() : 0;
}

function parseNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAreaSqft(value: unknown) {
  const rawValue = value && typeof value === "object"
    ? (value as Record<string, unknown>).built_up
      ?? (value as Record<string, unknown>).value
      ?? (value as Record<string, unknown>).size
    : value;
  const area = parseNumber(rawValue);
  if (area == null || area <= 0) return null;
  return area < 450 ? area * 10.7639104167 : area;
}

function buildHeaders(apiKey: string) {
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": API_HOST,
    "Content-Type": "application/json",
  };
}

async function fetchJson(url: string, apiKey: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, { method: "GET", headers: buildHeaders(apiKey) });

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

  const buildingName = extractLocationName(location);
  return {
    locationId: String(locationId),
    buildingName,
    searchName: buildingName,
    fullPath: extractFullPath(location),
  };
}

function extractBayutUrl(listing: any) {
  const externalId = listing?.externalID || listing?.id;
  if (!externalId) return null;
  return `https://www.bayut.com/property/details-${externalId}.html`;
}

function simplifyListing(listing: any) {
  const locationPath = Array.isArray(listing?.location)
    ? listing.location.map((entry: any) => textValue(entry?.name || entry)).filter(Boolean)
    : [];
  const verifiedAt = parseTimestamp(listing?.updatedAt) || parseTimestamp(listing?.createdAt);

  return {
    id: listing?.externalID ?? listing?.id ?? null,
    title: textValue(listing?.title) || "",
    price: listing?.price ?? null,
    beds: listing?.rooms ?? listing?.details?.bedrooms ?? null,
    baths: listing?.baths ?? listing?.details?.bathrooms ?? null,
    areaSqft: normalizeAreaSqft(listing?.area ?? listing?.area?.built_up),
    bayutUrl: extractBayutUrl(listing),
    coverPhoto: listing?.coverPhoto?.url
      || listing?.coverPhoto
      || listing?.media?.cover_photo
      || listing?.media?.photos?.[0]
      || null,
    verifiedAt,
    isVerified: Boolean(listing?.isVerified ?? listing?.verification?.is_verified),
    referenceNumber: listing?.referenceNumber || listing?.reference_number || null,
    cluster: locationPath.at(-1) || null,
    community: locationPath.at(-2) || null,
  };
}

export function buildEmptyBuilding(location: LocationInput, fetchError: string | null = null) {
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

export async function searchLocations(query: string, apiKey: string) {
  const payload = await fetchJson(
    `${BASE_URL}/autocomplete?query=${encodeURIComponent(query)}&langs=en`,
    apiKey,
  );

  const deduped = new Map<string, any>();
  for (const location of toLocationList(payload)) {
    const simplified = simplifySearchLocation(location);
    if (!simplified || deduped.has(simplified.locationId)) continue;
    deduped.set(simplified.locationId, { ...simplified, _score: scoreLocation(location, query) });
  }

  return [...deduped.values()]
    .sort((left, right) => right._score - left._score)
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ _score, ...location }) => location);
}

async function fetchListingsWithProviderLocation(
  location: LocationInput,
  providerLocationId: string,
  apiKey: string,
  { includeIncomplete = false } = {},
) {
  const deduped = new Map<string, any>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      purpose: "for-sale",
      location_ids: providerLocationId,
      property_type: "apartments",
      sort_order: "latest",
      page: String(page),
      langs: "en",
    });
    // Newer towers (e.g. St. Regis Residences, Tria) have all their Bayut
    // inventory tagged under-construction, so the completed filter is only a
    // first pass — callers retry without it when a building comes back empty.
    if (!includeIncomplete) params.set("completion_status", "completed");
    const payload = await fetchJson(`${BASE_URL}/search-property?${params.toString()}`, apiKey);
    const results = toPropertyList(payload);
    let addedThisPage = 0;

    for (const listing of results) {
      const listingId = listing?.externalID ?? listing?.id;
      if (listingId == null || deduped.has(String(listingId))) continue;
      deduped.set(String(listingId), simplifyListing(listing));
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

async function resolveProviderLocation(location: LocationInput, apiKey: string) {
  const query = String(location.searchName || location.buildingName || "").trim();
  if (query.length < 2) return null;

  const locations = await searchLocations(query, apiKey);
  return locations[0] || null;
}

export async function fetchListingsForLocation(location: LocationInput, apiKey: string) {
  const originalLocationId = String(location.locationId || "").trim();
  const firstAttempt = await fetchListingsWithProviderLocation(location, originalLocationId, apiKey);
  if (firstAttempt.listingCount > 0) return firstAttempt;

  const withIncomplete = await fetchListingsWithProviderLocation(location, originalLocationId, apiKey, { includeIncomplete: true });
  if (withIncomplete.listingCount > 0) return withIncomplete;

  const resolved = await resolveProviderLocation(location, apiKey);
  if (!resolved || resolved.locationId === originalLocationId) return firstAttempt;

  const resolvedLocation = {
    ...location,
    buildingName: location.buildingName || resolved.buildingName,
    searchName: location.searchName || resolved.searchName,
    fullPath: location.fullPath || resolved.fullPath,
  };

  const resolvedAttempt = await fetchListingsWithProviderLocation(resolvedLocation, resolved.locationId, apiKey);
  if (resolvedAttempt.listingCount > 0) return resolvedAttempt;

  return fetchListingsWithProviderLocation(resolvedLocation, resolved.locationId, apiKey, { includeIncomplete: true });
}
