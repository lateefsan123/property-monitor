const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Calls the Supabase Edge Function to map spreadsheet columns using AI.
 * The OpenAI key stays server-side in the Edge Function.
 */
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
