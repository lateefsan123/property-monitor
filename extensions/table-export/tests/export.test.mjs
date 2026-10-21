import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { RowCollector, combineCaptures, inferMapping, groupBuildings, validateMapping } from '../src/records.js';
import { createExport, safeFileName, workbookBytes } from '../src/export.js';
import { zipFiles } from '../src/zip.js';
import { sampleRows, labels } from '../demo/fixture.js';
import { parseSpreadsheetFile } from '../../../src/features/seller-signal/file-import.js';
import { rowsToObjects, inferMapping as importMapping } from '../../../src/features/seller-signal/spreadsheet.js';

function capture(total = 72) {
  const columns = labels.map((label, i) => ({ id: String(i), label, order: i }));
  return { columns, rows: sampleRows(total).map(row => Object.fromEntries(row.map((v, i) => [String(i), v]))), issues: [], finished: true, verified: true, expected: total, pages: 1, source: 'http://test.invalid/sheet', capturedAt: '2026-10-21T12:00:00Z' };
}
function setup(c = capture()) {
  const data = combineCaptures([c]), mapping = inferMapping(data.columns);
  return { ...data, mapping, groups: groupBuildings(data.rows, mapping), captures: [c] };
}
function unpack(bytes) {
  const files = [], view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let pos = 0;
  while (view.getUint32(pos, true) === 0x04034b50) {
    const size = view.getUint32(pos + 18, true), nameSize = view.getUint16(pos + 26, true), extra = view.getUint16(pos + 28, true);
    const name = new TextDecoder().decode(bytes.slice(pos + 30, pos + 30 + nameSize)), start = pos + 30 + nameSize + extra;
    files.push({ name, data: bytes.slice(start, start + size) }); pos = start + size;
  }
  assert.equal(view.getUint32(pos, true), 0x02014b50);
  return files;
}
test('automatic mapping asks for clarification when a required heading is ambiguous', () => {
  const mapping = inferMapping([
    { id: 'owner', label: 'Owner name' },
    { id: 'phone1', label: 'Phone' },
    { id: 'phone2', label: 'WhatsApp' },
    { id: 'tower', label: 'Tower' },
  ]);
  assert.equal(mapping.name, 'owner');
  assert.equal(mapping.building, 'tower');
  assert.equal(mapping.phone, '');
  assert.ok(validateMapping(mapping));
  mapping.phone = 'phone2';
  assert.equal(validateMapping(mapping), '');
});
test('selected buildings round-trip through Repeat AI’s real file parser and mapping', async () => {
  const input = setup(); input.groups = input.groups.filter(g => g.name !== 'Celestia B');
  const output = await createExport(input), files = unpack(output.zip);
  assert.deepEqual(output.report.files.map(f => f.building), ['Celestia A', 'Tenora']);
  assert.equal(output.report.totalExported, 48);
  assert.equal(files.length, 3);
  for (const file of files.filter(f => f.name.endsWith('.xlsx'))) {
    const rows = await parseSpreadsheetFile({ name: file.name, size: file.data.length, arrayBuffer: async () => file.data.buffer });
    assert.equal(rows.length, 25);
    const mapped = importMapping(rows[0]);
    assert.equal(mapped.phone, 'Phone'); assert.equal(mapped.building, 'Building'); assert.equal(mapped.unit, 'Unit');
    const objects = rowsToObjects(rows);
    assert.equal(objects.records.length, 24);
    const unit = rows[0].indexOf('Unit'), phone = rows[0].indexOf('Phone');
    assert.ok(rows[1][unit].startsWith('0'));
    assert.ok(rows.slice(1).every(row => !row[phone] || /^050\d{7}$/.test(row[phone])));
  }
});
test('Excel cells cannot execute source text as formulas', () => {
  const values = ['=HYPERLINK("https://example.invalid")', '+971501234567', '0012', '@SUM(A1)', '-1', 'العربية', 'A,B\n"C"'];
  const cols = values.map((_, i) => ({ id: String(i), label: `Col${i}` }));
  const bytes = workbookBytes([Object.fromEntries(values.map((v, i) => [String(i), v]))], cols, {});
  const wb = XLSX.read(bytes, { type: 'array' });
  values.forEach((v, i) => { const cell = wb.Sheets.Sellers[XLSX.utils.encode_cell({ r: 1, c: i })]; assert.equal(cell.t, 's'); assert.equal(cell.v, v); assert.equal(cell.f, undefined); });
});
test('26,414 sellers produce importer-sized files with no lost rows', async () => {
  const c = capture(26414); c.rows.forEach(row => { row['1'] = 'Celestia A'; });
  const output = await createExport(setup(c));
  assert.equal(output.report.totalExported, 26414);
  assert.deepEqual(output.report.files.map(f => f.records), [10000, 10000, 6414]);
  let count = 0;
  for (const file of output.files.filter(f => f.name.endsWith('.xlsx'))) {
    assert.ok(file.data.length < 10 * 1024 * 1024);
    count += (await parseSpreadsheetFile({ name: file.name, size: file.data.length, arrayBuffer: async () => file.data.buffer })).length - 1;
  }
  assert.equal(count, 26414);
});
test('horizontal and vertical observations join by row/column indexes', () => {
  const collector = new RowCollector();
  collector.add({ columns: [{ id: '1', label: 'Name', order: 1 }], rows: [{ id: '7', cells: { 1: 'Owner' } }] }, 0);
  collector.add({ columns: [{ id: '2', label: 'Phone', order: 2 }], rows: [{ id: '7', cells: { 2: '0500000001' } }] }, 0);
  collector.add({ columns: [{ id: '1', label: 'Name', order: 1 }, { id: '2', label: 'Phone', order: 2 }], rows: [{ id: '7', cells: { 1: 'Next page', 2: '0500000002' } }] }, 1);
  const result = collector.result(2);
  assert.equal(result.rows.length, 2); assert.equal(result.rows[0]['2'], '0500000001'); assert.deepEqual(result.issues, []);
});
test('unstable identities and incomplete columns are flagged', () => {
  const collector = new RowCollector();
  collector.add({ columns: [{ id: '1', label: 'Name', order: 1 }, { id: '2', label: 'Phone', order: 2 }], rows: [{ id: '0', cells: { 1: 'Alex' } }] }, 0);
  collector.add({ columns: [], rows: [{ id: '0', cells: { 1: 'Different virtual row' } }] }, 0);
  assert.equal(collector.result(3).issues.length, 3);
});
test('repeat captures deduplicate exact records but retain different properties and owners', () => {
  const c = capture(2); c.rows[1]['7'] = c.rows[0]['7'];
  const combined = combineCaptures([c, c]);
  assert.equal(combined.rows.length, 2); assert.equal(combined.duplicates, 2);
});
test('different common column names across worksheets still map to the same fields', () => {
  const a = capture(2), b = capture(1);
  b.columns = b.columns.map(c => ({ ...c, label: ({ 1: 'Tower', 6: 'Owner name', 7: 'WhatsApp' })[c.id] || c.label }));
  b.rows[0]['6'] = 'Another owner'; b.rows[0]['7'] = '+971500000001';
  const combined = combineCaptures([a, b]), mapping = inferMapping(combined.columns);
  assert.equal(combined.columns.length, 9); assert.equal(combined.rows.length, 3);
  assert.equal(combined.rows[2][mapping.name], 'Another owner');
  assert.equal(combined.rows[2][mapping.phone], '+971500000001');
});
test('masked phones are retained and flagged for review', () => {
  const c = capture(2); c.rows[1]['7'] = '050****123';
  const input = setup(c);
  assert.equal(input.groups.find(g => g.name === 'Celestia B').phoneNeedsReview, 1);
});
test('filenames are safe, collision-proof, and preserve separate tower groups', async () => {
  assert.equal(safeFileName('../CON'), '..-CON'); assert.equal(safeFileName('CON'), 'Building-CON');
  const c = capture(3); c.rows[0]['1'] = 'A/B'; c.rows[1]['1'] = 'A:B'; c.rows[2]['1'] = 'a/b';
  const output = await createExport(setup(c));
  assert.equal(output.report.files.length, 2);
  assert.equal(new Set(output.report.files.map(f => f.file.toLowerCase())).size, 2);
});
test('bad captures and ambiguous field mappings cannot be exported', async () => {
  const input = setup(); input.captures[0].issues = ['Count mismatch'];
  await assert.rejects(createExport(input), /incomplete captures/);
  assert.match(validateMapping({ name: 'a', phone: 'a', building: 'b' }), /own column/);
  assert.match(validateMapping({ building: 'a' }), /name, phone/);
});
test('missing phone/building counts remain visible; no made-up values', () => {
  const c = capture(3); c.rows[0]['1'] = '';
  const input = setup(c);
  assert.equal(input.groups.find(g => !g.key).missingPhone, 1);
  assert.equal(input.groups.find(g => !g.key).rows[0][input.mapping.phone], '');
});
test('Unicode ZIP names and bytes survive local archive framing', () => {
  const data = new Uint8Array([0, 1, 255, 17]);
  assert.deepEqual(unpack(zipFiles([{ name: 'برج.xlsx', data }]))[0], { name: 'برج.xlsx', data });
});
