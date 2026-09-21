import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { integrationRequest } from './integration-client';

const APPS = [
  ['google', 'sheets', 'Google Sheets', 'Choose spreadsheets and preview their rows.'],
  ['microsoft', 'sheets', 'Microsoft Excel', 'Browse OneDrive and open your worksheets.'],
  ['google', 'email', 'Gmail', 'Read your inbox and prepare seller follow-ups.'],
  ['microsoft', 'email', 'Outlook', 'Read your inbox and prepare seller follow-ups.'],
  ['google', 'calendar', 'Google Calendar', 'See upcoming meetings and viewings.'],
  ['microsoft', 'calendar', 'Outlook Calendar', 'See upcoming meetings and viewings.'],
];

function Workspace({ app, connection, colors }) {
  const [provider, feature] = app;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [file, setFile] = useState(null);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function read(input = {}) {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError('');
    try {
      const result = await integrationRequest({ action: 'read', provider, feature, input }, current.signal);
      if (!current.signal.aborted) setData(result);
    } catch (error) { if (!current.signal.aborted) setError(error.message); }
    finally { if (!current.signal.aborted) setBusy(false); }
  }
  const label = { color: colors.text, fontSize: 14, lineHeight: 21 };
  const browseAllowed = provider !== 'google' || feature !== 'sheets' || connection.canBrowse;
  return <View style={{ gap: 12 }}>
    {error ? <Text selectable accessibilityRole="alert" style={label}>{error}</Text> : null}
    {!browseAllowed ? <Text style={label}>Approve file-name access in Repeat AI on the web once to browse Google Sheets here.</Text> : <>
      {feature === 'sheets' && provider === 'google' ? <TextInput accessibilityLabel="Search spreadsheets" placeholder="Search spreadsheets" placeholderTextColor={colors.textMuted} value={search} maxLength={100} onChangeText={setSearch} style={{ ...label, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12 }} /> : null}
      <Button colors={colors} disabled={busy} onPress={() => { setFile(null); read(provider === 'google' && feature === 'sheets' ? { query: search } : {}); }}>{feature === 'sheets' ? 'Choose spreadsheet' : feature === 'email' ? 'Load inbox' : 'Show upcoming events'}</Button>
    </>}
    {busy ? <Text accessibilityLiveRegion="polite" style={label}>Loading…</Text> : null}
    {data?.kind === 'file-list' ? data.items.map(item => <Button key={item.id} colors={colors} disabled={busy || (!item.folder && !item.spreadsheet)} onPress={() => {
      if (item.folder) read({ folderId: item.id });
      else { setFile(item); read(provider === 'google' ? { spreadsheetId: item.id, tabs: true } : { fileId: item.id }); }
    }}>{item.name}</Button>) : null}
    {data?.nextPageToken ? <Button colors={colors} disabled={busy} onPress={() => read({ query: search, pageToken: data.nextPageToken })}>Next spreadsheets</Button> : null}
    {data?.kind === 'worksheet-list' ? data.items.map(item => <Button key={item.name} colors={colors} disabled={busy} onPress={() => read({ [provider === 'google' ? 'spreadsheetId' : 'fileId']: file.id, sheetName: item.name })}>{item.name}</Button>) : null}
    {data?.kind === 'sheet-preview' ? <>
      <Text selectable style={label}>{file?.name} · {data.range}</Text>
      <ScrollView horizontal><View>{data.rows.map((row, index) => <View key={index} style={{ flexDirection: 'row' }}>{row.map((cell, column) => <Text selectable key={column} style={{ ...label, width: 150, borderWidth: .5, borderColor: colors.border, padding: 8 }}>{cell}</Text>)}</View>)}</View></ScrollView>
    </> : null}
    {data?.kind === 'email' ? data.items.map(item => <View key={item.id} style={{ gap: 4, paddingVertical: 12, borderBottomWidth: .5, borderColor: colors.border }}><Text selectable style={{ ...label, fontWeight: '600' }}>{item.subject}</Text><Text selectable style={label}>{item.from}</Text><Text selectable style={label}>{item.snippet}</Text></View>) : null}
    {data?.kind === 'calendar' ? data.items.map(item => <View key={item.id}><Text selectable style={{ ...label, fontWeight: '600' }}>{item.title}</Text><Text selectable style={label}>{item.start} · {item.location}</Text></View>) : null}
    {data?.items?.length === 0 ? <Text style={label}>No items found.</Text> : null}
  </View>;
}

export default function Integrations({ userId, colors }) {
  const [connections, setConnections] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [attempt, setAttempt] = useState(0);
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
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.textMuted, lineHeight: 20 }}>{description}</Text>
        {connection?.connected ? <><Button colors={colors} onPress={() => setOpen(open === id ? '' : id)}>{open === id ? 'Close' : 'Open'}</Button>{open === id ? <Workspace key={`${userId}-${id}`} app={app} connection={connection} colors={colors} /> : null}</> : <Text style={{ color: colors.textMuted }}>Not connected</Text>}
      </View>;
    }) : null}
  </View>;
}
