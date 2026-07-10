import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedListings, setCachedListings } from "../_shared/listing-cache.ts";
import {
  buildEmptyBuilding,
  fetchListingsForLocation,
} from "../_shared/bayut-listings-provider.ts";
import {
  buildListingAlertsState,
  createEmptyListingAlertsState,
  parseSelectedListingKeys,
} from "../_shared/listing-alerts-change-detection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-listing-alerts-sync-token",
};

const MAX_WATCHED_BUILDINGS = 1000;
const TRACK_ALL_LISTINGS = true;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ADMIN_SYNC_TOKEN_HEADER = "x-listing-alerts-sync-token";

type SyncUserOptions = {
  forceFresh?: boolean;
  sendNotifications?: boolean;
};

type SyncRunResult = {
  userId: string;
  watched?: number;
  tracked?: number;
  changes?: number;
  priceDrops?: number;
  fetchErrors?: number;
  fetchErrorDetails?: { locationId: string; buildingName: string; error: string }[];
  error?: string;
};

type WatchedItem = {
  locationId: string;
  buildingName: string;
  searchName: string;
  fullPath: string | null;
};

type SyncUserPrefetch = {
  buildingsByLocation?: Map<string, any>;
};

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized)) return true;
    if (["0", "false", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
}

async function parseRequestBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return {};

  try {
    const parsed = await req.json();
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getBearerToken(authHeader: string) {
  const [scheme, ...tokenParts] = authHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;
  return tokenParts.join(" ").trim() || null;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right || left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function isAdminSyncRequest(
  supabaseAdmin: any,
  req: Request,
  serviceRoleKey: string,
) {
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = getBearerToken(authHeader);
  if (serviceRoleKey && constantTimeEqual(bearerToken, serviceRoleKey)) return true;

  const syncToken = req.headers.get(ADMIN_SYNC_TOKEN_HEADER)?.trim();
  if (!syncToken) return false;

  const tokenHash = await sha256Hex(syncToken);
  const { data, error } = await supabaseAdmin
    .from("listing_alerts_sync_tokens")
    .select("token_hash")
    .eq("id", "cron")
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return constantTimeEqual(tokenHash, data?.token_hash);
}

async function recordSyncRun(
  supabaseAdmin: any,
  {
    mode,
    source,
    forceFresh,
    sendNotifications,
    startedAt,
    results,
    errorMessage = null,
  }: {
    mode: string;
    source: string;
    forceFresh: boolean;
    sendNotifications: boolean;
    startedAt: string;
    results: SyncRunResult[];
    errorMessage?: string | null;
  },
) {
  const fetchErrorCount = results.reduce((sum, result) => sum + (result.fetchErrors || 0), 0);
  const errorCount = results.filter((result) => result.error).length + fetchErrorCount + (errorMessage ? 1 : 0);
  const watchedBuildingCount = results.reduce((sum, result) => sum + (result.watched || 0), 0);
  const trackedListingCount = results.reduce((sum, result) => sum + (result.tracked || 0), 0);
  const changeCount = results.reduce((sum, result) => sum + (result.changes || 0), 0);
  const priceDropCount = results.reduce((sum, result) => sum + (result.priceDrops || 0), 0);

  try {
    await supabaseAdmin.from("listing_alerts_sync_runs").insert({
      mode,
      source,
      force_fresh: forceFresh,
      send_notifications: sendNotifications,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: errorMessage ? "error" : errorCount ? "partial" : "ok",
      user_count: results.length,
      watched_building_count: watchedBuildingCount,
      tracked_listing_count: trackedListingCount,
      change_count: changeCount,
      price_drop_count: priceDropCount,
      error_count: errorCount,
      results,
      error: errorMessage,
    });
  } catch {
    // Sync run auditing is useful for diagnostics, but should never block alerts.
  }
}

async function sendPushNotifications(
  supabaseAdmin: any,
  userId: string,
  priceDropItems: any[],
) {
  if (!priceDropItems.length) return;

  const { data: tokenRows } = await supabaseAdmin
    .from("notification_tokens")
    .select("expo_push_token")
    .eq("user_id", userId);

  const tokens = (tokenRows || []).map((row: any) => row.expo_push_token).filter(Boolean);
  if (!tokens.length) return;

  const dropCount = priceDropItems.length;
  const first = priceDropItems[0];
  const title = dropCount === 1
    ? `Price drop in ${first.buildingName}`
    : `${dropCount} price drops detected`;
  const body = dropCount === 1
    ? `${first.title} dropped by AED ${Math.abs(first.priceDelta).toLocaleString()}`
    : `${priceDropItems.map((item: any) => item.buildingName).filter((name: string, index: number, arr: string[]) => arr.indexOf(name) === index).slice(0, 3).join(", ")}`;

  const messages = tokens.map((token: string) => ({
    to: token,
    sound: "default",
    title,
    body,
    channelId: "price-drops",
    data: { type: "price_drop", count: dropCount },
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch {
    // Push delivery is best-effort; don't fail the sync.
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseVerifiedAt(value: unknown) {
  if (!value) return 0;
  const parsed = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getLatestSnapshotCheckedAt(snapshot: any) {
  let latest: string | null = null;
  for (const building of Object.values(snapshot || {}) as any[]) {
    const checkedAt = typeof building?.checkedAt === "string" ? building.checkedAt : null;
    if (!checkedAt) continue;
    if (!latest || parseVerifiedAt(checkedAt) > parseVerifiedAt(latest)) latest = checkedAt;
  }
  return latest;
}

function toLocationId(value: unknown) {
  if (value == null) return null;
  return String(value).trim() || null;
}

function toTrackedKey(locationId: string, listingId: string) {
  if (!locationId || !listingId) return null;
  return `${locationId}:${listingId}`;
}

function normalizeWatchlistRows(rows: any[] = [], maxRows: number | null = MAX_WATCHED_BUILDINGS): WatchedItem[] {
  const rowsToNormalize = maxRows == null ? rows : rows.slice(0, maxRows);
  return rowsToNormalize
    .map((row: any) => ({
      locationId: String(row.location_id),
      buildingName: row.building_name || row.search_name || "Unknown",
      searchName: row.search_name || row.building_name || "Unknown",
      fullPath: row.full_path || null,
    }))
    .filter((row: WatchedItem) => row.locationId);
}

async function fetchBuildingSnapshot({
  supabaseAdmin,
  location,
  apiKey,
  forceFresh,
}: {
  supabaseAdmin: any;
  location: WatchedItem;
  apiKey: string;
  forceFresh: boolean;
}) {
  try {
    if (!forceFresh) {
      const cached = await getCachedListings(supabaseAdmin, location.locationId);
      if (cached) return cached;
    }

    const building = await fetchListingsForLocation(location, apiKey);
    await setCachedListings(supabaseAdmin, building);
    return building;
  } catch (error) {
    return buildEmptyBuilding(location, (error as Error).message);
  }
}

async function fetchUniqueBuildingSnapshots({
  supabaseAdmin,
  watchedItems,
  apiKey,
  forceFresh,
}: {
  supabaseAdmin: any;
  watchedItems: WatchedItem[];
  apiKey: string;
  forceFresh: boolean;
}) {
  const uniqueLocations = new Map<string, WatchedItem>();
  for (const location of watchedItems) {
    if (!uniqueLocations.has(location.locationId)) {
      uniqueLocations.set(location.locationId, location);
    }
  }

  const buildingsByLocation = new Map<string, any>();
  for (const location of uniqueLocations.values()) {
    const building = await fetchBuildingSnapshot({
      supabaseAdmin,
      location,
      apiKey,
      forceFresh,
    });
    buildingsByLocation.set(location.locationId, building);
  }

  return buildingsByLocation;
}

async function syncUser({
  supabaseAdmin,
  userId,
  apiKey,
  forceFresh = false,
  sendNotifications = true,
  buildingsByLocation,
}: {
  supabaseAdmin: any;
  userId: string;
  apiKey: string;
} & SyncUserOptions & SyncUserPrefetch) {
  const { data: watchlistRows, error: watchlistError } = await supabaseAdmin
    .from("listing_alerts_watchlists")
    .select("location_id, building_name, search_name, full_path")
    .eq("user_id", userId);

  if (watchlistError) throw watchlistError;

  const watchedItems = normalizeWatchlistRows(watchlistRows || []);

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
      (trackedRows || []).map((row: any) => toTrackedKey(String(row.location_id), String(row.listing_id))).filter(Boolean),
    );
  }

  const currentBuildings = [];
  const fetchErrorDetails: { locationId: string; buildingName: string; error: string }[] = [];
  for (const location of watchedItems) {
    const building = buildingsByLocation?.get(location.locationId)
      || await fetchBuildingSnapshot({
        supabaseAdmin,
        location,
        apiKey,
        forceFresh,
      });

    if (building?.fetchError) {
      fetchErrorDetails.push({
        locationId: String(location.locationId),
        buildingName: location.buildingName || location.searchName || "Unknown",
        error: building.fetchError,
      });
    }

    currentBuildings.push(building);
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

  const attemptedAt = new Date().toISOString();
  const hasFreshBuilding = currentBuildings.some((building: any) => !building.fetchError);
  const latestPreviousSnapshotAt = getLatestSnapshotCheckedAt(previousState?.snapshot);
  const previousHadFetchErrors = Number(previousState?.summary?.fetchErrorCount || 0) > 0;
  const previousSuccessfulCheckedAt = latestPreviousSnapshotAt
    || (previousHadFetchErrors ? null : previousState?.summary?.lastCheckedAt || null);
  const checkedAt = hasFreshBuilding ? attemptedAt : previousSuccessfulCheckedAt || attemptedAt;
  const nextState = buildListingAlertsState({
    currentBuildings,
    previousState: previousState || undefined,
    watchedItems,
    selectedListingKeys,
    checkedAt,
    trackAllListings: TRACK_ALL_LISTINGS,
  });
  const nextSummary = {
    ...nextState.summary,
    lastCheckedAt: hasFreshBuilding ? nextState.summary.lastCheckedAt : previousSuccessfulCheckedAt,
    lastAttemptedAt: attemptedAt,
    fetchErrorCount: fetchErrorDetails.length,
    lastFetchErrorAt: fetchErrorDetails.length ? attemptedAt : null,
    lastFetchErrorMessage: fetchErrorDetails[0]?.error || null,
  };

  const { error: upsertError } = await supabaseAdmin
    .from("listing_alerts_state")
    .upsert({
      user_id: userId,
      summary: nextSummary,
      snapshot: nextState.snapshot,
      change_items: nextState.changeItems,
      listing_history: nextState.listingHistory,
    }, { onConflict: "user_id" });

  if (upsertError) throw upsertError;

  const priceDropItems = (nextState.changeItems || []).filter((item: any) => item.type === "price_drop");
  if (sendNotifications) await sendPushNotifications(supabaseAdmin, userId, priceDropItems);

  return {
    userId,
    watched: watchedItems.length,
    tracked: TRACK_ALL_LISTINGS ? nextState.summary?.trackedListingCount || 0 : selectedListingKeys.length,
    changes: nextState.summary?.totalChanges || 0,
    priceDrops: priceDropItems.length,
    fetchErrors: fetchErrorDetails.length,
    fetchErrorDetails: fetchErrorDetails.slice(0, 10),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  let syncResults: SyncRunResult[] = [];

  try {
    const body = await parseRequestBody(req);
    const forceFresh = toBoolean((body as any).forceFresh ?? (body as any).ignoreCache, false);
    const sendNotifications = (body as any).sendNotifications === false || (body as any).notify === false
      ? false
      : true;
    const source = typeof (body as any).source === "string" && (body as any).source.trim()
      ? (body as any).source.trim().slice(0, 80)
      : "manual";

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
    const isAdminRequest = await isAdminSyncRequest(supabaseAdmin, req, serviceRoleKey);

    if (authHeader && !isAdminRequest && anonKey) {
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

      const result = await syncUser({
        supabaseAdmin,
        userId: user.id,
        apiKey,
        forceFresh,
        sendNotifications,
      });
      syncResults = [result];
      await recordSyncRun(supabaseAdmin, {
        mode: "user",
        source,
        forceFresh,
        sendNotifications,
        startedAt,
        results: syncResults,
      });
      return jsonResponse({ mode: "user", forceFresh, notify: sendNotifications, result });
    }

    if (!isAdminRequest) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: watchlistRows, error: usersError } = await supabaseAdmin
      .from("listing_alerts_watchlists")
      .select("user_id, location_id, building_name, search_name, full_path");

    if (usersError) throw usersError;

    const userIds = [...new Set((watchlistRows || []).map((row) => row.user_id).filter(Boolean))];
    const allWatchedItems = normalizeWatchlistRows(watchlistRows || [], null);
    const buildingsByLocation = await fetchUniqueBuildingSnapshots({
      supabaseAdmin,
      watchedItems: allWatchedItems,
      apiKey,
      forceFresh,
    });
    const uniqueWatchedBuildings = buildingsByLocation.size;
    const results = [];

    for (const userId of userIds) {
      try {
        results.push(await syncUser({
          supabaseAdmin,
          userId,
          apiKey,
          forceFresh,
          sendNotifications,
          buildingsByLocation,
        }));
      } catch (error) {
        results.push({ userId, error: (error as Error).message });
      }
    }

    syncResults = results;
    await recordSyncRun(supabaseAdmin, {
      mode: "admin",
      source,
      forceFresh,
      sendNotifications,
      startedAt,
      results: syncResults,
    });
    return jsonResponse({ mode: "admin", forceFresh, notify: sendNotifications, uniqueWatchedBuildings, results });
  } catch (error) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      await recordSyncRun(supabaseAdmin, {
        mode: "unknown",
        source: "manual",
        forceFresh: false,
        sendNotifications: false,
        startedAt,
        results: syncResults,
        errorMessage: (error as Error).message,
      });
    }
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
