import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantLink, assistantTokens } from '../shared/assistant-markdown.js';

test('assistant replies preserve paragraphs, nested lists, emphasis, code and tables', () => {
  const tokens = assistantTokens('## Next steps\n\nStart with **Alex** and *confirm timing*.\n\n3. Call Alex\n   - Ask about price\n4. Log the reply\n\n| Seller | Status |\n| --- | --- |\n| Alex | Ready |\n\n```text\n<keep this literal>\n```');
  assert.deepEqual(tokens.filter(t => t.type !== 'space').map(t => t.type), ['heading', 'paragraph', 'list', 'table', 'code']);
  const list = tokens.find(t => t.type === 'list');
  assert.equal(list.start, 3);
  assert.ok(list.items[0].tokens.some(t => t.type === 'list'));
  assert.equal(tokens.find(t => t.type === 'table').rows[0][0].text, 'Alex');
  assert.equal(tokens.find(t => t.type === 'code').text, '<keep this literal>');
});

test('only web and email links can become interactive', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,test', 'file:///secret', 'intent://app', '//example.com', '/admin']) assert.equal(assistantLink(href), null);
  assert.equal(assistantLink('https://repeatai.org/sellers'), 'https://repeatai.org/sellers');
  assert.equal(assistantLink('mailto:demo@example.com'), 'mailto:demo@example.com');
});

test('unfinished markdown remains readable while response text arrives', () => {
  for (const text of ['**Still writing', '```js\nconst x = 1', '[Source](https://', '']) assert.doesNotThrow(() => assistantTokens(text));
  const html = assistantTokens('<script>alert(1)</script>');
  assert.equal(html[0].type, 'html'); // Renderers show this as React text, never HTML.
});
