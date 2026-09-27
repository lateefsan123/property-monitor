import ContentSkeleton from "../components/ContentSkeleton";
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from './ui';
import { integrationRequest } from './integration-client';
import IntegrationMail from './integration-mail';
import { connectIntegration } from './integration-connect';
import { Image } from 'expo-image';
import AppIcon from '../components/AppIcon';
import BottomSheet from '../components/BottomSheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationStatusOptions } from '../../../src/integration-query';

const LOGOS = {
  'google-sheets': 'https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png',
  'google-email': 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
  'google-calendar': 'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png',
  'microsoft-sheets': 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/excel_48x1.png',
  'microsoft-email': 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png',
  'microsoft-calendar': 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/outlook_48x1.png',
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

export function IntegrationList({ connections, colors, busy = false, pendingId = '', onOpen, onConnect }) {
  const apps = APPS.map(app => ({ app, connection: connections.find(item => item.provider === app[0] && item.feature === app[1]) }));
  const groups = [
    ['Connected', apps.filter(item => item.connection?.connected)],
    ['Not connected', apps.filter(item => !item.connection?.connected)],
  ];
  return <View style={{ gap: 24 }}>
    {groups.filter(([, items]) => items.length).map(([title, items]) => <View key={title} style={{ gap: 9 }}>
      <Text accessibilityRole="header" style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>{title}</Text>
      <View>
        {items.map(({ app, connection }, index) => {
          const [provider, feature, name] = app;
          const id = `${provider}-${feature}`;
          const connected = Boolean(connection?.connected);
          const disabled = busy || (!connected && !connection?.configured);
          const pending = pendingId === id;
          return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${name}, ${connected ? 'connected, open' : connection?.configured ? 'connect' : 'setup needed'}`} accessibilityState={{ disabled, busy: pending }} disabled={disabled}
            onPress={() => connected ? onOpen(id) : onConnect(provider, feature)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, gap: 12, opacity: pressed || busy ? 0.55 : 1 })}>
            <Image source={LOGOS[id]} contentFit="contain" accessible={false} style={{ width: 25, height: 25 }} />
            <View style={{ flex: 1, minHeight: 60, paddingVertical: 12, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: index === items.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21, flex: 1 }}>{name}</Text>
              {pending ? <ActivityIndicator size="small" color={colors.textMuted} /> : connected ? <AppIcon name="chevron" size={18} color={colors.textFaint} /> : <Text style={{ color: connection?.configured ? colors.textMuted : colors.textFaint, fontSize: 13 }}>{connection?.configured ? 'Connect' : 'Setup needed'}</Text>}
            </View>
          </Pressable>;
        })}
      </View>
    </View>)}
  </View>;
}

export default function Integrations({ userId, colors }) {
  const cache = useQueryClient();
  const status = useQuery(integrationStatusOptions(userId, integrationRequest));
  const connections = status.data;
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const lock = useRef(false);
  async function change(provider, feature, capability, disconnect = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setPendingId(`${provider}-${feature}`); setError('');
    try {
      if (disconnect) await integrationRequest({ action: 'disconnect', provider, feature }, undefined, userId);
      else await connectIntegration(provider, feature, capability);
      setOpen('');
      const queryKey = integrationStatusOptions(userId, integrationRequest).queryKey;
      await cache.cancelQueries({ queryKey, exact: true });
      if (disconnect) cache.setQueryData(queryKey, previous => previous?.map(item =>
        item.provider === provider && item.feature === feature ? { ...item, connected: false } : item));
      await cache.invalidateQueries({ queryKey, exact: true });
    } catch (error) { setError(error.message); }
    finally { lock.current = false; setBusy(false); setPendingId(''); }
  }
  const selectedApp = APPS.find(app => `${app[0]}-${app[1]}` === open);
  const selectedConnection = selectedApp && connections?.find(item => item.provider === selectedApp[0] && item.feature === selectedApp[1]);
  const message = error || status.error?.message;
  const feedback = message ? <View style={{ gap: 10 }}>
    <Text selectable accessibilityRole="alert" style={{ color: colors.errorText, fontSize: 14, lineHeight: 20 }}>{message}</Text>
    <Button colors={colors} disabled={busy || status.isFetching} onPress={() => { setError(''); void status.refetch(); }}>Try again</Button>
  </View> : null;
  return <View style={{ paddingTop: 8, gap: 22 }}>
    {!selectedApp && feedback}
    {!connections && status.isFetching ? <ContentSkeleton colors={colors} rows={4} label="Loading connections" /> : null}
    {connections ? <IntegrationList connections={connections} colors={colors} busy={busy} pendingId={pendingId} onOpen={setOpen} onConnect={(provider, feature) => change(provider, feature)} /> : null}
    <BottomSheet visible={Boolean(selectedApp && selectedConnection?.connected)} onClose={() => setOpen('')} colors={colors}>
      {selectedApp && selectedConnection?.connected ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={LOGOS[open]} contentFit="contain" style={{ width: 36, height: 36 }} />
          <View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={{ color: colors.text, fontSize: 19, fontWeight: '600' }}>{selectedApp[2]}</Text><Text style={{ color: colors.textMuted, fontSize: 13 }}>Connected</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close integration" onPress={() => setOpen('')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.bgBadge }}><AppIcon name="close" color={colors.text} size={22} /></Pressable>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>{selectedApp[3]}</Text>
        {feedback}
        <Workspace key={`${userId}-${open}`} app={selectedApp} connection={selectedConnection} colors={colors} upgrade={capability => change(selectedApp[0], selectedApp[1], capability)} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Disconnect ${selectedApp[2]}`} accessibilityState={{ disabled: busy }} disabled={busy} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, opacity: busy ? 0.5 : 1 }} onPress={() => Alert.alert(`Disconnect ${selectedApp[2]}?`, 'Your files and emails stay untouched. You can revoke access separately in your provider account.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => change(selectedApp[0], selectedApp[1], undefined, true) }])}>
          <Text style={{ color: colors.errorText, fontSize: 14 }}>Disconnect</Text>
        </Pressable>
      </ScrollView> : null}
    </BottomSheet>
  </View>;
}
