const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function postToBayutAlerts(body, { signal } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured");
  }

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

export async function searchBayutAlertLocations(query, options) {
  const data = await postToBayutAlerts({ mode: "search", query }, options);
  return Array.isArray(data.locations) ? data.locations : [];
}

export async function fetchBayutWatchedBuildings(locations, options) {
  const data = await postToBayutAlerts({ mode: "watchlist", locations }, options);
  return Array.isArray(data.buildings) ? data.buildings : [];
}
