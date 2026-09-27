import test from 'node:test';
import assert from 'node:assert/strict';
import { dubaiDateKey, followUpAfterDays, followUpPending, isSellerAttachment } from '../supabase/functions/_shared/seller-follow-up.js';
import { introAttachmentPath } from '../supabase/functions/_shared/intro-attachment.js';
import { build } from 'esbuild';
import { Buffer } from 'node:buffer';
import process from 'node:process';

const bundle = await build({ stdin: { contents: "export * from './src/features/seller-signal/lead-utils.js'; export * from './mobile/src/features/seller-signal/selectors.js';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const leadApi = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('manual date moves a called seller to Scheduled and survives edits and reloads', () => {
  const today = new Date('2026-09-27T12:00:00');
  const row = { id: 12, name: 'Seller', status: 'Prospect', last_contact: '2026-09-27', next_follow_up_on: '2026-09-30', notes: 'Called', sent_at: null };
  const mapped = leadApi.mapStoredLeadRow(row, 0, today);
  assert.equal(mapped.isDue, false);
  assert.equal(mapped.dueLabel, 'In 3d');
  assert.equal(mapped.sentAt, null);
  assert.equal(leadApi.splitLeadsBySentStatus([mapped]).doneLeads.length, 1);
  const edited = leadApi.applyLeadStatus(mapped, 'Appraisal', today);
  assert.equal(edited.nextFollowUpOn, '2026-09-30');
  assert.equal(edited.notes, 'Called');
  assert.equal(leadApi.mapStoredLeadRow(row, 0, new Date('2026-09-30T12:00:00')).isDue, true);
  assert.equal(leadApi.mapStoredLeadRow({ ...row, status: 'Not Interested' }, 0, today).isDue, false);
});

test('call follow-up days use Dubai dates and handle month/year boundaries', () => {
  const now = new Date('2026-12-31T21:00:00Z');
  assert.equal(dubaiDateKey(now), '2027-01-01');
  assert.equal(followUpAfterDays('0', now), '2027-01-01');
  assert.equal(followUpAfterDays('7', now), '2027-01-08');
  for (const value of ['', -1, 1.5, 366, 'abc']) assert.throws(() => followUpAfterDays(value, now));
});

test('automatic sends wait until the chosen follow-up day, inclusive', () => {
  const lead = { next_follow_up_on: '2026-09-28' };
  assert.equal(followUpPending(lead, new Date('2026-09-27T19:59:00Z')), true);
  assert.equal(followUpPending(lead, new Date('2026-09-27T20:00:00Z')), false);
  assert.equal(followUpPending({}, new Date()), false);
});

test('custom attachments must belong to this account and this seller', () => {
  assert.equal(isSellerAttachment('a/seller-attachments/12/photo.jpg', 'a', 12), true);
  assert.equal(isSellerAttachment('b/seller-attachments/12/photo.jpg', 'a', 12), false);
  assert.equal(isSellerAttachment('a/seller-attachments/13/photo.jpg', 'a', 12), false);
  assert.equal(isSellerAttachment('a/business-card.jpg', 'a', 12), false);
  assert.equal(isSellerAttachment('a/seller-attachments/12/../photo.jpg', 'a', 12), false);
  assert.equal(introAttachmentPath('a/business-card.jpg', { sentAt: '2026-09-27' }), null);
});
