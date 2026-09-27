import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { integrationStatusOptions } from '../../../src/integration-query';
import { integrationRequest } from './integration-client';
import { Button, Feedback, Field, Icon } from './ui';

export const SHEET_PROVIDERS = {
  google: { name: 'Google Sheets', logo: 'https://www.gstatic.com/images/branding/product/2x/sheets_48dp.png' },
  microsoft: { name: 'Microsoft Excel', logo: 'https://res.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/brand-icons/product/png/excel_48x1.png' },
};
export function SheetProviderIcon({ provider }) { return <Image source={{ uri: SHEET_PROVIDERS[provider].logo }} accessible={false} resizeMode="contain" style={{ width: 28, height: 28 }} />; }

export default function ConnectedSpreadsheetPicker({ userId, provider, colors, busy, onConnect, onImport, initialUrl }) {
  const [file, setFile] = useState(null);
  const [tab, setTab] = useState(null);
  const [folders, setFolders] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [pageToken, setPageToken] = useState('');
  const status = useQuery(integrationStatusOptions(userId, integrationRequest));
  const connection = status.data?.find(item => item.provider === provider && item.feature === 'sheets');
  const capability = !connection?.connected ? undefined : provider === 'google' && !connection.canBrowse ? 'browse' : provider === 'microsoft' && !connection.canReadWorkbook ? 'workbook' : null;
  const ready = connection?.connected && capability === null;
  const folderId = folders.at(-1)?.id;
  const input = file ? { operation: 'tabs', fileId: file.id, ...(file.driveId ? { driveId: file.driveId } : {}) }
    : initialUrl ? { operation: 'resolve', url: initialUrl }
      : { operation: 'browse', ...(folderId ? { folderId } : {}), ...(provider === 'google' ? { query } : {}), ...(pageToken ? { pageToken } : {}) };
  const files = useQuery({ queryKey: ['spreadsheet-import-picker', userId, provider, input], queryFn: ({ signal }) => integrationRequest({ action: 'read', provider, feature: 'sheets', input }, signal, userId), enabled: Boolean(ready), staleTime: 30_000 });
  const muted = { color: colors.textMuted, fontSize: 14, lineHeight: 21 };
  return <View style={{ gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><SheetProviderIcon provider={provider} /><Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{SHEET_PROVIDERS[provider].name}</Text></View>
    {provider === 'microsoft' ? <Text style={muted}>Choose an .xlsx workbook from a Microsoft work or school account. For a personal account, use Import file.</Text> : null}
    <Feedback colors={colors} loading={status.isPending || (ready && files.isPending)} error={status.error || (ready && files.error)} onRetry={() => { void status.refetch(); void files.refetch(); }} />
    {connection && !ready ? <><Text style={muted}>{!connection.connected ? 'Connect your account to choose a spreadsheet.' : capability === 'browse' ? 'Allow file-name access to choose your Google Sheets.' : 'Microsoft requires file read/write permission for its workbook API. Repeat AI only reads the workbook.'}</Text><Button colors={colors} disabled={busy || !connection.configured} onPress={() => onConnect(capability)}>{connection.configured ? connection.connected ? 'Allow access' : 'Connect account' : 'Connection setup needed'}</Button></> : null}
    {ready && !files.isError ? <>
      {file || folders.length ? <Button colors={colors} disabled={busy} onPress={() => { if (tab) setTab(null); else if (file) setFile(null); else setFolders(previous => previous.slice(0, -1)); setPageToken(''); }}>Back</Button> : null}
      {!file && !initialUrl && provider === 'google' ? <><Field colors={colors} label="Search" accessibilityLabel="Search Google Sheets" value={search} onChangeText={setSearch} maxLength={100} returnKeyType="search" onSubmitEditing={() => { setQuery(search); setPageToken(''); }} /><Button colors={colors} disabled={busy} onPress={() => { setQuery(search); setPageToken(''); }}>Search</Button></> : null}
      {file ? <Text style={muted}>{file.name}</Text> : folders.length ? <Text style={muted}>{folders.at(-1).name}</Text> : null}
      {tab ? <><Text style={{ color: colors.text, fontSize: 16 }}>{tab}</Text><Text style={muted}>Import this worksheet’s sellers into a new spreadsheet in Repeat AI.</Text><Button colors={colors} primary disabled={busy} onPress={() => onImport({ provider, file, sheetName: tab })}>{busy ? 'Importing…' : 'Import worksheet'}</Button></> : (files.data?.items || []).map(item => <Pressable key={item.id || item.name} accessibilityRole="button" disabled={busy || files.isFetching} onPress={() => { setPageToken(''); if (file) setTab(item.name); else if (item.folder) setFolders(previous => [...previous, item]); else setFile(item); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, borderBottomWidth: 0.5, borderBottomColor: colors.border }}><Text style={{ color: colors.text, fontSize: 15, flex: 1 }}>{item.name}{item.folder ? ' /' : ''}</Text><Icon name="chevron" color={colors.textMuted} size={16} /></Pressable>)}
      {files.data?.kind === 'resolved-file' ? <Button colors={colors} disabled={busy} onPress={() => setFile(files.data.file)}>{files.data.file.name}</Button> : null}
      {files.data?.items?.length === 0 ? <Text style={muted}>No spreadsheets found here.</Text> : null}
      {!file && files.data?.nextPageToken ? <Button colors={colors} disabled={busy || files.isFetching} onPress={() => setPageToken(files.data.nextPageToken)}>Next files</Button> : null}
      {!file && pageToken ? <Button colors={colors} disabled={busy} onPress={() => setPageToken('')}>First files</Button> : null}
    </> : null}
  </View>;
}
