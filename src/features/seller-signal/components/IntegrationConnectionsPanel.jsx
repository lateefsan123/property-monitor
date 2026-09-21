import { useEffect, useState } from 'react';
import { integrationRequest } from '../../../integration-client';
import '../../../styles/integration-connections.css';
import IntegrationWorkspace from './IntegrationWorkspace';

const ITEMS = [
  ['google', 'sheets', 'Google Sheets', 'Read your spreadsheets', 'G'],
  ['microsoft', 'sheets', 'Microsoft Excel', 'Read workbooks in OneDrive', 'X'],
  ['google', 'email', 'Gmail', 'Read your emails', 'G'],
  ['microsoft', 'email', 'Outlook', 'Read your emails', 'O'],
  ['google', 'calendar', 'Google Calendar', 'Read your upcoming events', 'G'],
  ['microsoft', 'calendar', 'Outlook Calendar', 'Read your upcoming events', 'O'],
];

export default function IntegrationConnectionsPanel({ request = integrationRequest }) {
  const [connections, setConnections] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [confirmId, setConfirmId] = useState('');
  const [openId, setOpenId] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    request({ action: 'status' }, controller.signal).then(result => {
      if (!controller.signal.aborted) { setConnections(result.connections); setError(''); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [request, attempt]);
  async function change(provider, feature, connected, capability) {
    setBusy(`${provider}-${feature}`);
    setError('');
    try {
      const result = await request({ action: connected ? 'disconnect' : 'begin', provider, feature, ...(capability ? { capability } : {}) });
      if (connected) {
        setConnections(current => current.map(item => item.provider === provider && item.feature === feature ? { ...item, connected: false } : item));
        setConfirmId('');
        setOpenId('');
      } else {
        const url = new URL(result.authorizationUrl);
        const host = provider === 'google' ? 'accounts.google.com' : 'login.microsoftonline.com';
        if (url.protocol !== 'https:' || url.hostname !== host) throw new Error('Invalid connection destination.');
        window.location.assign(url.href);
      }
    } catch (error) { setError(error.message); }
    finally { setBusy(''); }
  }
  return <section className="integration-connections" aria-label="App connections">
    <p className="integration-intro">Your tools, connected to Repeat AI.</p>
    {error && <div className="integration-error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {!connections && !error && <p role="status">Loading connections…</p>}
    {connections && <div className="integration-list">{ITEMS.map(([provider, feature, name, description, letter]) => {
      const connection = connections.find(item => item.provider === provider && item.feature === feature);
      const id = `${provider}-${feature}`;
      return <div key={id}><div className="integration-row">
        <span className="integration-mark" data-feature={feature} aria-hidden="true">{letter}</span>
        <div className="integration-copy"><strong>{name}</strong><span>{connection?.connected ? connection.canSend ? 'Connected · sending enabled' : 'Connected · read-only' : description}</span></div>
        {connection?.connected && feature !== 'calendar' && <button disabled={Boolean(busy)} onClick={() => setOpenId(openId === id ? '' : id)} aria-expanded={openId === id}>{openId === id ? 'Close' : 'Open'}</button>}
        <button type="button" aria-label={`${connection?.connected ? 'Disconnect' : 'Connect'} ${name}`}
          disabled={Boolean(busy) || (!connection?.configured && !connection?.connected)}
          onClick={() => connection?.connected ? setConfirmId(id) : change(provider, feature, false)}>
          {busy === id ? 'Please wait…' : connection?.connected ? 'Disconnect' : connection?.configured ? 'Connect' : 'Setup needed'}
        </button>
      </div>{openId === id && connection?.connected && <IntegrationWorkspace key={id} provider={provider} feature={feature} connection={connection} request={request} upgrade={capability => change(provider, feature, false, capability)} />}{confirmId === id && <div className="integration-confirm" role="group" aria-label={`Disconnect ${name}`}>
        <p>Disconnect {name} from Repeat AI? Your files and account stay untouched. To revoke permission too, remove Repeat AI in your {provider === 'google' ? 'Google' : 'Microsoft'} account settings.</p>
        <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmId('')}>Keep connected</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => change(provider, feature, true)}>Confirm disconnect</button>
      </div>}</div>;
    })}</div>}
    <p className="integration-note">Nothing is sent or changed automatically. WhatsApp is managed in its own tab.</p>
  </section>;
}
