import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { integrationRequest } from './integration-client';
import IntegrationMail from './integration-mail';
import { connectIntegration } from './integration-connect';
import { Image } from 'expo-image';

const LOGOS = {
  'google-sheets': 'https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png',
  'google-email': 'https://www.gstatic.com/images/branding/product/2x/gmail_48dp.png',
  'google-calendar': 'https://www.gstatic.com/images/branding/product/2x/calendar_48dp.png',
  'microsoft-sheets': 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/svg/excel_48x1.svg',
  'microsoft-email': 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/svg/outlook_48x1.svg',
  'microsoft-calendar': 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/svg/outlook_48x1.svg',
};

const APPS = [
  ['google', 'sheets', 'Google Sheets', 'Choose spreadsheets and preview their rows.'],
  ['microsoft', 'sheets', 'Microsoft Excel', 'Browse OneDrive and open your worksheets.'],
  ['google', 'email', 'Gmail', 'Read your inbox and prepare seller follow-ups.'],
  ['microsoft', 'email', 'Outlook', 'Read your inbox and prepare seller follow-ups.'],
  ['google', 'calendar', 'Google Calendar', 'See upcoming meetings and viewings.'],
  ['microsoft', 'calendar', 'Outlook Calendar', 'See upcoming meetings and viewings.'],
];

function Workspace({ app, connection, colors, upgrade }) {
  const [provider, feature] = app;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [file, setFile] = useState(null);
  const [draft, setDraft] = useState(null);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function read(input = {}) {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError('');
    try {
      const result = await integrationRequest({ action: 'read', provider, feature, input }, current.signal);
      // Keep pagination bound to the search that produced these results, not
      // text the user may have edited without submitting another search.
      if (!current.signal.aborted) setData({ ...result, browseQuery: input.query || '' });
    } catch (error) { if (!current.signal.aborted) setError(error.message); }
    finally { if (!current.signal.aborted) setBusy(false); }
  }
  const label = { color: colors.text, fontSize: 14, lineHeight: 21 };
  const browseAllowed = provider !== 'google' || feature !== 'sheets' || connection.canBrowse;
  return <View style={{ gap: 12 }}>
    {feature === 'email' && connection.canSend ? <Button colors={colors} disabled={busy || Boolean(draft)} onPress={() => setDraft({})}>New email</Button> : null}
    {draft ? <IntegrationMail key={draft.replyToId || 'new'} provider={provider} replyToId={draft.replyToId} colors={colors} onClose={() => setDraft(null)} /> : null}
    {error ? <Text selectable accessibilityRole="alert" style={label}>{error}</Text> : null}
    {!browseAllowed ? <><Text style={label}>Allow file-name access once to choose your spreadsheets. No editing or deleting files.</Text><Button colors={colors} disabled={busy} onPress={() => upgrade('browse')}>Choose from Google Drive</Button></> : <>
      {feature === 'sheets' && provider === 'google' ? <TextInput accessibilityLabel="Search spreadsheets" placeholder="Search spreadsheets" placeholderTextColor={colors.textMuted} value={search} maxLength={100} onChangeText={setSearch} style={{ ...label, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12 }} /> : null}
      <Button colors={colors} disabled={busy} onPress={() => { setFile(null); read(provider === 'google' && feature === 'sheets' ? { query: search } : {}); }}>{feature === 'sheets' ? 'Choose spreadsheet' : feature === 'email' ? 'Load inbox' : 'Show upcoming events'}</Button>
    </>}
    {busy ? <Text accessibilityLiveRegion="polite" style={label}>Loading…</Text> : null}
    {feature === 'email' && !connection.canSend ? <Button colors={colors} disabled={busy} onPress={() => upgrade('send')}>Enable sending</Button> : null}
    {provider === 'microsoft' && feature === 'sheets' && !connection.canReadWorkbook ? <><Text style={label}>Microsoft requires read/write file permission to read workbook cells. Repeat AI only reads them.</Text><Button colors={colors} disabled={busy} onPress={() => upgrade('workbook')}>Enable workbook reading</Button></> : null}
    {data?.kind === 'file-list' ? data.items.map(item => <Button key={item.id} colors={colors} disabled={busy || (!item.folder && (!item.spreadsheet || (provider === 'microsoft' && !connection.canReadWorkbook)))} onPress={() => {
      if (item.folder) read({ folderId: item.id });
      else { setFile(item); read(provider === 'google' ? { spreadsheetId: item.id, tabs: true } : { fileId: item.id }); }
    }}>{item.name}</Button>) : null}
    {data?.nextPageToken ? <Button colors={colors} disabled={busy} onPress={() => read({ query: data.browseQuery, pageToken: data.nextPageToken })}>Next spreadsheets</Button> : null}
    {data?.kind === 'worksheet-list' ? data.items.map(item => <Button key={item.name} colors={colors} disabled={busy} onPress={() => read({ [provider === 'google' ? 'spreadsheetId' : 'fileId']: file.id, sheetName: item.name })}>{item.name}</Button>) : null}
    {data?.kind === 'sheet-preview' ? <>
      <Text selectable style={label}>{file?.name} · {data.range}</Text>
      <ScrollView horizontal><View>{data.rows.map((row, index) => <View key={index} style={{ flexDirection: 'row' }}>{row.map((cell, column) => <Text selectable key={column} style={{ ...label, width: 150, borderWidth: .5, borderColor: colors.border, padding: 8 }}>{cell}</Text>)}</View>)}</View></ScrollView>
    </> : null}
    {data?.kind === 'email' ? data.items.map(item => <View key={item.id} style={{ gap: 4, paddingVertical: 12, borderBottomWidth: .5, borderColor: colors.border }}><Text selectable style={{ ...label, fontWeight: '600' }}>{item.subject}</Text><Text selectable style={label}>{item.from}</Text><Text selectable style={label}>{item.snippet}</Text>{connection.canSend ? <Button colors={colors} disabled={busy || Boolean(draft)} onPress={() => setDraft({ replyToId: item.id })}>Reply</Button> : null}</View>) : null}
    {data?.kind === 'calendar' ? data.items.map(item => <View key={item.id}><Text selectable style={{ ...label, fontWeight: '600' }}>{item.title}</Text><Text selectable style={label}>{item.start} · {item.location}</Text></View>) : null}
    {data?.items?.length === 0 ? <Text style={label}>No items found.</Text> : null}
  </View>;
}

export default function Integrations({ userId, colors }) {
  const [connections, setConnections] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function change(provider, feature, capability, disconnect = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (disconnect) await integrationRequest({ action: 'disconnect', provider, feature });
      else await connectIntegration(provider, feature, capability);
      setOpen(''); setAttempt(value => value + 1);
    } catch (error) { setError(error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    integrationRequest({ action: 'status' }, controller.signal).then(result => {
      if (!controller.signal.aborted) setConnections(result.connections);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [userId, attempt]);
  return <View style={{ gap: 14 }}>
    <Text style={{ color: colors.textMuted }}>Your tools, connected to Repeat AI.</Text>
    {error ? <><Text selectable accessibilityRole="alert" style={{ color: colors.text }}>{error}</Text><Button colors={colors} onPress={() => { setError(''); setConnections(null); setOpen(''); setAttempt(value => value + 1); }}>Try again</Button></> : !connections ? <Text style={{ color: colors.text }}>Loading connections…</Text> : null}
    {connections ? APPS.map(app => {
      const [provider, feature, title, description] = app;
      const id = `${provider}-${feature}`;
      const connection = connections.find(item => item.provider === provider && item.feature === feature);
      return <View key={id} style={{ padding: 16, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Image source={LOGOS[id]} contentFit="contain" style={{ width: 36, height: 36, backgroundColor: '#fff', borderRadius: 8 }} /><Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>{title}</Text>{connection?.connected ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>Connected</Text> : null}</View>
        <Text style={{ color: colors.textMuted, lineHeight: 20 }}>{description}</Text>
        {connection?.connected ? <><Button colors={colors} disabled={busy} onPress={() => setOpen(open === id ? '' : id)}>{open === id ? 'Close' : 'Open'}</Button>{open === id ? <>
          <Workspace key={`${userId}-${id}`} app={app} connection={connection} colors={colors} upgrade={capability => change(provider, feature, capability)} />
          <Button colors={colors} disabled={busy} onPress={() => Alert.alert(`Disconnect ${title}?`, 'Your files and emails stay untouched. You can revoke access separately in your provider account.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => change(provider, feature, undefined, true) }])}>Disconnect</Button>
        </> : null}</> : <Button colors={colors} disabled={busy || !connection?.configured} onPress={() => change(provider, feature)}>{connection?.configured ? 'Connect' : 'Setup needed'}</Button>}
      </View>;
    }) : null}
  </View>;
}
