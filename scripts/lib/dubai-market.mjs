import { parseCsvText, rowsToObjects, normalizeToken } from './bayut-common.mjs';

export const DLD_EXPORT_URL = 'https://gateway.dubailand.gov.ae/open-data/transactions/export/csv';
export const MARKET_SOURCE = 'dld_citywide';
const RESIDENTIAL_TYPES = new Set(['flat', 'residential flats', 'villa', 'residential / attached villas', 'hotel apartment']);
const label = value => String(value || '').replace(/\s+/g, ' ').trim();
export const COMMUNITY_COPY_SUFFIX = '#community';
export const isVilla = type => /villa/i.test(label(type));

// One name per villa community across DLD's spellings: "Arabian Ranches lll",
// "ARABIAN RANCHES III" and "Arabain Ranches lll" -> "Arabian Ranches 3"; "AR II" -> "Arabian Ranches 2".
const NUMERALS = { i: '1', ii: '2', ll: '2', iii: '3', lll: '3', iv: '4' };
export function communityName(value) {
  const words = label(value).replace(/,/g, ' ').toLowerCase().replace(/\barabain\b/g, 'arabian').replace(/^ar\b/, 'arabian ranches')
    .split(/\s+/).filter(Boolean).map((word, index) => (index > 0 && NUMERALS[word]) || word);
  return words.map(word => /^\d/.test(word) ? word : word[0].toUpperCase() + word.slice(1)).join(' ');
}
// Community keys get a prefix so they can never clash with a "Project, Area" key.
export const communityKey = value => normalizeToken(`community ${communityName(value)}`);

// "Arabian Ranches lll - Raya" -> "Arabian Ranches lll"; "The Valley-Nara" -> "The Valley".
// A hyphen without spaces only splits after two or more words, so "Al-Furjan" stays whole.
export function villaCommunity(project) {
  const name = label(project);
  const spaced = name.split(/\s+-\s+/);
  if (spaced.length > 1 && spaced[0].length >= 3) return spaced[0];
  const tight = name.match(/^(\S+(?:\s+\S+)+?)-(\S.*)$/);
  return tight && tight[1].trim().split(/\s+/).length >= 2 ? tight[1].trim() : null;
}
const number = value => label(value) === '' ? null : Number(String(value).replace(/,/g, ''));

export function dateWindow(days, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('Days must be between 1 and 366.');
  const end = now.toISOString().slice(0, 10);
  const start = new Date(`${end}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end };
}

export async function fetchDubaiExport(period, fetcher = fetch) {
  const usDate = iso => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
  const response = await fetcher(DLD_EXPORT_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({ parameters: {
      P_FROM_DATE: usDate(period.start), P_TO_DATE: usDate(period.end),
      P_GROUP_ID: '1', P_IS_OFFPLAN: '', P_IS_FREE_HOLD: '', P_AREA_ID: '',
      P_USAGE_ID: '1', P_PROP_TYPE_ID: '', P_TAKE: '-1', P_SKIP: '', P_SORT: 'INSTANCE_DATE_DESC',
    }, labels: {} }),
  });
  if (!response.ok) throw new Error(`DLD export failed: HTTP ${response.status}`);
  const csv = await response.text();
  if (!csv.trim() || csv.trim().startsWith('<')) throw new Error('DLD returned an empty or non-CSV response.');
  return csv;
}

// This catalogue describes DLD projects, not a government registry of every tower.
// Keep the area in the name/key: common project names occur in multiple areas.
export function buildDubaiMarket(csv, period) {
  const { headers, records } = rowsToObjects(parseCsvText(csv));
  for (const field of ['TRANSACTION_NUMBER', 'PROJECT_EN', 'AREA_EN', 'INSTANCE_DATE', 'TRANS_VALUE', 'PROP_SB_TYPE_EN', 'PROCEDURE_EN']) {
    if (!headers.includes(field)) throw new Error(`Missing DLD column: ${field}`);
  }
  if (!records.length) throw new Error('DLD export contains no records.');
  const reportedTotal = number(records[0].TOTAL);
  if (reportedTotal !== null && (!Number.isInteger(reportedTotal) || reportedTotal !== records.length)) {
    throw new Error(`Incomplete DLD export: received ${records.length} of ${reportedTotal} rows.`);
  }
  const buildings = new Map();
  const transactions = new Map();
  const areas = new Map();
  const skipped = {};
  const skip = reason => { skipped[reason] = (skipped[reason] || 0) + 1; };
  for (const row of records) {
    const procedure = label(row.PROCEDURE_EN).toLowerCase();
    if (!/^(sale|sell)(\b|\s)/.test(procedure) || /mortgage|gift|lease|rent/.test(procedure)) { skip('nonSale'); continue; }
    if (!RESIDENTIAL_TYPES.has(label(row.PROP_SB_TYPE_EN).toLowerCase())) { skip('nonResidentialUnit'); continue; }
    const villa = isVilla(row.PROP_SB_TYPE_EN);
    const area = label(row.AREA_EN);
    // Resale villas in older communities (Arabian Ranches I, Al Furjan, Motor City)
    // often have no DLD project: they're filed under the community itself below.
    const sourceProject = label(row.PROJECT_EN);
    const project = sourceProject || (villa ? area : '');
    if (!project || !area || /^(unknown|n\/a|0|-)$/i.test(project)) { skip('missingProjectOrArea'); continue; }
    const id = label(row.TRANSACTION_NUMBER);
    const date = label(row.INSTANCE_DATE).slice(0, 10);
    const amount = number(row.TRANS_VALUE);
    const actualArea = number(row.ACTUAL_AREA);
    const procedureArea = number(row.PROCEDURE_AREA);
    const sqm = actualArea > 0 ? actualArea : procedureArea;
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
      || !Number.isFinite(amount) || amount < 100000 || !Number.isFinite(sqm) || sqm <= 0) { skip('invalidComp'); continue; }
    if (period && (date < period.start || date > period.end)) { skip('outsideWindow'); continue; }
    if (actualArea > 0 && procedureArea > 0 && procedureArea < actualArea * 0.95) { skip('partialShare'); continue; }
    const community = villa ? (sourceProject ? villaCommunity(sourceProject) : area) : null;
    const byCommunity = villa && !sourceProject;
    const name = byCommunity ? communityName(area) : `${project}, ${area}`;
    const key = byCommunity ? communityKey(area) : normalizeToken(name);
    const entry = byCommunity
      ? { key, search_name: name, location_name: name, source_project: name, source_area: '' }
      : { key, search_name: name, location_name: project, source_project: project, source_area: area };
    const existing = buildings.get(key);
    if (existing && (normalizeToken(existing.source_project) !== normalizeToken(entry.source_project)
      || normalizeToken(existing.source_area) !== normalizeToken(entry.source_area))) throw new Error(`Project key collision: ${name}`);
    const bedsLabel = label(row.ROOMS_EN);
    const beds = /studio/i.test(bedsLabel) ? '0' : bedsLabel.match(/\d+/)?.[0] || null;
    const transaction = {
      source_transaction_id: id, building_key: key, amount, date,
      category: [label(row.PROCEDURE_EN), label(row.IS_OFFPLAN_EN)].filter(Boolean).join(' | '),
      beds, property_type: label(row.PROP_SB_TYPE_EN), builtup_area_sqft: Math.round(sqm * 10.7639 * 100) / 100,
      location_name: project, full_location: [area, label(row.MASTER_PROJECT_EN), project].filter(Boolean).join(' -> '),
    };
    const previous = transactions.get(id);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(transaction)) throw new Error(`Conflicting DLD transaction ID: ${id}`);
      skip('duplicate'); continue;
    }
    buildings.set(key, entry);
    transactions.set(id, transaction);
    // Villa projects are sub-communities ("Arabian Ranches lll - Raya"). A copy
    // under the community ("Arabian Ranches 3") lets sellers listed by community
    // get its sales too. Copies carry a "#community" ID so they never replace the
    // original and market totals can leave them out.
    if (sourceProject && community) {
      const copyKey = communityKey(community);
      const copyName = communityName(community);
      buildings.set(copyKey, { key: copyKey, search_name: copyName, location_name: copyName, source_project: copyName, source_area: '' });
      transactions.set(`${id}${COMMUNITY_COPY_SUFFIX}`, { ...transaction, source_transaction_id: `${id}${COMMUNITY_COPY_SUFFIX}`, building_key: copyKey });
    }
    const areaKey = normalizeToken(area);
    const stats = areas.get(areaKey) || { area, transactions: 0, projects: new Set() };
    stats.transactions += 1;
    stats.projects.add(key);
    areas.set(areaKey, stats);
  }
  return {
    buildings: [...buildings.values()], transactions: [...transactions.values()],
    summary: {
      source: MARKET_SOURCE, scope: 'Residential sales with a named DLD project and area; not every Dubai building.',
      period, rowsScanned: records.length, projects: buildings.size, transactions: transactions.size, skipped,
      areas: [...areas.values()].map(a => ({ ...a, projects: a.projects.size })).sort((a, b) => b.transactions - a.transactions),
    },
  };
}
