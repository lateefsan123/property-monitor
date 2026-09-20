import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseSpreadsheetFile } from '../src/features/seller-signal/file-import.js';

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
