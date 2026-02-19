const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const BASE_URL = "https://uae-real-estate2.p.rapidapi.com";

const headers = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": "uae-real-estate2.p.rapidapi.com",
  "Content-Type": "application/json",
};

export async function searchLocations(query) {
  const url = `${BASE_URL}/locations_search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) throw new Error(`Location search failed: ${res.status}`);
  return res.json();
}

export async function fetchTransactions({ locationIds, beds, startDate, endDate, page = 0 }) {
  const url = `${BASE_URL}/transactions?page=${page}`;
  const body = {};

  if (locationIds?.length) body.locations_ids = locationIds;
  if (beds?.length) body.beds = beds;
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Transactions fetch failed: ${res.status}`);
  return res.json();
}

export async function searchProperties({ locationIds, purpose = "for-sale", page = 0 }) {
  const url = `${BASE_URL}/properties_search?page=${page}`;
  const body = { purpose };

  if (locationIds?.length) body.locations_ids = locationIds;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Properties search failed: ${res.status}`);
  return res.json();
}
