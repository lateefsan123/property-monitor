import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.99.2';
import { isAutomationAccount } from '../_shared/automation-account.js';
import { generateTemplateDraft, validateTemplateBrief } from '../_shared/template-draft.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { ...cors, 'Cache-Control': 'no-store' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const token = /^Bearer (\S+)$/i.exec(req.headers.get('authorization') || '')?.[1];
  if (!token) return reply({ error: 'Sign in to draft a template.' }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.id || data.user.is_anonymous) return reply({ error: 'Sign in to draft a template.' }, 401);
  let brief;
  try { brief = validateTemplateBrief(await req.json()); }
  catch { return reply({ error: 'Describe the message in 5–600 characters.' }, 400); }
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return reply({ error: 'Template drafting is temporarily unavailable.' }, 503);
  try {
    const quota = await db.rpc('reserve_ai_template_draft', { account_id: data.user.id });
    if (quota.error) throw quota.error;
    if (!quota.data) return reply({ error: 'AI drafting has reached its daily limit. Try again tomorrow, or write your template manually.' }, 429);
    return reply({ draft: await generateTemplateDraft(brief, apiKey, fetch, isAutomationAccount(data.user.id)) });
  } catch {
    return reply({ error: 'Could not generate a draft. Your template has not changed.' }, 502);
  }
});
