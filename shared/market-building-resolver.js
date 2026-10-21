import { createTransactionBuildingResolver } from '../supabase/functions/_shared/transaction-building-matches.js';

// The catalogue is public market data, not account data. Keep one bounded cache
// per client and share in-flight reads between seller pages.
export function createMarketBuildingResolver(client) {
  let cached;
  let expiresAt = 0;
  let pending;
  return async function loadResolver() {
    if (cached && Date.now() < expiresAt) return cached;
    if (pending) return pending;
    pending = (async () => {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await client.from('buildings')
          .select('key, search_name, source, source_project, source_area')
          .eq('source', 'dld_citywide').order('key', { ascending: true }).range(from, from + 999);
        if (error) throw new Error('Could not load current property market data. Please try again.');
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      cached = createTransactionBuildingResolver(rows);
      expiresAt = Date.now() + 5 * 60 * 1000;
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  };
}
