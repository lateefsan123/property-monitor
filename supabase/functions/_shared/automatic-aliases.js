// Building names matched automatically (building_resolutions, status
// "matched") as alias rows for the automations, the same matches the Sellers
// page uses. Explicit aliases (building_aliases) still win; callers add these
// only where an account has no alias of its own for that name.
const PAGE = 1000;
const aliasKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export async function loadAutomaticAliases(client, userIds, wantedKeys) {
  const rows = [];
  const ids = [...new Set((userIds || []).filter(Boolean))];
  for (let start = 0; start < ids.length; start += 100) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from('building_resolutions')
        .select('id, user_id, raw_name, building_key, buildings!inner(search_name)')
        .in('user_id', ids.slice(start, start + 100)).eq('status', 'matched')
        .order('id', { ascending: true }).range(from, from + PAGE - 1);
      if (error) {
        throw new Error(`Could not load automatic building matches: ${error.message}`);
      }
      for (const row of data || []) {
        const key = aliasKey(row.raw_name);
        if (!key || (wantedKeys && !wantedKeys.has(key))) continue;
        rows.push({ user_id: row.user_id, alias_key: key, canonical_name: row.buildings?.search_name, building_key: row.building_key });
      }
      if (!data || data.length < PAGE) break;
    }
  }
  return rows;
}
