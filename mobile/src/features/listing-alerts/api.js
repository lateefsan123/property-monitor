import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../config";

async function postToBayutAlerts(body) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/bayut-alerts`, {
    method: "POST",
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

export async function fetchBayutWatchedBuildings(locations) {
  const data = await postToBayutAlerts({ mode: "watchlist", locations });
  return Array.isArray(data.buildings) ? data.buildings : [];
}
