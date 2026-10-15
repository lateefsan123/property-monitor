import test from "node:test";
import assert from "node:assert/strict";
import { readConnectedSheetRows } from "../shared/connected-sheet-rows.js";

test("connected sheets are read chunk by chunk until the last one", async () => {
  const calls = [];
  const pages = { 1: { rows: [["Name"], ["A"]], nextStart: 3 }, 3: { rows: [["B"], ["C"]], nextStart: 5 }, 5: { rows: [["D"]], nextStart: null } };
  const request = async ({ input }) => { calls.push(input.start || 1); return { kind: "sheet-import", ...pages[input.start || 1] }; };
  const rows = await readConnectedSheetRows(request, { provider: "google", file: { id: "f" }, sheetName: "Sellers", userId: "u" });
  assert.deepEqual(rows.map((row) => row[0]), ["Name", "A", "B", "C", "D"]);
  assert.deepEqual(calls, [1, 3, 5]);
});

test('preserves blank rows omitted at a page boundary', async () => {
  const rows = await readConnectedSheetRows(async ({ input }) => ({ kind: 'sheet-import', ...(input.start ? { rows: [['Seller']], nextStart: null } : { rows: [['Name']], nextStart: 4 }) }), { provider: 'google', file: { id: 'f' }, sheetName: 'Sellers', userId: 'u' });
  assert.deepEqual(rows, [['Name'], [], [], ['Seller']]);
});

test('a stuck or invalid page cursor is an error, never a partial success', async () => {
  for (const nextStart of [1, -1, '2001', 999999]) {
    await assert.rejects(readConnectedSheetRows(async () => ({ kind: 'sheet-import', rows: [['Name']], nextStart }), { provider: 'microsoft', file: { id: 'f' }, sheetName: 'Sellers', userId: 'u' }), /finish reading/);
  }
});

