import { normalizeName } from './building-resolution.js';

const PAGE = 1000;
const token = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const identity = value => normalizeName(value).split(' ').filter(word => !['the', 'tower', 'residence'].includes(word)).join(' ');
// DLD's district name for the Downtown Dubai development area.
const areaIdentity = value => normalizeName(value) === 'downtown dubai' ? 'burj khalifa' : normalizeName(value);
const projectIdentity = value => normalizeName(value).replace(/\bt (?=\d+$)/, 'tower ');
const ST_REGIS_PROJECT = 'thestregisresidencesdowntowndubaiburjkhalifa';
// Verified legacy tower labels for this DLD development. This is a sales
// crosswalk, not permission to substitute one tower for another in the CRM.
const ST_REGIS_NAMES = new Set([
  'ST REGIS TOWER 1', 'ST REGIS TOWER2', 'St Regis tower 2',
  'The St. Regis The Residences Tower 1, Downtown Dubai',
  'The St. Regis The Residences Tower 2, Downtown Dubai',
].map(normalizeName));

export function createTransactionBuildingResolver(buildings) {
  const rows = buildings.filter(row => row.source === 'dld_citywide' && row.key && row.source_project && row.source_area);
  const byKey = new Map(rows.map(row => [row.key, row]));
  const exact = new Map();
  const projects = new Map();
  const projectNames = new Map();
  const add = (map, key, row) => {
    if (!map.has(key)) map.set(key, new Map());
    map.get(key).set(row.key, row);
  };
  for (const row of rows) {
    add(exact, normalizeName(row.search_name), row);
    add(projects, identity(row.source_project), row);
    add(projectNames, normalizeName(row.source_project), row);
  }
  const unique = values => values?.size === 1 ? [...values.values()][0] : null;
  return raw => {
    const name = String(raw || '').trim();
    const direct = byKey.get(name) || unique(exact.get(normalizeName(name)));
    if (direct) return { key: direct.key, name: direct.search_name, scope: 'building' };
    if (ST_REGIS_NAMES.has(normalizeName(name)) && byKey.has(ST_REGIS_PROJECT)
      && !rows.some(row => /st regis/.test(normalizeName(row.source_project)) && /\btower\b/.test(normalizeName(row.source_project)))) {
      return { key: ST_REGIS_PROJECT, name: byKey.get(ST_REGIS_PROJECT).search_name, scope: 'development' };
    }
    // Commas supply location context. Never discard it to resolve an unknown
    // or conflicting area, and never fuzzy-match a different numbered tower.
    const [project, ...area] = name.split(',');
    const normalizedProject = projectIdentity(project);
    const core = identity(normalizedProject);
    const candidates = projectNames.get(normalizedProject)
      || (core.includes(' ') || /\btower\b/.test(normalizedProject) ? projects.get(core) : null);
    const filtered = area.length
      ? new Map([...(candidates || [])].filter(([, row]) => areaIdentity(row.source_area) === areaIdentity(area.join(','))))
      : candidates;
    const match = unique(filtered);
    if (match) return { key: match.key, name: match.search_name, scope: 'building' };
    // DLD sometimes reports a whole development, e.g. FORTE, instead of
    // FORTE TOWER 1/2. Only use the parent if its name/area is unique and the
    // catalogue has no separately recorded numbered tower in that area.
    const parentName = normalizedProject.replace(/ (?:tower |building |block )?(?:\d+|[a-z])$/, '');
    if (parentName === normalizedProject) return null;
    const parents = projectNames.get(parentName) || projects.get(identity(parentName));
    const allowed = new Map([...(parents || [])].filter(([, row]) => !area.length || areaIdentity(row.source_area) === areaIdentity(area.join(','))));
    const parent = unique(allowed);
    if (!parent) return null;
    const siblings = rows.some(row => areaIdentity(row.source_area) === areaIdentity(parent.source_area)
      && identity(row.source_project).startsWith(`${identity(parent.source_project)} `)
      && /(?: \d+| [a-z])$/.test(identity(row.source_project)));
    return siblings ? null : { key: parent.key, name: parent.search_name, scope: 'development' };
  };
}

export async function loadTransactionBuildingMatches(client, leads, aliasLookup, getBaseKeys) {
  const buildings = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from('buildings')
      .select('key, search_name, source, source_project, source_area')
      .eq('source', 'dld_citywide').order('key', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(`Could not load transaction building catalogue: ${error.message}`);
    buildings.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  const resolve = createTransactionBuildingResolver(buildings);
  const matches = new Map();
  const summary = { buildings: 0, matched: 0, unresolved: [] };
  for (const lead of leads) {
    const id = `${lead.user_id}|${lead.building}`;
    if (matches.has(id)) continue;
    const userNames = new Set();
    const globalNames = new Set();
    for (const key of new Set([token(lead.building), ...getBaseKeys(lead.building)])) {
      for (const name of aliasLookup.get(`${lead.user_id}:${key}`) || []) userNames.add(name);
      for (const name of aliasLookup.get(`*:${key}`) || []) globalNames.add(name);
    }
    const names = userNames.size ? userNames : globalNames.size ? globalNames : [lead.building];
    const resolved = new Map();
    for (const name of names) {
      const match = resolve(name);
      if (match) resolved.set(match.key, match);
    }
    const match = resolved.size === 1 ? [...resolved.values()][0] : null;
    matches.set(id, match);
    summary.buildings += 1;
    if (match) summary.matched += 1;
    else summary.unresolved.push({ userId: lead.user_id, building: lead.building });
  }
  return { matches, summary };
}
