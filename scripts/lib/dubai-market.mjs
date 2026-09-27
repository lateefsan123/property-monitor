import { parseCsvText, rowsToObjects, normalizeToken } from './bayut-common.mjs';

export const DLD_EXPORT_URL = 'https://gateway.dubailand.gov.ae/open-data/transactions/export/csv';
export const MARKET_SOURCE = 'dld_citywide';
const RESIDENTIAL_TYPES = new Set(['flat', 'residential flats', 'villa', 'residential / attached villas', 'hotel apartment']);
const label = value => String(value || '').replace(/\s+/g, ' ').trim();
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
    const project = label(row.PROJECT_EN);
    const area = label(row.AREA_EN);
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
    const name = `${project}, ${area}`;
    const key = normalizeToken(name);
    const existing = buildings.get(key);
    if (existing && (normalizeToken(existing.source_project) !== normalizeToken(project)
      || normalizeToken(existing.source_area) !== normalizeToken(area))) throw new Error(`Project key collision: ${name}`);
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
    buildings.set(key, { key, search_name: name, location_name: project, source_project: project, source_area: area });
    transactions.set(id, transaction);
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
