const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface CachedBuilding {
  locationId: string;
  buildingName: string;
  searchName: string;
  fullPath: string | null;
  imageUrl: string | null;
  listingCount: number;
  latestVerifiedAt: string | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  listings: any[];
  fetchError: string | null;
}

export async function getCachedListings(
  supabaseAdmin: any,
  locationId: string,
  cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<CachedBuilding | null> {
  const { data, error } = await supabaseAdmin
    .from("listing_cache")
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle();

  if (error || !data) return null;

  const fetchedAt = new Date(data.fetched_at).getTime();
  const age = Date.now() - fetchedAt;
  if (age >= cacheTtlMs) return null;

  // Don't serve cached errors
  if (data.fetch_error) return null;

  return {
    locationId: data.location_id,
    buildingName: data.building_name || "Unknown",
    searchName: data.search_name || "Unknown",
    fullPath: data.full_path || null,
    imageUrl: data.image_url || null,
    listingCount: data.listing_count || 0,
    latestVerifiedAt: data.latest_verified_at || null,
    lowestPrice: data.lowest_price != null ? Number(data.lowest_price) : null,
    highestPrice: data.highest_price != null ? Number(data.highest_price) : null,
    listings: Array.isArray(data.listings) ? data.listings : [],
    fetchError: null,
  };
}

export async function setCachedListings(
  supabaseAdmin: any,
  building: CachedBuilding,
): Promise<void> {
  await supabaseAdmin.from("listing_cache").upsert(
    {
      location_id: building.locationId,
      building_name: building.buildingName,
      search_name: building.searchName,
      full_path: building.fullPath,
      image_url: building.imageUrl,
      listing_count: building.listingCount,
      latest_verified_at: building.latestVerifiedAt,
      lowest_price: building.lowestPrice,
      highest_price: building.highestPrice,
      listings: building.listings,
      fetch_error: building.fetchError,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "location_id" },
  );
}
