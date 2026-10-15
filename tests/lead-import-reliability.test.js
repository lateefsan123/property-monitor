import test from 'node:test';
import assert from 'node:assert/strict';
import { saveImportBatches } from '../src/features/seller-signal/import-batches.js';
import { buildLeadSyncPlan } from '../src/features/seller-signal/lead-sync-plan.js';
import { prepareImportRows, validateImportMapping } from '../src/features/seller-signal/import-preview.js';
import { createLeadInsertRecord } from '../src/features/seller-signal/lead-utils.js';
import { prepareImportLeads } from '../src/features/seller-signal/prepare-import-leads.js';
import { rowsToObjects, parseCsvText } from '../src/features/seller-signal/spreadsheet.js';
import { userFacingError, UserFacingError } from '../shared/user-facing-errors.js';
import { rejectedRowsCsv } from '../src/features/seller-signal/import-rejected-rows.js';

const seller = (unit = '101', extra = {}) => ({ user_id: 'alice', source_id: 'sheet', name: 'Aisha', phone: '0501234567', building: 'Forte 2', unit, ...extra });
const noWait = async () => {};

test('26,414 sellers survive mapping, dedupe, batched save and a complete reimport', async () => {
  const rows = [['Owner Name', 'Mobile', 'Building', 'Unit'], ...Array.from({ length: 26414 }, (_, i) => ['Aisha', '0501234567', 'Forte 2', String(i + 1)])];
  const { records, mapping } = prepareImportRows(rows);
  const incoming = await prepareImportLeads(records, mapping, 'alice', { sourceId: 'sheet' });
  const plan = buildLeadSyncPlan([], incoming);
  assert.equal(plan.toInsert.length, 26414);
  const stored = new Map();
  let calls = 0;
  const result = await saveImportBatches(plan.toInsert, { wait: noWait, write: async batch => {
    calls += 1; assert.ok(batch.length <= 200);
    batch.forEach(row => stored.set(row.import_key, { ...row, id: row.import_key }));
    return { error: null };
  } });
  assert.equal(calls, 133); assert.equal(result.inserted, 26414); assert.equal(stored.size, 26414);
  const again = buildLeadSyncPlan([...stored.values()], incoming);
  assert.equal(again.toInsert.length, 0); assert.equal(again.matchedCount, 26414);
});

test('a committed batch whose response was lost is retried with identical keys', async () => {
  const stored = new Map(); let calls = 0;
  const result = await saveImportBatches([seller(), seller('102')], { wait: noWait, write: async batch => {
    calls += 1;
    batch.forEach(row => { if (!stored.has(row.import_key)) stored.set(row.import_key, row); });
    if (calls === 1) throw new TypeError('Failed to fetch');
    return { error: null };
  } });
  assert.equal(result.inserted, 2); assert.equal(stored.size, 2); assert.equal(calls, 2);
});

test('offline after a successful batch stops promptly, with honest saved progress', async () => {
  let calls = 0;
  await assert.rejects(saveImportBatches(Array.from({ length: 26414 }, (_, i) => seller(String(i))), {
    wait: noWait, write: async () => { calls += 1; if (calls > 1) throw new TypeError('Failed to fetch https://private-server'); return { error: null }; },
  }), error => {
    assert.ok(error instanceof UserFacingError); assert.match(userFacingError(error), /200 sellers were confirmed saved/);
    assert.doesNotMatch(userFacingError(error), /private-server/); return true;
  });
  assert.equal(calls, 4);
});

test('auth failures never fan out into per-row retries', async () => {
  let calls = 0;
  await assert.rejects(saveImportBatches([seller(), seller('102')], { wait: noWait, write: async () => { calls += 1; return { error: { code: '42501', message: 'RLS private details' } }; } }), /0 sellers were confirmed saved/);
  assert.equal(calls, 1);
});

test('one invalid row is isolated and other rows are saved', async () => {
  const result = await saveImportBatches([seller('101'), seller('bad'), seller('103')], { wait: noWait, write: async batch => ({ error: batch.some(row => row.unit === 'bad') ? { code: '22001', message: 'value too long' } : null }) });
  assert.equal(result.inserted, 2); assert.equal(result.failed, 1); assert.equal(result.failedRows[0].unit, 'bad');
});

test('different units, buildings and same-name owners never disappear as duplicates', () => {
  const plan = buildLeadSyncPlan([], [seller(), seller('102'), seller('101', { building: 'Forte 1' }), seller('101', { phone: '0509999999' }), seller()]);
  assert.equal(plan.toInsert.length, 4); assert.equal(plan.skippedDuplicateCount, 1);
});

test('a contact-only row cannot swallow that owner’s individual properties', () => {
  const plan = buildLeadSyncPlan([], [seller(null), seller('101'), seller('102')]);
  assert.equal(plan.toInsert.length, 3);
  const filling = buildLeadSyncPlan([seller(null, { id: 1 })], [seller('101'), seller('102')]);
  assert.equal(filling.matchedCount, 1);
  assert.equal(filling.toInsert.length, 1);
  assert.equal(filling.toInsert[0].unit, '102');
});

test('non-Latin names retain identity and phone-only rows can be imported', () => {
  assert.equal(buildLeadSyncPlan([], [seller('101', { name: 'علي', phone: null }), seller('101', { name: 'أحمد', phone: null }), { phone: '0501234567' }]).toInsert.length, 3);
});

test('ambiguous existing matches do not overwrite an arbitrary property; app state survives', () => {
  const existing = [seller('101', { id: 1, status: 'Not Interested', last_contact: '2026-10-01', notes: 'Keep' }), seller('102', { id: 2 })];
  const ambiguous = buildLeadSyncPlan(existing, [seller(null)]);
  assert.equal(ambiguous.toInsert.length, 1); assert.equal(ambiguous.updates.length, 0);
  const matched = buildLeadSyncPlan(existing, [seller('101', { status: 'Prospect', last_contact: '2026-01-01', bedroom: '2' })]);
  assert.deepEqual(matched.updates, [{ id: 1, fields: { bedroom: '2' } }]);
  assert.equal(existing[0].notes, 'Keep');
});

test('header selection, duplicate headings, reserved names and physical row numbers are safe', () => {
  const parsed = rowsToObjects([['CRM export'], ['Name', 'Phone', 'Phone', 'Phone (2)', '__proto__', '__row'], [], ['Aisha', '00123', '456', '789', 'value', 'other']], { headerRowIndex: 1 });
  assert.equal(new Set(parsed.headers).size, 6);
  assert.equal(parsed.records[0].__row, 4);
  assert.equal(parsed.records[0]['Phone'], '00123');
  assert.equal(parsed.records[0]['__proto__'], 'value');
});

test('unknown and reused columns require review; explicit custom mapping works', () => {
  const preview = prepareImportRows([['Unusual owner label', 'Unusual contact label'], ['Aisha', '00123']]);
  assert.throws(() => validateImportMapping(preview.headers, preview.mapping), /Choose a phone/);
  assert.doesNotThrow(() => validateImportMapping(preview.headers, { name: 'Unusual owner label', phone: 'Unusual contact label' }));
  assert.throws(() => validateImportMapping(preview.headers, { name: 'Unusual contact label', phone: 'Unusual contact label' }), /only be used once/);
  assert.throws(() => validateImportMapping(preview.headers, { phone: 'Invented' }), /columns changed/);
});

test('CSV preserves quoted commas/newlines and rejects unfinished quotes', () => {
  assert.deepEqual(parseCsvText('\uFEFFName,Phone\r\n"Aisha, A\nB",00123'), [['Name', 'Phone'], ['Aisha, A\nB', '00123']]);
  assert.throws(() => parseCsvText('Name,Phone\n"unfinished,123'), /unfinished quoted cell/);
});

test('split first and last names combine, while title prose does not become a header', () => {
  const preview = prepareImportRows([['Export for owner contacts'], ['First name', 'Last name', 'Phone'], ['Aisha', 'Khan', '0501234567']]);
  assert.equal(preview.headerRowIndex, 1);
  assert.equal(preview.records[0][preview.mapping.name], 'Aisha Khan');
});

test('invalid contact dates are actionable and valid dates retain their calendar day', () => {
  const mapping = { name: 'Name', phone: 'Phone', lastContact: 'Date' };
  assert.throws(() => createLeadInsertRecord({ __row: 17, Name: 'Aisha', Date: '2026-02-31' }, mapping, 'alice'), /Row 17/);
  assert.equal(createLeadInsertRecord({ Name: 'Aisha', Date: '01/10/2026' }, mapping, 'alice').last_contact, '2026-10-01');
  assert.equal(createLeadInsertRecord({ Name: 'Aisha', Date: 'Never' }, mapping, 'alice').last_contact, null);
});

test('rejected-row downloads omit internal fields and neutralize spreadsheet formulas', () => {
  const csv = rejectedRowsCsv([{ name: '=HYPERLINK("private")', phone: '+971501234567', import_key: 'internal', user_id: 'owner' }]);
  assert.match(csv, /'=/); assert.match(csv, /'\+971/); assert.doesNotMatch(csv, /internal|owner/);
});

test('unknown backend details never appear in user-facing errors', () => {
  for (const error of [new Error('duplicate key violates leads_user_id'), { message: '<html>Cloudflare private stack</html>' }, 'relation public.leads does not exist', { error: 'private provider payload' }]) {
    assert.equal(userFacingError(error), 'Something went wrong. Please try again.');
  }
  assert.match(userFacingError({ status: 401 }), /sign in again/);
  assert.match(userFacingError(new TypeError('Failed to fetch')), /internet connection/);
  assert.equal(userFacingError(new UserFacingError('Choose a worksheet.')), 'Choose a worksheet.');
});
