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
    // The launcher waits for the saved "show Ask Repeat" preference; seed it as on.
    const client = new QueryClient();
    client.setQueryData(['workspace-preference', PRIVATE_ASSISTANT_USER_ID, 'ask-repeat-visible'], true);
    const render = userId => renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(VoicePanel, { userId })));
    assert.equal(render('another-account'), '');
    assert.equal(render(undefined), '');
    const launcher = render(PRIVATE_ASSISTANT_USER_ID);
    assert.match(launcher, /Open Repeat AI assistant/);
    assert.match(launcher, /class="repeat-fox is-idle"/);
  } finally { await vite.close(); }
});
