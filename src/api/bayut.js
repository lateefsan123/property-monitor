const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";

const apiHeaders = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
  "Content-Type": "application/json",
};

async function fetchWithRetry(url, options, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) return res.json();

    // Rate limited — wait and retry
    if (res.status === 429 && attempt < retries) {
      const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    throw new Error(`API ${res.status}`);
  }
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
