/* global require */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useQueryClient } from "@tanstack/react-query";
import BottomSheet from "../components/BottomSheet";
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
  const hasSpreadsheets = d.leadSources.length > 0 || d.sourceCounts.legacy > 0;

  function openImport() {
    setError(null);
    setNotice(null);
    setImportMode('choose');
  }

  function chooseFile() {
    // iOS cannot present the document picker over a modal that is dismissing.
    afterDismiss.current = () => importSpreadsheet(true);
    setImportMode(null);
  }

  async function importSpreadsheet(fromFile) {
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
      if (fromFile) {
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
      const existing = !fromFile && d.leadSources.find((source) => source.sheet_url === sheetUrl);
      if (existing && existing.id !== pendingSource.current?.source.id) throw new Error('This sheet is already imported. Open it below to import it again.');
      if (pendingSource.current?.key !== key) {
        if (!d.canAddSource) throw new Error('You have reached your spreadsheet limit.');
        const source = await createLeadSource(userId, { label, sheet_url: fromFile ? '' : sheetUrl, sort_order: d.leadSources.length });
        pendingSource.current = { key, source };
      }
      const source = pendingSource.current.source;
      if (fromFile) await replaceUserLeadsFromRows({ userId, source, rawRows: rows });
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
        {!hasSpreadsheets && !d.loading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 32 }}>
            <EmptySpreadsheets />
            <Text style={{ color: colors.textName, fontSize: 21, fontWeight: '600', textAlign: 'center' }}>Your spreadsheets, here</Text>
            <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 260 }}>Tap + to import a file or Google Sheets link.</Text>
          </View>
        )}
        {d.leadSources.map((source) => (
          <Pressable key={source.id} accessibilityRole="button" accessibilityLabel={`Open ${source.label || source.building_name || 'Spreadsheet'}`} onPress={() => setSelectedId(source.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.65 : 1 })}>
            <View style={{ width: 42, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgBadge }}>
              <Icon name="table" size={21} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.textName, fontSize: 16, fontWeight: '500' }}>{source.label || source.building_name || 'Spreadsheet'}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{d.sourceCounts[source.id] || 0} sellers</Text>
            </View>
            <Icon name="chevron" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
        {d.sourceCounts.legacy > 0 && <Button colors={colors} onPress={() => setSelectedId('legacy')}>Older imports</Button>}
      </ScrollView>
      {!importMode && !selectedId && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import spreadsheet"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={openImport}
          style={({ pressed }) => ({ position: 'absolute', right: 22, bottom: Math.max(insets.bottom, 16) + 18 - insets.bottom, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.btnPrimaryBg, boxShadow: '0 6px 18px rgba(0,0,0,0.16)', opacity: pressed || busy ? 0.7 : 1 })}
        >
          {busy ? <ActivityIndicator color={colors.btnPrimaryText} /> : <Icon name="plus" size={24} color={colors.btnPrimaryText} />}
        </Pressable>
      )}
      <BottomSheet visible={Boolean(importMode)} onClose={() => !busy && setImportMode(null)} onDismiss={finishDismiss} colors={colors}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {importMode === 'url' && <Pressable accessibilityRole="button" accessibilityLabel="Back to import options" disabled={busy} onPress={() => { setError(null); setImportMode('choose'); }} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}><Icon name="back" color={colors.textName} /></Pressable>}
            <Text style={{ color: colors.textName, fontSize: 21, fontWeight: '600', flex: 1 }}>{importMode === 'url' ? 'Import from URL' : 'Import spreadsheet'}</Text>
          </View>
          {importMode === 'url' ? <>
            <Field colors={colors} label="Google Sheets link" placeholder="https://docs.google.com/spreadsheets/…" value={url} onChangeText={setUrl} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="url" autoFocus />
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>Set sharing to “Anyone with the link” (Viewer).</Text>
            <Feedback colors={colors} error={error} />
            <Button colors={colors} primary disabled={busy || !url.trim()} onPress={() => importSpreadsheet(false)}>{busy ? 'Importing…' : 'Import spreadsheet'}</Button>
          </> : <>
            <ImportOption colors={colors} icon="table" title="Import file" detail="Excel or CSV" onPress={chooseFile} />
            <ImportOption colors={colors} icon="table" title="Import from URL" detail="Google Sheets" onPress={() => setImportMode('url')} />
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

function ImportOption({ colors, icon, title, detail, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${detail}`} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ height: 44, width: 44, borderRadius: 13, backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={colors.textName} size={22} /></View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.textName, fontSize: 16, fontWeight: '500' }}>{title}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{detail}</Text>
      </View>
      <Icon name="chevron" color={colors.textMuted} size={18} />
    </Pressable>
  );
}

function EmptySpreadsheets() {
  return (
    <Image
      source={require("../../assets/empty-spreadsheets.png")}
      accessible={false}
      resizeMode="contain"
      style={{ width: 240, height: 240 }}
    />
  );
}
