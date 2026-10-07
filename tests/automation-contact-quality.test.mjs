import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { AUTOMATION_ACCOUNT_ID } from '../supabase/functions/_shared/automation-account.js';

test('only automation contacts omit property requirements while retaining contact checks', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const { enrichLeadsWithDataQuality } = await vite.ssrLoadModule('/src/features/seller-signal/lead-data-quality.js');
    const contact = { id: 'fixture', sourceId: 'sheet', name: 'Broker', phone: '+971501234567' };
    const quality = (lead, userId) => enrichLeadsWithDataQuality([lead], [], [], userId)[0].dataQuality;
    assert.equal(quality(contact, AUTOMATION_ACCOUNT_ID).label, 'Complete');
    for (const userId of [undefined, 'other-account']) {
      assert.deepEqual(quality(contact, userId).issues.map(x => x.id), ['missing_unit', 'missing_building']);
    }
    assert.deepEqual(quality({ ...contact, name: '', phone: '' }, AUTOMATION_ACCOUNT_ID).issues.map(x => x.id), ['missing_name', 'missing_phone']);
  } finally { await vite.close(); }
});
