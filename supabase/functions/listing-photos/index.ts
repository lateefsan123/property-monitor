import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const cache = new Map<string, { photos: string[], expires: number }>();
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization');
  if (!token) return reply({ error: 'Unauthorized' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return reply({ error: 'Unauthorized' }, 401);
  let body;
  try { body = await req.json(); } catch { return reply({ error: 'Invalid request' }, 400); }
  const id = String(body?.listingId || '');
  if (!/^\d{1,20}$/.test(id)) return reply({ error: 'Invalid listing' }, 400);
  const cached = cache.get(id);
  if (cached && cached.expires > Date.now()) return reply({ photos: cached.photos });
  try {
    const key = Deno.env.get('RAPIDAPI_KEY') || Deno.env.get('VITE_RAPIDAPI_KEY');
    if (!key) throw new Error('Provider unavailable');
    const response = await fetch(`https://uae-real-estate3.p.rapidapi.com/property-details?external_id=${id}&langs=en`, {
      headers: { 'x-rapidapi-host': 'uae-real-estate3.p.rapidapi.com', 'x-rapidapi-key': key }, signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('Provider unavailable');
    const payload = await response.json();
    const listing = payload?.data?.property || payload?.data || payload;
    const raw = listing?.photos || listing?.media?.photos || [];
    const photos = [...new Set((Array.isArray(raw) ? raw : []).map(photo => typeof photo === 'string' ? photo : photo?.url).filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url)))].slice(0, 60);
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(id, { photos, expires: Date.now() + 60 * 60_000 });
    return reply({ photos });
  } catch { return reply({ error: 'Photos temporarily unavailable' }, 502); }
});
