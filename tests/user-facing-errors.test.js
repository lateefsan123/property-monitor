import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { userFacingError } from '../shared/user-facing-errors.js';

test('error rendering never trusts arbitrary message, detail, or userMessage fields', () => {
  for (const payload of [
    { message: 'SQL private details', details: 'private stack' },
    { userMessage: 'pretend safe', message: 'private details' },
    { name: 'UserFacingError', message: 'pretend trusted' },
    { message: JSON.stringify({ token: 'private-token', error: 'private details' }) },
  ]) assert.equal(userFacingError(payload), 'Something went wrong. Please try again.');
  assert.match(userFacingError({ code: 'invalid_credentials' }), /email or password/);
  assert.match(userFacingError({ code: 'reconnect' }), /reconnect/);
});

test('web components cannot render exception.message directly', async () => {
  async function scan(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) await scan(path);
      else if (entry.name.endsWith('.jsx')) {
        const source = await readFile(path, 'utf8');
        assert.doesNotMatch(source, /\{(?:\w+\.)*(?:error|failure|loadError|connectionError)\??\.message(?:\s*\|\|[^}]*)?\}/, path.pathname);
        assert.doesNotMatch(source, /set\w*Error\(\w+\??\.message/, path.pathname);
      }
    }
  }
  await scan(new URL('../src/', import.meta.url));
});
