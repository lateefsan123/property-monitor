import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return reply({ error: 'Unauthorized' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return reply({ error: 'Unauthorized' }, 401);
  let input;
  try { input = await req.json(); } catch { return reply({ error: 'Invalid request' }, 400); }
  const validLeadId = (typeof input?.leadId === 'string' && input.leadId.trim().length > 0) || (Number.isSafeInteger(input?.leadId) && input.leadId > 0);
  if (!validLeadId || typeof input?.accountId !== 'string') return reply({ error: 'Seller and account required' }, 400);
  // Use user-scoped queries and explicit owner checks. Never accept a phone or session from the client.
  const [seller, account] = await Promise.all([
    client.from('leads').select('phone').eq('id', input.leadId).eq('user_id', user.id).maybeSingle(),
    client.from('whatsapp_accounts').select('provider, phone_number_id, raw_account, connection_status').eq('id', input.accountId).eq('user_id', user.id).maybeSingle(),
  ]);
  if (seller.error || account.error) return reply({ error: 'Lookup failed' }, 400);
  if (!seller.data || !account.data) return reply({ error: 'Not found' }, 404);
  const connection = account.data;
  if (connection.provider !== 'baileys' || connection.connection_status !== 'connected') return reply({ url: null });
  const sessionId = connection.raw_account?.baileys?.session_id || (connection.phone_number_id?.startsWith('baileys:') ? connection.phone_number_id.slice(8) : null);
  const digits = String(seller.data.phone || '').replace(/\D/g, '');
  const phone = digits.startsWith('0') ? `971${digits.slice(1)}` : digits;
  const service = Deno.env.get('BAILEYS_SERVICE_URL');
  const token = Deno.env.get('BAILEYS_SERVICE_TOKEN');
  if (!sessionId || !/^\d{7,15}$/.test(phone) || !service || !token) return reply({ url: null });
  try {
    const response = await fetch(`${service.replace(/\/+$/, '')}/sessions/${encodeURIComponent(sessionId)}/profile-photo`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return reply({ url: null });
    const result = await response.json();
    const url = typeof result?.url === 'string' ? new URL(result.url) : null;
    return reply({ url: url?.protocol === 'https:' && !url.username && !url.password ? url.href : null });
  } catch { return reply({ url: null }); }
});
