import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.99.2';
import { acceptAiChoice, askBuildingAi, buildCatalogue, findCandidates, safeCandidate } from '../_shared/building-resolution.js';

const reply = (body: unknown, status = 200) => Response.json(body, { status });
Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const internalToken = Deno.env.get('SELLER_SIGNAL_AUTO_WHATSAPP_TOKEN');
  // Service-only worker. A user JWT or anonymous API key cannot process other accounts.
  if (!(serviceKey && req.headers.get('authorization') === `Bearer ${serviceKey}`)
      && !(internalToken && req.headers.get('x-auto-whatsapp-token') === internalToken)) {
    return reply({ error: 'Unauthorized' }, 401);
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey!, { auth: { persistSession: false } });
  try {
    const input = await req.json().catch(() => ({}));
    const dryRunName = input.dryRun === true && typeof input.name === 'string' ? input.name.slice(0, 240) : null;
    // Exhausted leases need human review even when a worker terminated before saving.
    if (!dryRunName) {
      const expired = await db.from('building_resolutions').update({ status: 'review', reason: 'Processing interrupted; internal review required' })
        .eq('status', 'processing').gte('attempts', 3).lt('updated_at', new Date(Date.now() - 900000).toISOString());
      if (expired.error) throw expired.error;
    }
    const claimed = dryRunName ? { data: [], error: null } : await db.rpc('claim_building_resolutions', { batch_size: 16 });
    if (claimed.error) throw claimed.error;
    if (!dryRunName && !claimed.data?.length) return reply({ processed: 0 });
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await db.from('buildings').select('key,search_name,source_project,source_area').order('key').range(offset, offset + 999);
      if (page.error) throw page.error;
      rows.push(...page.data);
      if (page.data.length < 1000) break;
    }
    const catalogue = buildCatalogue(rows);
    if (dryRunName) {
      const candidates = findCandidates(dryRunName, catalogue);
      const safe = safeCandidate(candidates);
      const key = Deno.env.get('OPENAI_API_KEY');
      if (!key) return reply({ error: 'AI configuration unavailable' }, 503);
      const result = safe ? acceptAiChoice(await askBuildingAi(dryRunName, candidates, key), candidates) : null;
      return reply({ dryRun: true, matched: Boolean(result), canonicalName: result?.name || null, candidates: candidates.map(c => c.name) });
    }
    const counts = { processed: 0, matched: 0, review: 0, retry: 0 };
    async function resolve(job: Record<string, any>) {
      let update: Record<string, unknown>;
      try {
        const candidates = findCandidates(job.raw_name, catalogue);
        const safe = safeCandidate(candidates);
        let chosen = safe?.score === 1 ? safe : null;
        let method = 'exact';
        if (!chosen && safe) {
          const apiKey = Deno.env.get('OPENAI_API_KEY');
          if (!apiKey) throw new Error('AI configuration unavailable');
          chosen = acceptAiChoice(await askBuildingAi(job.raw_name, candidates, apiKey), candidates);
          method = 'ai_verified';
        }
        update = { status: chosen ? 'matched' : 'review', building_key: chosen?.id || null,
          method: chosen ? method : null, reason: chosen ? 'Catalogue and identity checks passed' : 'No unambiguous verified building match',
          candidates: candidates.map(c => ({ key: c.id, name: c.name, score: c.score })) };
      } catch {
        update = { status: job.attempts < 3 ? 'pending' : 'review', reason: 'Matching temporarily unavailable; retained for retry or internal review' };
      }
      const saved = await db.from('building_resolutions').update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', job.id).eq('lease_id', job.lease_id).eq('status', 'processing').select('id');
      if (saved.error) throw saved.error;
      if (saved.data?.length) {
        counts.processed++;
        if (update.status === 'matched') counts.matched++;
        else if (update.status === 'review') counts.review++;
        else counts.retry++;
      }
    }
    // Four concurrent requests, at most sixteen names per run; no contact data sent to AI.
    for (let i = 0; i < claimed.data.length; i += 4) await Promise.all(claimed.data.slice(i, i + 4).map(resolve));
    return reply(counts);
  } catch {
    return reply({ error: 'Building matching worker failed; pending work will retry' }, 500);
  }
});
