import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../supabase";
import { buildingIndexSignature, createBuildingIndexer } from "./building-index";
import { sellerListQueryPrefix } from "./queryKeys";

// Keeps seller_building_index current for the server-side seller list: after
// aliases and the building list load, building names that are new (or were
// matched with older aliases) are matched here, in the background, and saved.
export function useSellerBuildingIndex(userId, buildingAliases, cachedBuildings, enabled) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || !userId || !buildingAliases || !cachedBuildings) return undefined;
    let cancelled = false;
    const signature = buildingIndexSignature(buildingAliases, cachedBuildings);
    const run = async () => {
      const { data, error } = await supabase.rpc("seller_list_unindexed_buildings", { p_signature: signature, p_limit: 5000 });
      if (cancelled || error || !data?.length) return;
      const index = createBuildingIndexer(buildingAliases, cachedBuildings);
      const now = new Date().toISOString();
      const rows = [];
      for (const { raw_building: raw } of data) {
        rows.push({ user_id: userId, signature, updated_at: now, ...index(raw) });
        // Yield to the page every 200 names so typing and scrolling stay smooth.
        if (rows.length % 200 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
        if (cancelled) return;
      }
      for (let start = 0; start < rows.length; start += 500) {
        const { error: saveError } = await supabase.from("seller_building_index").upsert(rows.slice(start, start + 500), { onConflict: "user_id,raw_building" });
        if (saveError || cancelled) return;
      }
      void queryClient.invalidateQueries({ queryKey: sellerListQueryPrefix(userId) });
    };
    const timer = setTimeout(() => { void run(); }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [buildingAliases, cachedBuildings, enabled, queryClient, userId]);
}
