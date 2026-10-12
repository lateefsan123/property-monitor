import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import BottomSheet from '../components/BottomSheet';
import { Button, Feedback } from '../workspace/ui';
import { OUTREACH_SENDER } from '../../../shared/email-outreach';

// Home, laid out like the original Home: date and greeting, a metrics card with
// a "View" row, then the campaign and the sending inbox.
export default function OutreachHome({ displayName, colors, outreach, onNavigate }) {
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const campaign = outreach.campaign.data;
  const ready = outreach.campaign.data !== undefined;
  const counts = campaign?.counts || {};
  const active = campaign?.status === 'active';
  const blocked = Boolean(counts.held || counts.sending);
  const metrics = [
    { label: 'Not contacted', value: ready ? (counts.pending || 0).toLocaleString() : '—' },
    { label: 'In sequence', value: ready ? (counts.sent || 0).toLocaleString() : '—' },
    { label: 'Replied', value: ready ? (counts.replied || 0).toLocaleString() : '—' },
  ];
  async function refresh() {
    setRefreshing(true);
    try { await outreach.refresh(); } finally { setRefreshing(false); }
  }
  async function apply(activeNext) {
    setBusy(true); setError(null);
    try { await outreach.run({ action: 'configure', active: activeNext }); setConfirm(null); }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }
  const row = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.borderLight };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 26, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <Text style={{ color: colors.textName, fontSize: 25, fontWeight: '600', letterSpacing: -0.6 }}>Hello{displayName ? `, ${displayName}` : ''}</Text>
    </View>
    <Feedback colors={colors} error={outreach.campaign.error} loading={!ready && outreach.campaign.isPending} onRetry={refresh} />
    {campaign?.issue ? <View style={{ gap: 6, padding: 16, borderRadius: 14, backgroundColor: colors.errorBg }}>
      <Text style={{ color: colors.errorText, fontSize: 14, fontWeight: '600' }}>Campaign paused for review</Text>
      <Text style={{ color: colors.errorText, fontSize: 14, lineHeight: 20 }}>{campaign.issue}</Text>
    </View> : null}
    <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', paddingVertical: 22 }}>
        {metrics.map((metric, index) => <Pressable key={metric.label} accessibilityRole="button" accessibilityLabel={`${metric.label}: ${metric.value}`} onPress={() => onNavigate('contacts')}
          style={{ flex: 1, gap: 8, paddingHorizontal: 14, borderLeftWidth: index ? 1 : 0, borderLeftColor: colors.borderLight }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{metric.label}</Text>
          <Text selectable style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.8, fontVariant: ['tabular-nums'], color: colors.textName }}>{metric.value}</Text>
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" onPress={() => onNavigate('contacts')} style={({ pressed }) => ({ ...row, opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: colors.textName, fontSize: 14, fontWeight: '500' }}>{campaign?.total ? `View all ${campaign.total.toLocaleString()} contacts` : 'Import your contacts to get started'}</Text>
        <AppIcon name="chevron" color={colors.textMuted} size={17} />
      </Pressable>
    </View>
    <View style={{ backgroundColor: colors.bgCard, borderRadius: 18 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 6 }}>
          <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 15, fontWeight: '600', paddingBottom: 6 }}>Email sequence</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? colors.badgeOkText : colors.textFaint }} />
            <Text style={{ color: colors.textName, fontSize: 15, fontWeight: '600' }}>{!ready ? 'Loading…' : active ? 'Sending' : 'Paused'}</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{active ? 'Emails go out on weekdays, 9am–5pm Dubai time. Replies stop the sequence.' : 'Nothing is sent until you start. Review the emails and schedule first.'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10 }}>
            {active ? <Button colors={colors} disabled={busy} onPress={() => apply(false)} style={{ flex: 1 }}>Pause sending</Button>
              : <Button colors={colors} primary disabled={busy || !campaign?.total || blocked} onPress={() => setConfirm('start')} style={{ flex: 1 }}>Review and start</Button>}
          </View>
          {blocked && !active ? <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>Some sends need review in Contacts before you can start.</Text> : null}
        </View>
        {[['templates', 'mail', 'Emails', '3 emails'], ['schedule', 'calendar', 'Schedule', 'Weekdays · 9am–5pm']].map(([id, icon, label, value]) =>
          <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} onPress={() => onNavigate(id)} style={({ pressed }) => ({ ...row, gap: 12, opacity: pressed ? 0.6 : 1 })}>
            <AppIcon name={icon} size={18} color={colors.textMuted} />
            <Text style={{ flex: 1, color: colors.textName, fontSize: 14, fontWeight: '500' }}>{label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{value}</Text>
            <AppIcon name="chevron" color={colors.textMuted} size={17} />
          </Pressable>)}
    </View>
    <View style={{ backgroundColor: colors.bgCard, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, gap: 6 }}>
      <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 15, fontWeight: '600' }}>Sending inbox</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${OUTREACH_SENDER}, ${outreach.gmailConnected ? 'connected' : 'not connected'}`} onPress={() => onNavigate('settings')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, opacity: pressed ? 0.6 : 1 })}>
        <AppIcon name="mail" size={20} color={colors.text} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={{ color: colors.textName, fontSize: 15, fontWeight: '500' }}>{OUTREACH_SENDER}</Text>
          <Text style={{ color: outreach.gmailConnected ? colors.badgeOkText : colors.textMuted, fontSize: 13 }}>{outreach.connections.data === undefined ? 'Checking…' : outreach.gmailConnected ? 'Connected' : 'Not connected'}</Text>
        </View>
        <AppIcon name="chevron" color={colors.textMuted} size={17} />
      </Pressable>
    </View>
    <BottomSheet visible={confirm === 'start'} onClose={() => !busy && setConfirm(null)} colors={colors}>
      <View style={{ padding: 20, gap: 12 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 21, fontWeight: '700' }}>Start this email sequence?</Text>
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>Three emails go out from {OUTREACH_SENDER}, starting at 5 a day and rising to 30, weekdays 9am–5pm Dubai time. Replies stop the sequence. A send already in progress may finish after you pause.</Text>
        <Feedback colors={colors} error={error} />
        <Button colors={colors} primary disabled={busy} onPress={() => apply(true)}>{busy ? 'Starting…' : 'Start'}</Button>
        <Button colors={colors} disabled={busy} onPress={() => setConfirm(null)}>Cancel</Button>
      </View>
    </BottomSheet>
  </ScrollView>;
}
