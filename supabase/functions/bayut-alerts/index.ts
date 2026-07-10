import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedListings, setCachedListings } from "../_shared/listing-cache.ts";
import {
  buildEmptyBuilding,
  fetchListingsForLocation,
  searchLocations,
} from "../_shared/bayut-listings-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_WATCHED_BUILDINGS = 1000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

      const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseAdmin = supabaseUrl && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey)
        : null;

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
          if (supabaseAdmin) {
            const cached = await getCachedListings(supabaseAdmin, location.locationId);
            if (cached) {
              buildings.push(cached);
              continue;
            }
          }
          const building = await fetchListingsForLocation(location, apiKey);
          if (supabaseAdmin) {
            await setCachedListings(supabaseAdmin, building);
          }
          buildings.push(building);
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
