import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTemplateBrief, validateTemplateDraft, generateTemplateDraft } from '../supabase/functions/_shared/template-draft.js';

test('template action rejects history, model overrides, owner injection and unbounded input', () => {
  assert.equal(validateTemplateBrief({ brief: ' Friendly update ' }), 'Friendly update');
  for (const body of [null, [], {}, { brief: 'hi' }, { brief: 'x'.repeat(601) }, { brief: 'Friendly update', userId: 'other' },
    { brief: 'Friendly update', model: 'other' }, { brief: 'Friendly update', messages: [] }]) assert.throws(() => validateTemplateBrief(body));
});
test('drafts require usable transaction placeholders and reject malformed provider output', () => {
  const good = { name: 'Update', content: 'Hi {{name}}, recent sales in {{building}}:\n{{transactions}}' };
  assert.deepEqual(validateTemplateDraft(good), good);
  for (const draft of [{}, { name: 'Test', content: 'No transactions' }, { name: 'Test', content: '{{transactions}} {{transactions}}' }, { name: 'Test', content: '{{transactions}} {{unknown}}' },
    { name: 'x'.repeat(81), content: '{{transactions}}' }, { name: 'Test', content: '{{transactions}}' + 'x'.repeat(2401) }]) assert.throws(() => validateTemplateDraft(draft));
});
test('template generation is one bounded mini request without tools, history or storage', async () => {
  let calls = 0;
  const draft = await generateTemplateDraft('Friendly sales update', 'fixture', async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini'); assert.equal(body.store, false); assert.equal(body.max_tokens, 600);
    assert.equal(body.tools, undefined); assert.equal(body.messages.length, 2);
    assert.equal(body.response_format.json_schema.strict, true);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ name: 'Update', content: 'Hi {{name}}\n{{transactions}}' }) } }] }) };
  });
  assert.equal(calls, 1); assert.ok(draft.content.includes('{{transactions}}'));
  await assert.rejects(generateTemplateDraft('Friendly update', 'fixture', async () => ({ ok: false, status: 429 })));
  await assert.rejects(generateTemplateDraft('Friendly update', 'fixture', async () => ({ ok: true, json: async () => ({ choices: [{ message: { refusal: 'No' } }] }) })));
});
