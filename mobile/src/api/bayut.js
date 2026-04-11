const env = globalThis.process?.env ?? {};
const API_KEY = env.EXPO_PUBLIC_RAPIDAPI_KEY?.trim() || "";
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";

const apiHeaders = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
  "Content-Type": "application/json",
};

async function fetchWithRetry(url, options, retries = 4) {
  if (!API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_RAPIDAPI_KEY");
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);

    if (response.ok) return response.json();

    if (response.status === 429 && attempt < retries) {
      const delay = 2000 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`API ${response.status}`);
  }

  throw new Error("Bayut request failed");
}

export async function searchLocations(query) {
  const url = `${BASE_URL}/locations_search?query=${encodeURIComponent(query)}`;
  return fetchWithRetry(url, { method: "GET", headers: apiHeaders });
}

export async function fetchTransactions({
  locationIds,
  startDate,
  endDate,
  beds,
  purpose = "for-sale",
  category = "residential",
  completionStatus = "completed",
  sortBy = "date",
  order = "desc",
  page = 0,
}) {
  const url = `${BASE_URL}/transactions?page=${page}`;
  const body = {};

  if (locationIds?.length) body.locations_ids = locationIds;
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;
  if (Array.isArray(beds) && beds.length) body.beds = beds;
  if (purpose) body.purpose = purpose;
  if (category) body.category = category;
  if (completionStatus) body.completion_status = completionStatus;
  if (sortBy) body.sort_by = sortBy;
  if (order) body.order = order;

  return fetchWithRetry(url, {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify(body),
  });
}
