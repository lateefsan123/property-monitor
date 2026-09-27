import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useQueryClient } from "@tanstack/react-query";
import BottomSheet from "../components/BottomSheet";
import SpreadsheetLibrary from "./spreadsheet-library";
import ConnectedSpreadsheetPicker, { SheetProviderIcon } from './connected-spreadsheet-picker';
import { integrationRequest } from './integration-client';
import { connectIntegration } from './integration-connect';
import { integrationStatusOptions } from '../../../src/integration-query';
import { useSellerSignalPage, leadSourcesQueryKey } from "../features/seller-signal/useSellerSignalPage";
import { leadsQueryKey } from "../features/seller-signal/useHomeLeadSummary";
import { createLeadSource, replaceUserLeadsFromRows, replaceUserLeadsFromSheet } from "../features/seller-signal/services";
import { parseSpreadsheetFile } from "../features/seller-signal/file-import";
import { SourceRow, LegacySourceCard } from "../screens/SpreadsheetScreen";
import { Button, Feedback, Field, Icon } from "./ui";

export default function WorkspaceSpreadsheets({ userId, colors, request, onNavigate }) {
  const d = useSellerSignalPage(userId, { enrichVisible: false });
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [importMode, setImportMode] = useState(null);
  const [excelUrl, setExcelUrl] = useState('');
  const insets = useSafeAreaInsets();
  const importing = useRef(false);
  const afterDismiss = useRef(null);
  const finishDismiss = useCallback(() => {
    const action = afterDismiss.current;
    afterDismiss.current = null;
    action?.();
  }, []);
  // Reuse an unfinished source when retrying, so a failed request cannot create duplicates.
  const pendingSource = useRef(null);
  useEffect(() => {
    if (request?.sourceId) setSelectedId(request.sourceId);
    if (request?.add) setImportMode('choose');
  }, [request]);
  useEffect(() => {
    // Android does not emit Modal.onDismiss. Run after the hidden modal commits.
    if (!importMode && Platform.OS !== 'ios') finishDismiss();
  }, [importMode, finishDismiss]);
  const selected = d.leadSources.find((source) => String(source.id) === String(selectedId));

  function openImport() {
    setExcelUrl('');
    setError(null);
    setNotice(null);
    setImportMode('choose');
  }

  function chooseFile() {
    // iOS cannot present the document picker over a modal that is dismissing.
    afterDismiss.current = () => importSpreadsheet(true);
    setImportMode(null);
  }

  function connectProvider(provider, capability) {
    if (busy) return;
    setBusy(true);
    afterDismiss.current = async () => {
      try { await connectIntegration(provider, 'sheets', capability); await client.invalidateQueries({ queryKey: integrationStatusOptions(userId, integrationRequest).queryKey }); }
      catch (failure) { setError(failure); }
      finally { setBusy(false); setImportMode(provider); }
    };
    setImportMode(null);
  }

  async function importSpreadsheet(fromFile, connected) {
    if (importing.current) return;
    importing.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      let rows;
      let label;
      let key;
      const sheetUrl = url.trim();
      if (connected) {
        const { provider, file, sheetName } = connected;
        const result = await integrationRequest({ action: 'read', provider, feature: 'sheets', input: { operation: 'rows', fileId: file.id, ...(file.driveId ? { driveId: file.driveId } : {}), sheetName } }, undefined, userId);
        if (result.kind !== 'sheet-import' || !Array.isArray(result.rows)) throw new Error('Could not read this worksheet. Please retry.');
        rows = result.rows; label = `${file.name} · ${sheetName}`; key = `${provider}:${file.driveId || ''}:${file.id}:${sheetName}`;
      } else if (fromFile) {
        const picked = await DocumentPicker.getDocumentAsync({
          type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (picked.canceled) return;
        const file = picked.assets[0];
        if (file.size > 10 * 1024 * 1024) throw new Error('Choose a spreadsheet smaller than 10 MB.');
        const base64 = file.base64 || await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        rows = parseSpreadsheetFile(base64, file.name);
        label = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
        key = `file:${file.name}:${file.size}`;
      } else {
        if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(sheetUrl)) throw new Error('Paste a Google Sheets sharing link.');
        label = `Spreadsheet ${d.leadSources.length + 1}`;
        key = sheetUrl;
      }
      const existing = !fromFile && !connected && d.leadSources.find((source) => source.sheet_url === sheetUrl);
      if (existing && existing.id !== pendingSource.current?.source.id) throw new Error('This sheet is already imported. Open it below to import it again.');
      if (pendingSource.current?.key !== key) {
        if (!d.canAddSource) throw new Error('You have reached your spreadsheet limit.');
        const source = await createLeadSource(userId, { label, sheet_url: fromFile || connected ? '' : sheetUrl, sort_order: d.leadSources.length });
        pendingSource.current = { key, source };
      }
      const source = pendingSource.current.source;
      if (fromFile || connected) await replaceUserLeadsFromRows({ userId, source, rawRows: rows });
      else await replaceUserLeadsFromSheet({ userId, source, rawSheetUrl: sheetUrl });
      pendingSource.current = null;
      setUrl('');
      setImportMode(null);
      setNotice('Spreadsheet imported. Your sellers are ready.');
    } catch (failure) {
      setError(failure);
    } finally {
      await Promise.all([
        client.invalidateQueries({ queryKey: leadSourcesQueryKey(userId) }),
        client.invalidateQueries({ queryKey: leadsQueryKey(userId) }),
      ]);
      importing.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12, paddingBottom: Math.max(insets.bottom, 16) + 100 }}>
        <Feedback colors={colors} loading={d.loading || (busy && !importMode)} error={!importMode ? error || d.error : d.error} />
        {notice && <Text accessibilityRole="alert" style={{ color: colors.badgeOkText }}>{notice}</Text>}
        <SpreadsheetLibrary sources={d.leadSources} counts={d.sourceCounts} colors={colors} loading={d.loading} error={d.error} busy={busy} onImport={openImport} onOpen={setSelectedId} />
      </ScrollView>
      <BottomSheet visible={Boolean(importMode)} onClose={() => !busy && setImportMode(null)} onDismiss={finishDismiss} colors={colors}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {importMode !== 'choose' && <Pressable accessibilityRole="button" accessibilityLabel="Back to import options" disabled={busy} onPress={() => { setError(null); setImportMode('choose'); }} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}><Icon name="back" color={colors.textName} /></Pressable>}
            <Text style={{ color: colors.textName, fontSize: 21, fontWeight: '600', flex: 1 }}>{importMode === 'url' ? 'Import from URL' : 'Import spreadsheet'}</Text>
          </View>
          {importMode === 'url' ? <>
            <Field colors={colors} label="Spreadsheet link" placeholder="Google Sheets, OneDrive or SharePoint link" value={url} onChangeText={setUrl} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="url" autoFocus />
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>Google Sheets links need Viewer access. Excel links use your connected Microsoft account.</Text>
            <Feedback colors={colors} error={error} />
            <Button colors={colors} primary disabled={busy || !url.trim()} onPress={() => {
              if (/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(url.trim())) void importSpreadsheet(false);
              else {
                try {
                  const link = new URL(url.trim());
                  if (link.protocol !== 'https:' || link.username || link.password || link.port || !(link.hostname === '1drv.ms' || link.hostname === 'onedrive.live.com' || link.hostname.endsWith('.sharepoint.com'))) throw new Error();
                  setExcelUrl(link.href); setError(null); setImportMode('microsoft');
                } catch { setError(new Error('Paste a Google Sheets, OneDrive or SharePoint sharing link.')); }
              }
            }}>{busy ? 'Importing…' : 'Continue'}</Button>
          </> : importMode === 'google' || importMode === 'microsoft' ? <>
            <Feedback colors={colors} error={error} />
            <ConnectedSpreadsheetPicker key={`${userId}-${importMode}`} userId={userId} provider={importMode} colors={colors} busy={busy} initialUrl={importMode === 'microsoft' ? excelUrl : ''} onConnect={capability => connectProvider(importMode, capability)} onImport={selection => importSpreadsheet(false, selection)} />
          </> : <>
            <ImportOption colors={colors} icon="table" title="Import file" detail="Excel or CSV" onPress={chooseFile} />
            <ImportOption colors={colors} icon="link" title="Import from URL" detail="Google Sheets or Excel link" onPress={() => setImportMode('url')} />
            <ImportOption colors={colors} provider="google" title="Google Sheets" detail="Choose from your account" onPress={() => setImportMode('google')} />
            <ImportOption colors={colors} provider="microsoft" title="Microsoft Excel" detail="Choose from OneDrive" onPress={() => { setExcelUrl(''); setImportMode('microsoft'); }} />
          </>}
        </ScrollView>
      </BottomSheet>
      <BottomSheet visible={Boolean(selected || selectedId === 'legacy')} onClose={() => setSelectedId(null)} colors={colors}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Feedback colors={colors} error={d.error} />
          {selected ? <>
            <SourceRow source={selected} colors={colors} count={d.sourceCounts[selected.id] || 0} clearing={d.clearingSourceId === selected.id} importing={d.importingSourceId === selected.id} saving={d.savingSourceId === selected.id} onUpdateField={d.actions.updateLeadSourceField} onSave={d.actions.persistLeadSource} onImport={d.actions.importFromSheet} onClear={async (id) => { if (await d.actions.clearSource(id)) setSelectedId(null); }} isLast />
            <Button colors={colors} primary onPress={() => { setSelectedId(null); onNavigate('sellers', { sourceId: selected.id }); }}>View sellers</Button>
          </> : <LegacySourceCard colors={colors} count={d.sourceCounts.legacy || 0} importing={d.importingLegacy} legacySheetUrl={d.legacySheetUrl} onImport={d.actions.importLegacySheet} onUpdateUrl={d.actions.updateLegacySheetUrl} />}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function ImportOption({ colors, icon, provider, title, detail, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${detail}`} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ height: 44, width: 44, borderRadius: 13, backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}>{provider ? <SheetProviderIcon provider={provider} /> : <Icon name={icon} color={colors.textName} size={22} />}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.textName, fontSize: 16, fontWeight: '500' }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{detail}</Text>
      </View>
      <Icon name="chevron" color={colors.textMuted} size={18} />
    </Pressable>
  );
}
