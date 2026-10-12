import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AppIcon from '../components/AppIcon';
import AppSearchBar from '../components/AppSearchBar';
import BottomSheet from '../components/BottomSheet';
import CollectionEmptyState from '../components/CollectionEmptyState';
import { Button, Feedback } from '../workspace/ui';
import { contactStatusLabel } from './outreach-data';

const TABS = [
  { id: 'open', label: 'To email', statuses: ['pending', 'sent', 'sending', 'held'] },
  { id: 'closed', label: 'Finished' },
];

// The Sellers list badge (LeadCard's Badge): blue while in the sequence, green
// for replies, red when something needs attention, grey otherwise.
function Badge({ label, tone, colors }) {
  const blue = colors.isDark ? { bg: '#172554', fg: '#93c5fd' } : { bg: '#dbeafe', fg: '#1e40af' };
  const { bg, fg } = tone === 'due' ? { bg: colors.badgeDueBg, fg: colors.badgeDueText } : tone === 'ok' ? { bg: colors.badgeOkBg, fg: colors.badgeOkText }
    : tone === 'blue' ? blue : { bg: colors.bgBadge, fg: colors.textBadge };
  return <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
    <Text style={{ fontSize: 11, fontWeight: '600', color: fg, lineHeight: 14, includeFontPadding: false }}>{label}</Text>
  </View>;
}
const statusBadge = status => ({ tone: ['held', 'bounced'].includes(status) ? 'due' : status === 'replied' ? 'ok' : ['sent', 'sending'].includes(status) ? 'blue' : undefined });

// Contacts, laid out like the original Sellers list: tab pills, search, and
// cards separated by hairlines. The server returns the first 30 contacts.
export default function OutreachContacts({ colors, outreach, onImport, importing }) {
  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const campaign = outreach.campaign.data;
  const counts = campaign?.counts || {};
  const term = search.trim().toLowerCase();
  // "Finished" holds every status that isn't still in the sequence.
  const isOpen = status => TABS[0].statuses.includes(status);
  const contacts = (campaign?.contacts || []).filter(c => (tab === 'open') === isOpen(c.status))
    .filter(c => `${c.name} ${c.agency} ${c.email}`.toLowerCase().includes(term));
  const tabCount = item => Object.entries(counts).reduce((sum, [status, count]) => sum + ((item.id === 'open') === isOpen(status) ? count : 0), 0);
  async function exclude(contact) {
    setBusy(true); setError(null);
    try { await outreach.run({ action: 'exclude', emails: [contact.email] }); setSelected(null); }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  if (outreach.campaign.isPending || (outreach.campaign.error && !campaign)) return <View style={{ padding: 20 }}><Feedback colors={colors} error={outreach.campaign.error} loading={outreach.campaign.isPending} onRetry={outreach.campaign.refetch} /></View>;
  if (!campaign?.total) return <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 88 }}>
    <CollectionEmptyState kind="sellers" colors={colors} title="Add your first contacts" description="Import a CSV or Excel file with each broker's name, agency and email." actionLabel={importing ? 'Importing…' : 'Import contacts'} onAction={importing ? undefined : onImport} />
  </View>;
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 24, padding: 3 }}>
        {TABS.map(item => {
          const active = tab === item.id;
          return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setTab(item.id)}
            style={{ minWidth: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, backgroundColor: active ? colors.tabActiveBg : 'transparent' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: active ? colors.tabActiveText : colors.textMuted }}>{item.label} {tabCount(item).toLocaleString()}</Text>
          </Pressable>;
        })}
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
      <View style={{ flex: 1 }}><AppSearchBar colors={colors} placeholder="Search contacts" accessibilityLabel="Search contacts" clearLabel="Clear contact search" value={search} onChangeText={setSearch} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={importing ? 'Importing contacts' : 'Import contacts'} accessibilityState={{ disabled: importing || campaign.status === 'active' }} disabled={importing || campaign.status === 'active'} onPress={onImport}
        style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center', opacity: importing || campaign.status === 'active' ? 0.4 : pressed ? 0.6 : 1 })}>
        <AppIcon name={importing ? 'refresh' : 'download'} size={21} color={colors.text} />
      </Pressable>
    </View>
    <FlatList
      data={contacts}
      keyExtractor={item => item.email}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open contact ${item.name}`} onPress={() => setSelected(item)}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textName }}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <AppIcon name="building" size={14} color={colors.textMuted} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: colors.textMuted }}>{item.agency || '-'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Copy email address for ${item.name}`} onPress={async event => { event.stopPropagation(); try { await Clipboard.setStringAsync(item.email); setCopied(item.email); } catch { setCopied(''); } }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <AppIcon name="copy" size={15} color={colors.textMuted} />
          <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.textMuted, fontSize: 13 }}>{item.email}</Text>
          {copied === item.email ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, fontSize: 12 }}>Copied</Text> : null}
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <Badge label={contactStatusLabel(item.status)} {...statusBadge(item.status)} colors={colors} />
          <Badge label={`${item.step}/3 emails`} colors={colors} />
        </View>
      </Pressable>}
      ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, marginVertical: 18, marginHorizontal: -16, backgroundColor: colors.textFainter }} />}
      ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 32 }}>No contacts match your search.</Text>}
      ListFooterComponent={campaign.total > (campaign.contacts?.length || 0) ? <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingTop: 28 }}>Showing the first {(campaign.contacts?.length || 0).toLocaleString()} of {campaign.total.toLocaleString()} contacts</Text> : null}
    />
    <BottomSheet visible={Boolean(selected)} onClose={() => !busy && setSelected(null)} colors={colors}>
      {selected ? <View style={{ padding: 20, paddingTop: 4, gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 21, fontWeight: '700' }}>{selected.name}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 15 }}>{selected.agency}</Text>
        <Text selectable style={{ color: colors.text, fontSize: 15 }}>{selected.email}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}><Badge label={contactStatusLabel(selected.status)} {...statusBadge(selected.status)} colors={colors} /><Badge label={`${selected.step}/3 emails`} colors={colors} /></View>
        {selected.status === 'held' ? <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>This send wasn't confirmed. Check Gmail Sent; it won't be retried automatically.</Text> : null}
        <Feedback colors={colors} error={error} />
        {['pending', 'sent', 'held'].includes(selected.status) ? <Button colors={colors} disabled={busy || campaign.status === 'active'} onPress={() => exclude(selected)}>{busy ? 'Saving…' : 'Exclude from further emails'}</Button> : null}
        {campaign.status === 'active' && ['pending', 'sent', 'held'].includes(selected.status) ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>Pause sending on Home to exclude contacts.</Text> : null}
        <Button colors={colors} disabled={busy} onPress={() => setSelected(null)}>Close</Button>
      </View> : null}
    </BottomSheet>
  </View>;
}
