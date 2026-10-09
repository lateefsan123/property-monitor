// Nearby sales (seller_signal_automation_settings.nearby_sales_enabled, off by
// default): a seller whose building had no sale in the lookback gets recent
// sales in the same DLD area instead, and when the area had none either, what
// is listed for sale in their building (Bayut, cached a week per building).
import { fetchListingsForLocation, searchLocations } from "./bayut-listings-provider.ts";

const LISTING_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AREA_LOOKUP_BATCH = 500;

const nameKey = (value: unknown) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// "AREA -> Building" (DLD): the area, upper-cased.
export function saleArea(transaction: any) {
  const full = String(transaction?.full_location || "");
  if (!full.includes("->")) return null;
  const area = full.split("->")[0].trim().toUpperCase();
  return area || null;
}

// Accounts that turned nearby sales on.
export async function loadNearbySalesUsers(client: any, userIds: string[]) {
  const users = new Set<string>();
  if (!userIds.length) return users;
  const { data, error } = await client
    .from("seller_signal_automation_settings")
    .select("user_id")
    .in("user_id", userIds)
    .eq("nearby_sales_enabled", true);
  // 42703: the column isn't in this database yet, so nobody has it on.
  if (error?.code === "42703") return users;
  if (error) throw new Error(`Could not load nearby sales settings: ${error.message}`);
  for (const row of data || []) users.add(String(row.user_id));
  return users;
}

// building key -> DLD area, for the given keys.
export async function loadBuildingAreas(client: any, keys: string[]) {
  const areas = new Map<string, string>();
  const unique = [...new Set(keys.filter(Boolean))];
  for (let start = 0; start < unique.length; start += AREA_LOOKUP_BATCH) {
    const { data, error } = await client.rpc("seller_signal_building_areas", { p_keys: unique.slice(start, start + AREA_LOOKUP_BATCH) });
    if (error) throw new Error(`Could not load building areas: ${error.message}`);
    for (const row of data || []) if (row.area) areas.set(row.building_key, row.area);
  }
  return areas;
}

// The area most of a seller's building keys point to.
export function leadArea(keys: string[], areas: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const key of keys) {
    const area = areas.get(key);
    if (area) counts.set(area, (counts.get(area) || 0) + 1);
  }
  let best: string | null = null;
  for (const [area, count] of counts) if (!best || count > (counts.get(best) || 0)) best = area;
  return best;
}

// The seller's template, worded for sales near their building, not in it.
export const nearbyTemplate = (content: string) => content.replace(/\bin\s+\{\{building\}\}/gi, "near {{building}}");

// Same style as the sales lines in transaction updates ("2.10M AED").
function formatPrice(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M AED`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K AED`;
  return `${Math.round(value)} AED`;
}

export function buildListingsMessage(name: string, building: string, snapshot: any) {
  const count = Number(snapshot?.listing_count || 0);
  const low = Number(snapshot?.lowest_price);
  const high = Number(snapshot?.highest_price);
  const prices = Number.isFinite(low) && low > 0
    ? (count > 1 && Number.isFinite(high) && high > low ? `, asking ${formatPrice(low)} to ${formatPrice(high)}` : `, asking ${formatPrice(low)}`)
    : "";
  const listed = count === 1 ? "1 unit is listed for sale right now" : `${count} units are listed for sale right now`;
  return `Hi ${name}, quick update on ${building}: ${listed}${prices}.\n\nIf you'd like to know what yours could sell for, just let me know.`;
}

// What's listed for sale in a building, from the week-old cache, or (when
// allowed) one fresh Bayut lookup that is cached either way. Only a Bayut
// building whose name is one of the seller's building keys counts, so a
// seller never gets another building's listings.
// Cached snapshots for these buildings, in one query (name_key -> row).
export async function loadListingSnapshots(client: any, buildings: string[]) {
  const snapshots = new Map<string, any>();
  const keys = [...new Set(buildings.map(nameKey).filter(Boolean))];
  for (let start = 0; start < keys.length; start += 200) {
    const { data, error } = await client
      .from("seller_signal_listing_snapshots")
      .select("*")
      .in("name_key", keys.slice(start, start + 200));
    if (error) {
      console.warn("Could not load cached listings", error.message);
      return snapshots;
    }
    for (const row of data || []) snapshots.set(row.name_key, row);
  }
  return snapshots;
}

export async function listingSnapshot(client: any, building: string, buildingKeys: string[], allowFetch: boolean, snapshots: Map<string, any>) {
  const key = nameKey(building);
  if (!key) return { snapshot: null, fetched: false };
  const cached = snapshots.get(key);
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < LISTING_SNAPSHOT_TTL_MS) {
    return { snapshot: cached.fetch_error ? null : cached, fetched: false };
  }
  const apiKey = Deno.env.get("RAPIDAPI_KEY") || Deno.env.get("VITE_RAPIDAPI_KEY");
  if (!allowFetch || !apiKey) return { snapshot: null, fetched: false };

  const accepted = new Set([key, ...buildingKeys.map(nameKey)]);
  const row: Record<string, unknown> = { name_key: key, building_name: building, fetched_at: new Date().toISOString() };
  try {
    const match = (await searchLocations(building, apiKey))
      .find((location: any) => accepted.has(nameKey(location.buildingName)));
    if (match) {
      const listings = await fetchListingsForLocation(match, apiKey);
      Object.assign(row, {
        location_id: match.locationId,
        listing_count: listings.listingCount || 0,
        lowest_price: listings.lowestPrice,
        highest_price: listings.highestPrice,
        listings: (listings.listings || []).slice(0, 20),
        fetch_error: null,
      });
    } else {
      Object.assign(row, { listing_count: 0, listings: [], fetch_error: null });
    }
  } catch (error) {
    Object.assign(row, { listing_count: 0, listings: [], fetch_error: error instanceof Error ? error.message : "Lookup failed" });
  }
  const { error: saveError } = await client.from("seller_signal_listing_snapshots").upsert(row, { onConflict: "name_key" });
  if (saveError) console.warn("Could not cache listings", saveError.message);
  snapshots.set(key, row);
  return { snapshot: row.fetch_error ? null : row, fetched: true };
}
