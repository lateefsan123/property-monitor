import AddButton from '../components/AddButton';
import AppSearchBar from "../components/AppSearchBar";
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import artwork from '../../assets/spreadsheets-empty.png';
import { Button, Icon } from './ui';

export default function SpreadsheetLibrary({ sources, counts, colors, loading, error, busy, onImport, onOpen }) {
  const [search, setSearch] = useState('');
  const hasSheets = sources.length > 0 || counts.legacy > 0;
  const query = search.trim().toLowerCase();
  const label = source => source.label || source.building_name || 'Spreadsheet';
  const visible = sources.filter(source => label(source).toLowerCase().includes(query));
  const showLegacy = counts.legacy > 0 && 'older imports'.includes(query);
  if (!hasSheets) return !loading && !error ? <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, paddingTop: 28, alignItems: 'center', gap: 20 }}>
    <Image source={artwork} accessible={false} resizeMode="contain" style={{ width: '100%', height: 180 }} />
    <View style={{ gap: 8, alignItems: 'center' }}><Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>Bring your sellers together</Text><Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>Import an Excel or CSV file, or connect a Google Sheets link.</Text></View>
    <Button colors={colors} primary disabled={busy} onPress={onImport} style={{ width: '100%', minHeight: 48, borderRadius: 12 }}>{busy ? 'Importing…' : 'Import spreadsheet'}</Button>
  </View> : null;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <AppSearchBar colors={colors} style={{ flex: 1 }} accessibilityLabel="Search spreadsheets" placeholder="Search spreadsheets" clearLabel="Clear spreadsheet search" value={search} onChangeText={setSearch} />
      <AddButton colors={colors} accessibilityLabel="Import spreadsheet" disabled={busy} onPress={onImport} />
    </View>
    <View>
      {visible.map(source => <Pressable key={source.id} accessibilityRole="button" accessibilityLabel={`Open ${label(source)}`} onPress={() => onOpen(source.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border, opacity: pressed ? 0.65 : 1 })}>
        <View style={{ width: 42, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard }}><Icon name="table" size={21} color={colors.textMuted} /></View>
        <View style={{ flex: 1, gap: 5 }}><Text numberOfLines={2} style={{ color: colors.textName, fontSize: 16, fontWeight: '500' }}>{label(source)}</Text><Text style={{ color: colors.textMuted, fontSize: 13 }}>{counts[source.id] || 0} sellers</Text></View>
        <Icon name="chevron" size={17} color={colors.textFaint} />
      </Pressable>)}
      {showLegacy ? <Button colors={colors} onPress={() => onOpen('legacy')} style={{ marginTop: 12 }}>Older imports</Button> : null}
      {!visible.length && !showLegacy ? <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 32 }}>No matching spreadsheets.</Text> : null}
    </View>
  </View>;
}
