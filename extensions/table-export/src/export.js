import * as XLSX from 'xlsx';
import { fields, validateMapping } from './records.js';
import { zipFiles } from './zip.js';

export function safeFileName(name) {
  let cleaned = [...String(name).normalize('NFKC')].map(c => c.charCodeAt(0) < 32 ? '-' : c).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 100).replace(/[. ]+$/g, '');
  if (!cleaned) cleaned = 'Building';
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(cleaned)) cleaned = `Building-${cleaned}`;
  return cleaned;
}
export function workbookBytes(rows, columns, mapping) {
  if (columns.length > 100) throw new Error('Repeat AI accepts up to 100 columns per spreadsheet. Choose a narrower table view.');
  const mapped = new Map(Object.entries(mapping).filter(([, id]) => id).map(([field, id]) => [id, fields[field]]));
  const used = new Set();
  // Put canonical columns first; preserve every other source column afterward.
  const ordered = [...columns].sort((a, b) => Number(mapped.has(b.id)) - Number(mapped.has(a.id)));
  const headings = ordered.map(c => {
    const base = mapped.get(c.id) || c.label || 'Column';
    let label = base, n = 1;
    while (used.has(label.toLowerCase())) label = `${base} (${++n})`;
    used.add(label.toLowerCase()); return label;
  });
  const values = [headings, ...rows.map(row => ordered.map(c => String(row[c.id] ?? '')))];
  if (values.some(row => row.some(v => v.length > 32767))) throw new Error('A cell exceeds Excel’s text limit. Shorten that cell in the source and capture again.');
  const sheet = XLSX.utils.aoa_to_sheet(values);
  // All cells are strings: leading zeros/plus signs survive, and untrusted text
  // beginning = + - @ never becomes an Excel formula.
  for (const key of Object.keys(sheet)) if (!key.startsWith('!')) { sheet[key].t = 's'; sheet[key].z = '@'; delete sheet[key].f; }
  sheet['!cols'] = ordered.map(c => ({ wch: mapped.get(c.id) === 'Name' ? 28 : 22 }));
  sheet['!autofilter'] = { ref: sheet['!ref'] };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sellers');
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }));
}
export async function createExport({ groups, columns, mapping, captures, duplicates }, progress = () => {}) {
  const issue = validateMapping(mapping);
  if (issue) throw new Error(issue);
  if (!groups.length) throw new Error('Select at least one building.');
  if (captures.some(c => c.issues.length || !c.finished)) throw new Error('Remove incomplete captures and scan them again before downloading.');
  const files = [], used = new Set(), counts = [];
  async function chunks(rows) {
    const data = workbookBytes(rows, columns, mapping);
    if (data.length < 9.5 * 1024 * 1024) return [{ data, rows: rows.length }];
    if (rows.length === 1) throw new Error('A record is too large for Repeat AI. Remove unnecessary source columns and try again.');
    const half = Math.ceil(rows.length / 2);
    return [...await chunks(rows.slice(0, half)), ...await chunks(rows.slice(half))];
  }
  for (const group of groups) {
    if (!group.key) throw new Error('Rows without a building cannot be exported as a building file.');
    const parts = [];
    for (let start = 0; start < group.rows.length; start += 10000) {
      await new Promise(resolve => setTimeout(resolve, 0));
      parts.push(...await chunks(group.rows.slice(start, start + 10000)));
      progress(`Preparing ${group.name}: ${Math.min(start + 10000, group.rows.length).toLocaleString()} rows`);
    }
    parts.forEach((part, i) => {
      const base = `${safeFileName(group.name)}${parts.length > 1 ? ` - part ${i + 1}` : ''}`;
      let name = `${base}.xlsx`, suffix = 1;
      while (used.has(name.toLowerCase())) name = `${base} (${++suffix}).xlsx`;
      used.add(name.toLowerCase()); files.push({ name, data: part.data });
      counts.push({ file: name, building: group.name, records: part.rows });
    });
  }
  const report = {
    createdAt: new Date().toISOString(), files: counts,
    totalExported: groups.reduce((n, g) => n + g.rows.length, 0), exactDuplicatesSkipped: duplicates,
    missingPhones: groups.reduce((n, g) => n + g.missingPhone, 0),
    phonesNeedingReview: groups.reduce((n, g) => n + g.phoneNeedsReview, 0),
    captures: captures.map(c => ({ source: c.source, capturedAt: c.capturedAt, records: c.rows.length, expected: c.expected, expectedSource: c.expectedSource, countVerified: c.verified, pages: c.pages })),
    note: 'Only rows exposed by the selected page view were collected. Filters remain in effect. Unknown source totals require manual review. Missing or masked phones are not recovered. Importing these files does not send messages.',
  };
  files.push({ name: 'capture-report.json', data: JSON.stringify(report, null, 2) });
  return { files, report, zip: zipFiles(files) };
}
