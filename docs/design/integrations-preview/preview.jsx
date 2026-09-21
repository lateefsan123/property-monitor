import { createRoot } from 'react-dom/client';
import IntegrationConnectionsPanel from '../../../src/features/seller-signal/components/IntegrationConnectionsPanel.jsx';

const mode = new URLSearchParams(window.location.search).get('state') || 'ready';
let failed = false;
const connections = ['google', 'microsoft'].flatMap(provider => ['sheets', 'email', 'calendar'].map(feature => ({
  provider, feature, configured: mode !== 'setup', connected: mode === 'connected' && provider === 'google' && feature === 'sheets',
})));
async function request({ action, provider, feature }) {
  if (mode === 'error' && !failed) { failed = true; throw new Error('Connections are unavailable. Please try again.'); }
  if (action === 'status') return { connections };
  if (action === 'disconnect') {
    const row = connections.find(row => row.provider === provider && row.feature === feature);
    row.connected = false;
    return { status: 'disconnected' };
  }
  throw new Error('Preview only — no account is connected.');
}
createRoot(document.getElementById('root')).render(<main>
  <aside>Local UI test · sample connection states, no live accounts</aside>
  <nav><a href="?state=ready">Ready</a><a href="?state=setup">Setup needed</a><a href="?state=connected">Connected</a><a href="?state=error">Error</a></nav>
  <h1>Integrations</h1><IntegrationConnectionsPanel request={request} />
</main>);
