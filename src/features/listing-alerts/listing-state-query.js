export function listingStateOptions(client, userId) {
  return {
    queryKey: ["listing-alerts-state", userId],
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.all([
        client.from("listing_alerts_watchlists").select("location_id, building_name, search_name, full_path").eq("user_id", userId),
        client.from("listing_alerts_tracked_listings").select("location_id, listing_id").eq("user_id", userId),
        client.from("listing_alerts_state").select("summary, snapshot, change_items, listing_history").eq("user_id", userId).maybeSingle(),
      ]);
      for (const result of results) if (result.error) throw result.error;
      return { watchlistRows: results[0].data || [], trackedRows: results[1].data || [], stateRow: results[2].data };
    },
  };
}
