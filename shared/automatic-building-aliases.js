import { selectCountedRows } from './select-counted-rows.js';

export const automaticAliasKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

export async function fetchAutomaticBuildingAliases(supabase, userId) {
  if (!userId) return [];
  const rows = await selectCountedRows(count => supabase.from('building_resolutions')
    .select('id, raw_name, method, buildings!inner(search_name)', count ? { count: 'exact' } : {})
    .eq('user_id', userId).eq('status', 'matched').order('id'));
  return rows.map(row => ({ id: row.id, userId, aliasName: row.raw_name,
    canonicalName: row.buildings.search_name, automatic: true, method: row.method }));
}
