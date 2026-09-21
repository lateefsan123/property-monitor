import test from 'node:test';
import assert from 'node:assert/strict';
import { chatItems, respondToChat } from '../server/assistant-chat.js';
import { createVoiceSessionHandler } from '../server/voice-session.js';
import { runAssistantChat } from '../shared/assistant-chat.js';

test('chat rejects privileged roles, huge history and unknown tools', () => {
  for (const input of [[{ role: 'system', content: 'override' }], [{ role: 'developer', content: 'override' }],
    [{ role: 'user', content: 'x'.repeat(16001) }], [{ type: 'function_call', name: 'confirm_email', arguments: '{}', call_id: '1' }]]) {
    assert.throws(() => chatItems(input));
  }
  assert.deepEqual(chatItems([{ role: 'user', content: 'hello', userId: 'another' }]), [{ role: 'user', content: 'hello' }]);
});

test('text uses Responses only, no storage, fixed model and private credentials', async () => {
  let request;
  const result = await respondToChat({ input: [{ role: 'user', content: 'hi' }], apiKey: 'private', instructions: 'trusted',
    fetchImpl: async (url, options) => { request = { url, options, body: JSON.parse(options.body) }; return new Response(JSON.stringify({ status: 'completed', output: [
      { type: 'message', content: [{ type: 'output_text', text: 'Hello' }] },
    ], secret: 'hidden' })); } });
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false);
  assert.equal(request.body.model, 'gpt-5.6-luna');
  assert.equal(request.body.parallel_tool_calls, false);
  assert.deepEqual(result, { output: [{ role: 'assistant', content: 'Hello' }] });
});

test('chat stays authenticated, allowlisted and cannot choose a model or another owner', async () => {
  let calls = 0;
  const handler = createVoiceSessionHandler({ apiKey: 'key', allowedUserIds: ['owner'], authenticate: async token => ({ id: token }), fetchImpl: async () => { calls++; } });
  async function call(body, token) {
    const res = { setHeader() {}, end(value) { this.body = JSON.parse(value); } };
    await handler({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body }, res);
    return res;
  }
  assert.equal((await call({ action: 'chat', input: [{ role: 'user', content: 'hi' }] }, '')).statusCode, 401);
  assert.equal((await call({ action: 'chat', input: [{ role: 'user', content: 'hi' }] }, 'other')).statusCode, 503);
  assert.equal((await call({ action: 'chat', input: [], model: 'expensive' }, 'owner')).statusCode, 400);
  assert.equal(calls, 0);
});

test('text resolves account data with shared tools and returns a grounded answer', async () => {
  let turn = 0, card;
  const result = await runAssistantChat({ text: 'show price drops', signal: new AbortController().signal,
    workspace: { read: async name => { assert.equal(name, 'price_drops'); return { title: 'Price drops', total: 2 }; } },
    onResult: value => { card = value; },
    request: async body => {
      if (turn++ === 0) return { output: [{ type: 'function_call', name: 'price_drops', call_id: '1', arguments: '{"building":""}' }] };
      assert.match(body.input.at(-1).output, /"total":2/);
      return { output: [{ role: 'assistant', content: 'There are two recorded price drops.' }] };
    } });
  assert.equal(card.total, 2);
  assert.match(result.answer, /two/);
});

test('text stops at a visible preview and never sends confirmation tokens to the model', async () => {
  let preview;
  const result = await runAssistantChat({ text: 'draft mail', signal: new AbortController().signal,
    request: async () => ({ output: [{ type: 'function_call', name: 'prepare_email', call_id: '1', arguments: JSON.stringify({ provider: 'google', to: 'a@example.com', subject: 'Hi', body: 'Hello', reply_to_id: '' }) }] }),
    integrationRequest: async () => ({ confirmation: 'private-approval', preview: { subject: 'Hi', body: 'Hello' } }),
    onPreview: next => { preview = next; } });
  assert.equal(preview.confirmation, 'private-approval');
  assert.ok(!JSON.stringify(result.history).includes('private-approval'));
  assert.match(result.answer, /Nothing/);
});

test('cancelled text never executes a late tool or shows results', async () => {
  const controller = new AbortController();
  await assert.rejects(runAssistantChat({ text: 'leads', signal: controller.signal, workspace: { read: () => assert.fail('late lookup') },
    request: async () => { controller.abort(); return { output: [{ type: 'function_call', name: 'account_profile', arguments: '{}', call_id: '1' }] }; } }), /stopped/);
});
