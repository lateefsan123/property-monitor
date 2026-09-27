import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { PRIVATE_ASSISTANT_USER_ID } from '../shared/assistant-access.js';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

test('web launcher is absent for other accounts and present for the private account', async () => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error',
    plugins: [{ name: 'fixture-auth', enforce: 'pre',
      resolveId: id => /\/supabase(?:\.js)?$/.test(id) ? 'virtual:fixture-auth' : null,
      load: id => id === 'virtual:fixture-auth' ? 'export const supabase = { auth: { getSession: async () => ({ data: { session: null } }) } }; export const supabaseConfigError = null;' : null,
    }],
  });
  try {
    const { default: VoicePanel } = await vite.ssrLoadModule('/src/voice/VoicePanel.jsx');
    const render = userId => renderToStaticMarkup(React.createElement(QueryClientProvider, { client: new QueryClient() }, React.createElement(VoicePanel, { userId })));
    assert.equal(render('another-account'), '');
    assert.equal(render(undefined), '');
    assert.match(render(PRIVATE_ASSISTANT_USER_ID), /Open Repeat AI assistant/);
  } finally { await vite.close(); }
});
