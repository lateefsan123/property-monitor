import { createRoot } from 'react-dom/client';
import IntegrationConnectionsPanel from '../../../src/features/seller-signal/components/IntegrationConnectionsPanel.jsx';

const mode = new URLSearchParams(window.location.search).get('state') || 'ready';
let failed = false;
const connections = ['google', 'microsoft'].flatMap(provider => ['sheets', 'email', 'calendar'].map(feature => ({
  provider, feature, configured: mode !== 'setup', connected: mode === 'tools' || (mode === 'connected' && provider === 'google' && feature === 'sheets'), canSend: mode === 'tools' && feature === 'email', canReadWorkbook: mode === 'tools' && feature === 'sheets',
})));
async function request({ action, provider, feature, input }) {
  if (mode === 'error' && !failed) { failed = true; throw new Error('Connections are unavailable. Please try again.'); }
  if (action === 'status') return { connections };
  if (mode === 'tools' && action === 'read') {
    if (feature === 'email') return { kind: 'email', items: [{ id: 'sample', subject: 'Viewing tomorrow', from: 'broker@example.com', snippet: 'Can we arrange a viewing tomorrow afternoon?' }] };
    if (provider === 'microsoft' && !input.fileId) return { kind: 'file-list', items: [{ id: 'sample', name: 'Sellers.xlsx', spreadsheet: true }] };
    if (provider === 'microsoft' && !input.sheetName) return { kind: 'worksheet-list', items: [{ name: 'Sellers' }] };
    return { kind: 'sheet-preview', range: 'Sellers!A1:Z100', rows: [['Name', 'Building'], ['Omar', 'Marina Gate'], ['Aisha', 'Forte']] };
  }
  if (mode === 'tools' && action === 'prepare_email') return { confirmation: 'sample-only', preview: { to: 'broker@example.com', subject: 'Re: Viewing tomorrow', ...input }, expiresAt: Date.now() + 300000 };
  if (mode === 'tools' && action === 'confirm_email') return { status: 'accepted' };
  if (action === 'disconnect') {
    const row = connections.find(row => row.provider === provider && row.feature === feature);
    row.connected = false;
    return { status: 'disconnected' };
  }
  throw new Error('Preview only — no account is connected.');
}
createRoot(document.getElementById('root')).render(<main>
  <aside>Local UI test · sample connection states, no live accounts</aside>
  <nav><a href="?state=ready">Ready</a><a href="?state=setup">Setup needed</a><a href="?state=connected">Connected</a><a href="?state=tools">Tools</a><a href="?state=error">Error</a></nav>
  <h1>Integrations</h1><IntegrationConnectionsPanel request={request} />
</main>);
