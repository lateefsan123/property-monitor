import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationStatusOptions } from '../../../integration-query';
import { integrationRequest } from '../../../integration-client';
import '../../../styles/integration-connections.css';
import IntegrationWorkspace from './IntegrationWorkspace';

const ITEMS = [
  ['google', 'sheets', 'Google Sheets', 'Open a spreadsheet and search its rows without leaving Repeat AI.', 'https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png'],
  ['microsoft', 'sheets', 'Microsoft Excel', 'Browse OneDrive and read the worksheets in your Excel files.', 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/svg/excel_48x1.svg'],
  ['google', 'email', 'Gmail', 'Read your inbox, write emails and reply. You confirm every send.', 'https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png'],
  ['microsoft', 'email', 'Outlook', 'Read your inbox, write emails and reply. You confirm every send.', 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/svg/outlook_48x1.svg'],
  ['google', 'calendar', 'Google Calendar', 'Connect read-only access to your upcoming events. No events are changed.', 'https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png'],
  ['microsoft', 'calendar', 'Outlook Calendar', 'Connect read-only access to your upcoming events. No events are changed.', 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/svg/outlook_48x1.svg'],
];

export default function IntegrationConnectionsPanel({ userId, request = integrationRequest }) {
  const cache = useQueryClient();
  const options = integrationStatusOptions(userId, request);
  const status = useQuery(options);
  const connections = status.data;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmId, setConfirmId] = useState('');
  const [openId, setOpenId] = useState('');
  async function change(provider, feature, connected, capability) {
    setBusy(`${provider}-${feature}`);
    setError('');
    try {
      const result = await request({ action: connected ? 'disconnect' : 'begin', provider, feature, ...(capability ? { capability } : {}) });
      if (connected) {
        await cache.cancelQueries({ queryKey: options.queryKey });
        cache.setQueryData(options.queryKey, current => current?.map(item => item.provider === provider && item.feature === feature ? { ...item, connected: false } : item));
        void cache.invalidateQueries({ queryKey: options.queryKey });
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
    <p className="integration-intro">Your everyday tools, all in one place.</p>
    {(error || status.error) && <div className="integration-error" role="alert">{error || status.error.message} <button type="button" onClick={() => { setError(''); void status.refetch(); }}>Try again</button></div>}
    <div className="integration-list" aria-busy={status.isPending}>{ITEMS.map(([provider, feature, name, description, logo]) => {
      const connection = connections?.find(item => item.provider === provider && item.feature === feature);
      const id = `${provider}-${feature}`;
      const expanded = openId === id;
      return <article key={id} className={`integration-card${expanded ? ' is-open' : ''}`}><div className="integration-row">
        <span className="integration-mark" aria-hidden="true"><img src={logo} alt="" width="32" height="32" referrerPolicy="no-referrer" /></span>
        <div className="integration-copy"><strong>{name}</strong></div>
        {connection?.connected && <span className="integration-status">Connected</span>}
        <p className="integration-description">{description}</p>
        <button type="button" aria-label={`${connection?.connected ? expanded ? 'Close' : 'Open' : 'Connect'} ${name}`}
          aria-expanded={connection?.connected ? expanded : undefined} aria-controls={connection?.connected ? `integration-${id}` : undefined}
          disabled={Boolean(busy) || (!connection?.configured && !connection?.connected)}
          onClick={() => { setConfirmId(''); if (connection?.connected) setOpenId(expanded ? '' : id); else change(provider, feature, false); }}>
          {!connections ? status.error ? 'Unavailable' : 'Checking…' : busy === id ? 'Connecting…' : connection?.connected ? expanded ? 'Close' : 'Open' : connection?.configured ? 'Connect' : 'Setup needed'}
        </button>
      </div>{expanded && connection?.connected && <div className="integration-detail" id={`integration-${id}`}>
        <p className="integration-access">{connection.canSend ? 'Reading and sending enabled. Every send needs your confirmation.' : 'Read-only access. Your files and events stay unchanged.'}</p>
        <IntegrationWorkspace key={id} provider={provider} feature={feature} connection={connection} request={request} upgrade={capability => change(provider, feature, false, capability)} />
        <button className="integration-disconnect" type="button" disabled={Boolean(busy)} onClick={() => setConfirmId(id)}>Disconnect {name}</button>
        {confirmId === id && <div className="integration-confirm" role="group" aria-label={`Disconnect ${name}`}>
        <p>Disconnect {name} from Repeat AI? Your files and account stay untouched. To revoke permission too, remove Repeat AI in your {provider === 'google' ? 'Google' : 'Microsoft'} account settings.</p>
        <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmId('')}>Keep connected</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => change(provider, feature, true)}>Confirm disconnect</button>
      </div>}</div>}</article>;
    })}</div>
    <p className="integration-note">Nothing is sent or changed automatically. WhatsApp is managed in its own tab.</p>
  </section>;
}
