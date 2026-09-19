import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../config";

async function postToBayutAlerts(body, signal) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/bayut-alerts`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bayut alerts failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  if (data?.error) throw new Error(data.error);

  return data;
}

export async function searchBayutAlertLocations(query) {
  const data = await postToBayutAlerts({ mode: "search", query });
  return Array.isArray(data.locations) ? data.locations : [];
}

export async function fetchBayutWatchedBuildings(locations, signal) {
  const data = await postToBayutAlerts({ mode: "watchlist", locations }, signal);
  return Array.isArray(data.buildings) ? data.buildings : [];
}

// Load recent watches first and publish each response without waiting for older buildings.
export async function loadWatchedBuildingsProgressively(locations, onBuilding, signal) {
  const queue = [...locations].reverse();
  const results = [];
  async function worker() {
    while (queue.length && !signal?.aborted) {
      const location = queue.shift();
      let building;
      try {
        const rows = await fetchBayutWatchedBuildings([location], signal);
        building = rows.find((row) => String(row.locationId) === String(location.locationId));
        if (!building) throw new Error('No response received for this building.');
      } catch (error) {
        if (signal?.aborted) return;
        building = { ...location, listings: [], fetchError: error.message || 'Could not load listings.' };
      }
      if (signal?.aborted) return;
      results.push(building);
      onBuilding(building);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
  return results;
}
