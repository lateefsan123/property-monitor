import test from 'node:test';
import assert from 'node:assert/strict';
import { complimentaryAccess } from '../supabase/functions/_shared/complimentary-access.js';

test('private sales demo access is bounded and bound to its Auth ID', () => {
  const id = '90dec869-75fa-4294-8bf1-7e4c2384184f';
  const end = Date.parse('2026-12-31T23:59:59.000Z');
  const access = complimentaryAccess({ id }, end - 1);
  assert.equal(access.source, 'complimentary');
  assert.equal(access.unlimited, false);
  assert.equal(complimentaryAccess({ id }, end), null);
  assert.equal(complimentaryAccess({ id: 'other', user_metadata: { id } }, end - 1), null);
});
