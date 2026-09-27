import { selectCountedRows } from './select-counted-rows.js';

export async function selectCachedBuildings(supabase) {
  if (!supabase) return [];
  return selectCountedRows(count => supabase.from('buildings')
    .select('key, search_name, location_name, location_id, source, source_project, source_area', count ? { count: 'exact' } : {})
    .order('search_name').order('key'));
}
