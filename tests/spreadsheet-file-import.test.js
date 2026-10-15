import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseSpreadsheetFile, readSpreadsheetWorksheets } from '../src/features/seller-signal/file-import.js';

function file(sheets, bookType = 'xlsx') {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((rows, index) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), `Sheet${index}`));
  const data = XLSX.write(workbook, { type: 'array', bookType });
  return { name: `sellers.${bookType}`, size: data.byteLength, arrayBuffer: async () => data };
}

for (const extension of ['xlsx', 'xls', 'csv']) {
  test(`imports ${extension} and preserves text phone numbers`, async () => {
    const rows = [['Name', 'Phone', 'Building'], ['Alex', '0501234567', 'Forte 2']];
    assert.deepEqual(await parseSpreadsheetFile(file([rows], extension)), rows);
  });
}

test('rejects unsupported, oversized, empty and multi-worksheet files', async () => {
  await assert.rejects(parseSpreadsheetFile({ name: 'photo.png' }), /Choose an Excel/);
  await assert.rejects(parseSpreadsheetFile({ name: 'big.xlsx', size: 11 * 1024 * 1024 }), /10 MB/);
  await assert.rejects(parseSpreadsheetFile(file([[['Name']]])), /at least one seller/);
  await assert.rejects(parseSpreadsheetFile(file([[['Name'], ['Alex']], [['Name'], ['Sam']]])), /one populated worksheet/);
});

test('ignores empty worksheets', async () => {
  assert.deepEqual(await parseSpreadsheetFile(file([[], [['Name'], ['Alex']]])), [['Name'], ['Alex']]);
});

test('large Excel workbooks expose worksheet choices without losing sellers', async () => {
  const sellers = [['Name', 'Phone', 'Unit'], ...Array.from({ length: 26414 }, (_, i) => ['Aisha', '0501234567', String(i + 1)])];
  const sheets = await readSpreadsheetWorksheets(file([[['Notes'], ['Choose the sellers tab']], sellers]));
  assert.equal(sheets.length, 2);
  assert.equal(sheets[1].rows.length, 26415);
  assert.equal(sheets[1].rows.at(-1)[2], '26414');
});

test('scientific display does not truncate numeric phones; formatted unit zeros remain', async () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Phone', 'Unit'], [971501234567, 12]]);
  sheet.A2.z = '0.00E+00'; sheet.B2.z = '0000';
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sellers');
  const data = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const rows = await parseSpreadsheetFile({ name: 'sellers.xlsx', size: data.byteLength, arrayBuffer: async () => data });
  assert.deepEqual(rows[1], ['971501234567', '0012']);
});
