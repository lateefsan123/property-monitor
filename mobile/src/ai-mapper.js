import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export async function aiMapColumns(headers, sampleRows) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/map-columns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ headers, sampleRows: sampleRows.slice(0, 6) }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Column mapping failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const { mapping, error } = await response.json();
  if (error) throw new Error(error);

  return mapping;
}
