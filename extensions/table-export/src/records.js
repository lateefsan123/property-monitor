import { COLUMN_ALIASES } from '../../../src/features/seller-signal/constants.js';

export const fields = { name: 'Name', phone: 'Phone', building: 'Building', unit: 'Unit', bedroom: 'Bedrooms', status: 'Status', lastContact: 'Last contact' };
export const token = value => String(value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const text = value => String(value ?? '').replace(/\u00a0/g, ' ').trim();
export function inferMapping(columns) {
  return Object.fromEntries(Object.keys(fields).map(field => {
    const aliases = new Set(COLUMN_ALIASES[field].map(token));
    const matches = columns.filter(c => aliases.has(token(c.label)));
    return [field, matches.length === 1 ? matches[0].id : ''];
  }));
}
export function validateMapping(mapping) {
  if (!mapping.name || !mapping.phone) return 'Choose the name and phone columns before downloading.';
  const selected = Object.values(mapping).filter(Boolean);
  return new Set(selected).size !== selected.length ? 'Each field needs its own column.' : '';
}
// Merge repeated observations by source row identity, not phone: one owner can
// have multiple properties, and several owners can share a unit.
export class RowCollector {
  columns = new Map(); rows = new Map(); conflicts = new Set();
  add(snapshot, page) {
    for (const c of snapshot.columns) {
      const previous = this.columns.get(c.id);
      if (previous && token(previous.label) !== token(c.label)) this.conflicts.add('Column headings changed during collection. Restart with a stable sheet.');
      this.columns.set(c.id, c);
    }
    for (const row of snapshot.rows) {
      const key = `${page}:${row.id}`;
      const previous = this.rows.get(key) || {};
      for (const [col, value] of Object.entries(row.cells)) {
        if (Object.hasOwn(previous, col) && previous[col] !== value) this.conflicts.add('Rows changed or reused their identifiers while scrolling. This capture cannot be exported safely.');
        previous[col] = value;
      }
      this.rows.set(key, previous);
    }
  }
  result(expectedColumns) {
    const columns = [...this.columns.values()].sort((a, b) => a.order - b.order);
    const rows = [...this.rows.values()];
    const missingCells = rows.filter(row => columns.some(c => !Object.hasOwn(row, c.id))).length;
    const issues = [...this.conflicts];
    if (missingCells) issues.push(`${missingCells} rows have columns that were never captured. Try a longer wait or a non-virtual table view.`);
    if (expectedColumns && columns.length !== expectedColumns) issues.push(`Captured ${columns.length} of ${expectedColumns} expected columns.`);
    return { columns, rows, issues };
  }
}
export function combineCaptures(captures) {
  // Normalize column identity across sheets without losing duplicate headings.
  const columns = new Map(), rows = [], seen = new Set();
  let duplicates = 0;
  for (const capture of captures) {
    const occurrences = new Map();
    const mapped = capture.columns.map(c => {
      const known = Object.keys(fields).find(field => COLUMN_ALIASES[field].some(alias => token(alias) === token(c.label)));
      const base = known ? `field-${known}` : token(c.label) || 'column';
      const n = (occurrences.get(base) || 0) + 1; occurrences.set(base, n);
      const id = `${base}:${n}`;
      if (!columns.has(id)) columns.set(id, { id, label: known ? fields[known] : c.label, order: columns.size });
      return { old: c.id, id };
    });
    for (const raw of capture.rows) {
      const row = Object.fromEntries(mapped.map(c => [c.id, text(raw[c.old])]));
      const fingerprint = JSON.stringify(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)));
      if (seen.has(fingerprint)) { duplicates++; continue; }
      seen.add(fingerprint); rows.push(row);
    }
  }
  return { columns: [...columns.values()], rows, duplicates };
}
export function groupBuildings(rows, mapping) {
  const groups = new Map();
  for (const row of rows) {
    const name = mapping.building ? text(row[mapping.building]) : 'Sellers';
    const key = mapping.building ? name.normalize('NFKC').replace(/\s+/g, ' ').toLowerCase() : '__all_sellers__';
    if (!groups.has(key)) groups.set(key, { key, name: name || 'Missing building', rows: [], missingPhone: 0, missingName: 0, phoneNeedsReview: 0 });
    const group = groups.get(key);
    group.rows.push(row);
    const phone = text(row[mapping.phone]), digits = phone.replace(/\D/g, '');
    if (!phone) group.missingPhone++;
    else if (/[xX*•]/.test(phone) || digits.length < 7 || digits.length > 15) group.phoneNeedsReview++;
    if (!text(row[mapping.name])) group.missingName++;
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
