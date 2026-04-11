import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildListingAlertsState,
  createEmptyListingAlertsState,
  parseSelectedListingKeys,
} from "../_shared/listing-alerts-change-detection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_HOST = "uae-real-estate2.p.rapidapi.com";
const BASE_URL = `https://${API_HOST}`;
const PAGE_SIZE = 25;
const MAX_PAGES = 20;
const MAX_LISTINGS_PER_BUILDING = 500;
const MAX_WATCHED_BUILDINGS = 1000;
const TRACK_ALL_LISTINGS = true;

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

function parseVerifiedAt(value: unknown) {
  if (!value) return 0;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
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

function toLocationId(value: unknown) {
  if (value == null) return null;
  return String(value).trim() || null;
}

function toTrackedKey(locationId: string, listingId: string) {
  if (!locationId || !listingId) return null;
  return `${locationId}:${listingId}`;
}

async function syncUser({
  supabaseAdmin,
  userId,
  apiKey,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  userId: string;
  apiKey: string;
}) {
  const { data: watchlistRows, error: watchlistError } = await supabaseAdmin
    .from("listing_alerts_watchlists")
    .select("location_id, building_name, search_name, full_path")
    .eq("user_id", userId);

  if (watchlistError) throw watchlistError;

  const watchedItems = (watchlistRows || [])
    .slice(0, MAX_WATCHED_BUILDINGS)
    .map((row) => ({
      locationId: String(row.location_id),
      buildingName: row.building_name || row.search_name || "Unknown",
      searchName: row.search_name || row.building_name || "Unknown",
      fullPath: row.full_path || null,
    }))
    .filter((row) => row.locationId);

  if (!watchedItems.length) {
    const emptyState = createEmptyListingAlertsState({ watchedBuildingCount: 0, trackedListingCount: 0 });
    const { error: upsertError } = await supabaseAdmin
      .from("listing_alerts_state")
      .upsert({
        user_id: userId,
        summary: emptyState.summary,
        snapshot: emptyState.snapshot,
        change_items: emptyState.changeItems,
        listing_history: emptyState.listingHistory,
      }, { onConflict: "user_id" });
    if (upsertError) throw upsertError;
    return { userId, watched: 0, tracked: 0, changes: 0 };
  }

  let selectedListingKeys: string[] = [];
  if (!TRACK_ALL_LISTINGS) {
    const { data: trackedRows, error: trackedError } = await supabaseAdmin
      .from("listing_alerts_tracked_listings")
      .select("location_id, listing_id")
      .eq("user_id", userId);

    if (trackedError) throw trackedError;

    selectedListingKeys = parseSelectedListingKeys(
      (trackedRows || []).map((row) => toTrackedKey(String(row.location_id), String(row.listing_id))).filter(Boolean),
    );
  }

  const currentBuildings = [];
  for (const location of watchedItems) {
    try {
      currentBuildings.push(await fetchListingsForLocation(location, apiKey));
    } catch (error) {
      currentBuildings.push(buildEmptyBuilding(location, (error as Error).message));
    }
  }

  const { data: previousStateRow } = await supabaseAdmin
    .from("listing_alerts_state")
    .select("summary, snapshot, change_items, listing_history")
    .eq("user_id", userId)
    .maybeSingle();

  const previousState = previousStateRow
    ? {
        summary: previousStateRow.summary || {},
        snapshot: previousStateRow.snapshot || {},
        changeItems: previousStateRow.change_items || [],
        listingHistory: previousStateRow.listing_history || {},
      }
    : null;

  const checkedAt = new Date().toISOString();
  const nextState = buildListingAlertsState({
    currentBuildings,
    previousState: previousState || undefined,
    watchedItems,
    selectedListingKeys,
    checkedAt,
    trackAllListings: TRACK_ALL_LISTINGS,
  });

  const { error: upsertError } = await supabaseAdmin
    .from("listing_alerts_state")
    .upsert({
      user_id: userId,
      summary: nextState.summary,
      snapshot: nextState.snapshot,
      change_items: nextState.changeItems,
      listing_history: nextState.listingHistory,
    }, { onConflict: "user_id" });

  if (upsertError) throw upsertError;

  return {
    userId,
    watched: watchedItems.length,
    tracked: TRACK_ALL_LISTINGS ? nextState.summary?.trackedListingCount || 0 : selectedListingKeys.length,
    changes: nextState.summary?.totalChanges || 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("RAPIDAPI_KEY") || Deno.env.get("VITE_RAPIDAPI_KEY");
    if (!apiKey) return jsonResponse({ error: "RAPIDAPI_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Supabase service role not configured" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("authorization") || "";
    if (authHeader && anonKey) {
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const result = await syncUser({ supabaseAdmin, userId: user.id, apiKey });
      return jsonResponse({ mode: "user", result });
    }

    const { data: userRows, error: usersError } = await supabaseAdmin
      .from("listing_alerts_watchlists")
      .select("user_id");

    if (usersError) throw usersError;

    const userIds = [...new Set((userRows || []).map((row) => row.user_id).filter(Boolean))];
    const results = [];

    for (const userId of userIds) {
      try {
        results.push(await syncUser({ supabaseAdmin, userId, apiKey }));
      } catch (error) {
        results.push({ userId, error: (error as Error).message });
      }
    }

    return jsonResponse({ mode: "admin", results });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
