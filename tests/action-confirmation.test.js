import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createMcpConfirmation } from '../services/seller-signal-mcp/src/action-confirmation.js';
import { prepareAction } from '../services/seller-signal-mcp/src/action-preview.js';
import { isSessionOwner } from '../services/seller-signal-mcp/src/session-owner.js';
const require = createRequire(new URL('../services/seller-signal-mcp/package.json', import.meta.url));
const request = { userId: 'a', action: 'update_my_seller_lead', input: { leadId: '1', notes: 'Call tomorrow' } };

test('only explicit form acceptance approves; cancel, decline and unchecked do not', async () => {
  for (const [response, expected] of [
    [{ action: 'accept', content: { approve: true } }, true],
    [{ action: 'accept', content: { approve: false } }, false],
    [{ action: 'accept', content: { approve: 'true' } }, false],
    [{ action: 'decline' }, false], [{ action: 'cancel' }, false],
  ]) {
    let captured;
    const confirm = createMcpConfirmation({ getClientCapabilities: () => ({ elicitation: { form: {} } }), elicitInput: async (...args) => { captured = args; return response; } });
    assert.equal(await confirm(request, { requestId: 12 }), expected);
    assert.match(captured[0].message, /Call tomorrow/);
    assert.equal(captured[0].requestedSchema.properties.approve.default, false);
    assert.equal(captured[1].relatedRequestId, 12);
    assert.equal(captured[1].timeout, 120000);
  }
});
test('unsupported clients, timeout and cancellation fail closed', async () => {
  await assert.rejects(createMcpConfirmation({ getClientCapabilities: () => ({}) })(request), /cannot show/);
  const failing = { getClientCapabilities: () => ({ elicitation: { form: {} } }), elicitInput: async () => { throw Error('timeout'); } };
  await assert.rejects(createMcpConfirmation(failing)(request), /timeout/);
  const controller = new AbortController(); controller.abort();
  assert.equal(await createMcpConfirmation(failing)(request, { signal: controller.signal }), false);
});
test('WhatsApp preview pins account and recipient and does not write', async () => {
  const source = { leadId: '1', body: ' Hello ', sendSource: 'auto' };
  const result = await prepareAction('send_seller_signal_whatsapp_message', source, { extra: { userId: 'a' } }, {
    getLead: async auth => { assert.equal(auth.extra.userId, 'a'); return { name: 'Omar', phone: '0501234567' }; },
    normalizeWhatsAppPhone: () => '971501234567',
    listWhatsAppAccounts: async () => [{ id: 'account-a', connection_status: 'connected', display_phone_number: '+971555555555' }],
  });
  assert.equal(result.input.to, '971501234567');
  assert.equal(result.input.accountId, 'account-a');
  assert.equal(result.input.body, 'Hello');
  assert.equal(result.input.sendSource, 'mcp');
  assert.match(result.summary, /Omar/);
  assert.equal(source.to, undefined);
});
test('sessions cannot cross users or OAuth clients', () => {
  const session = { userId: 'a', clientId: 'client-a' };
  assert.equal(isSessionOwner(session, { extra: { userId: 'a' }, clientId: 'client-a' }), true);
  for (const auth of [undefined, { extra: { userId: 'b' }, clientId: 'client-a' }, { extra: { userId: 'a' }, clientId: 'client-b' }]) assert.equal(isSessionOwner(session, auth), false);
});
test('real SDK carries the confirmation form and response across a tool invocation', async () => {
  const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
  const { ElicitRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
  const server = new McpServer({ name: 'approval-test', version: '1' });
  const client = new Client({ name: 'test-host', version: '1' }, { capabilities: { elicitation: { form: {} } } });
  let forms = 0;
  client.setRequestHandler(ElicitRequestSchema, async req => {
    forms++;
    assert.match(req.params.message, /Call tomorrow/);
    return { action: 'accept', content: { approve: true } };
  });
  const confirm = createMcpConfirmation(server.server);
  server.registerTool('test_approval', { inputSchema: {} }, async (_, extra) => ({ content: [{ type: 'text', text: String(await confirm(request, extra)) }] }));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const result = await client.callTool({ name: 'test_approval', arguments: {} });
    assert.equal(result.content[0].text, 'true');
    assert.equal(forms, 1);
  } finally { await client.close(); await server.close(); }
});
